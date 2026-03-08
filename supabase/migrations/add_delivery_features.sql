-- Migration: add_delivery_features
-- Adds delivery_schedules, delivery_jobs tables, Stripe columns on drivers,
-- fixes the orders status check constraint, and adds accept_delivery_job() RPC.

-- 1. Fix orders status constraint to include 'pending_payment'
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'pending_payment', 'pending', 'paid', 'processing', 'ready',
    'out_for_delivery', 'completed', 'cancelled', 'refunded'
  ));

-- 2. Add Stripe Connect columns to drivers
alter table public.drivers
  add column if not exists stripe_account_id      text,
  add column if not exists stripe_connect_enabled boolean not null default false;

-- 3. delivery_schedules table
create table if not exists public.delivery_schedules (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references public.farms(id) on delete cascade,
  day_of_week int  not null check (day_of_week between 0 and 6),
  time_window text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.delivery_schedules enable row level security;

create policy "Active schedules publicly readable"
  on public.delivery_schedules for select
  using (is_active = true or public.i_own_farm(farm_id) or public.my_role() = 'admin');

create policy "Farmers manage own schedules"
  on public.delivery_schedules for all
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

-- 4. delivery_jobs table
create table if not exists public.delivery_jobs (
  id          uuid          primary key default gen_random_uuid(),
  delivery_id uuid          not null references public.deliveries(id) on delete cascade,
  farm_id     uuid          not null references public.farms(id) on delete cascade,
  driver_fee  numeric(10,2) not null default 0,
  status      text          not null default 'open'
              check (status in ('open', 'accepted', 'cancelled', 'completed')),
  driver_id   uuid          references public.drivers(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz   not null default now()
);

alter table public.delivery_jobs enable row level security;

create policy "Farm owners can manage delivery jobs"
  on public.delivery_jobs for all
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

create policy "Approved drivers can read open jobs"
  on public.delivery_jobs for select
  using (
    status = 'open'
    and exists (
      select 1 from public.drivers d
      where d.profile_id = auth.uid()
        and d.is_active = true
        and d.background_check_status = 'approved'
    )
  );

create policy "Drivers can update accepted jobs"
  on public.delivery_jobs for update
  using (
    exists (
      select 1 from public.drivers d
      where d.profile_id = auth.uid() and d.id = driver_id
    )
    or public.i_own_farm(farm_id)
    or public.my_role() = 'admin'
  );

-- 5. Indexes
create index if not exists delivery_schedules_farm_id_idx on public.delivery_schedules (farm_id);
create index if not exists delivery_jobs_farm_id_idx      on public.delivery_jobs (farm_id);
create index if not exists delivery_jobs_status_idx       on public.delivery_jobs (status);
create index if not exists delivery_jobs_driver_id_idx    on public.delivery_jobs (driver_id);

-- 6. accept_delivery_job RPC
create or replace function public.accept_delivery_job(p_job_id uuid, p_driver_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.delivery_jobs
  set status = 'accepted', driver_id = p_driver_id, accepted_at = now()
  where id = p_job_id and status = 'open';

  if not found then
    raise exception 'job_already_taken';
  end if;

  update public.deliveries
  set driver_id = p_driver_id, delivery_status = 'assigned'
  where id = (select delivery_id from public.delivery_jobs where id = p_job_id);
end;
$$;
