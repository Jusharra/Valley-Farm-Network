-- Support tickets submitted via the Farmer Help Center

create table public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  name         text not null,
  email        text not null,
  subject      text not null,
  message      text not null,
  status       text not null default 'open'
               check (status in ('open', 'in_progress', 'resolved')),
  admin_notes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

-- Anyone (including guests using the anon key) can submit a ticket
create policy "Anyone can submit a support ticket"
  on public.support_tickets for insert
  with check (true);

-- Users can view their own tickets
create policy "Users view own tickets"
  on public.support_tickets for select
  using (user_id = auth.uid() or public.my_role() = 'admin');

-- Admins can do everything
create policy "Admins manage support tickets"
  on public.support_tickets for all
  using (public.my_role() = 'admin');

create index support_tickets_status_idx    on public.support_tickets(status);
create index support_tickets_created_at_idx on public.support_tickets(created_at desc);
