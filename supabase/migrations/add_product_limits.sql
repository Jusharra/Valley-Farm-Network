-- Migration: add_product_limits
-- Adds platform_plan_slug to farms, corrects max_products values,
-- adds sync_farm_plan() RPC and check_product_limit() trigger.

-- 1. Add platform_plan_slug column to farms
alter table public.farms
  add column if not exists platform_plan_slug text;

-- 2. Correct max_products to match current plan tiers
update public.farm_plans set max_products = 20 where slug = 'seed';
update public.farm_plans set max_products = 40 where slug = 'growth';
update public.farm_plans set max_products = 60 where slug = 'pro';

-- 2b. Backfill platform_plan_slug for farms that already have active subscriptions
--     (picks the most recent active/trialing subscription per farm)
update public.farms f
set platform_plan_slug = fp.slug
from (
  select distinct on (farm_id) farm_id, plan_id
  from public.farm_platform_subscriptions
  where status in ('active', 'trialing')
  order by farm_id, created_at desc
) latest_sub
join public.farm_plans fp on fp.id = latest_sub.plan_id
where f.id = latest_sub.farm_id
  and f.platform_plan_slug is null;

-- 3. Atomic plan sync: updates farms.platform_plan_slug and deactivates
--    excess products (newest first) when plan changes or is cancelled.
--    Called by the Stripe webhook after every subscription event.
create or replace function public.sync_farm_plan(p_farm_id uuid, p_plan_slug text)
returns void language plpgsql security definer as $$
declare
  v_max     integer;
  v_active  integer;
  v_excess  integer;
begin
  update public.farms set platform_plan_slug = p_plan_slug where id = p_farm_id;

  if p_plan_slug is null then
    -- Cancelled / no plan — deactivate all products
    update public.products set is_active = false
    where farm_id = p_farm_id and is_active = true;
    return;
  end if;

  select max_products into v_max
  from public.farm_plans
  where slug = p_plan_slug and is_active = true;

  if v_max is null then return; end if; -- unlimited plan

  select count(*) into v_active
  from public.products
  where farm_id = p_farm_id and is_active = true;

  v_excess := v_active - v_max;

  if v_excess > 0 then
    -- Deactivate newest listings first (keeps established products active)
    update public.products set is_active = false
    where id in (
      select id from public.products
      where farm_id = p_farm_id and is_active = true
      order by created_at desc
      limit v_excess
    );
  end if;
end;
$$;

-- 4. Trigger function: blocks INSERT on products when limit is reached
--    or when the farm has no active subscription.
create or replace function public.check_product_limit()
returns trigger language plpgsql security definer as $$
declare
  v_slug  text;
  v_max   integer;
  v_count integer;
begin
  select platform_plan_slug into v_slug
  from public.farms where id = new.farm_id;

  if v_slug is null then
    raise exception 'no_subscription';
  end if;

  select max_products into v_max
  from public.farm_plans
  where slug = v_slug and is_active = true;

  if v_max is null then return new; end if; -- unlimited

  select count(*) into v_count
  from public.products
  where farm_id = new.farm_id and is_active = true;

  if v_count >= v_max then
    raise exception 'product_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_product_limit on public.products;

create trigger enforce_product_limit
  before insert on public.products
  for each row execute function public.check_product_limit();
