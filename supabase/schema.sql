-- ============================================================
-- Valley Farm Network — Supabase Schema v1
-- ============================================================
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Tables are created in dependency order.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- HELPER — updated_at trigger
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- IDENTITY LAYER
-- ============================================================

create table public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        unique not null,
  full_name     text,
  phone         text,
  avatar_url    text,
  role          text        not null default 'customer'
                            check (role in ('admin', 'farmer', 'customer', 'driver')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- PLATFORM LAYER — farmer plans
-- ============================================================

create table public.farm_plans (
  id                                  uuid        primary key default gen_random_uuid(),
  name                                text        not null,
  slug                                text        unique not null,
  description                         text,
  plan_type                           text        not null default 'monthly'
                                                  check (plan_type in ('one_time', 'monthly')),
  price                               numeric(10,2) not null,
  max_products                        integer,    -- null = unlimited
  allows_subscriptions                boolean     not null default false,
  allows_delivery_zone_management     boolean     not null default false,
  allows_featured_listing             boolean     not null default false,
  stripe_price_id                     text,
  is_active                           boolean     not null default true,
  sort_order                          integer     not null default 0,
  created_at                          timestamptz not null default now()
);


-- ============================================================
-- BUSINESS LAYER — farms
-- ============================================================

create table public.farms (
  id               uuid        primary key default gen_random_uuid(),
  owner_id         uuid        not null references public.profiles(id) on delete cascade,
  farm_name        text        not null,
  slug             text        unique not null,
  tagline          text,
  description      text,
  story            text,
  phone            text,
  email            text,
  website_url      text,
  logo_url         text,
  banner_url       text,
  is_active              boolean     not null default true,
  is_verified            boolean     not null default false,
  is_featured            boolean     not null default false,
  offers_delivery        boolean     not null default false,
  offers_pickup          boolean     not null default true,
  delivery_radius_miles  integer     check (delivery_radius_miles in (5, 10, 25, 50)),
  -- Stripe Connect
  stripe_account_id      text        unique,
  charges_enabled        boolean     not null default false,
  details_submitted      boolean     not null default false,
  -- Platform subscription (denormalized for fast reads, kept in sync by webhook)
  platform_plan_slug     text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger set_farms_updated_at
  before update on public.farms
  for each row execute function public.set_updated_at();

-- Prevent non-admins from toggling is_featured
create or replace function public.guard_is_featured()
returns trigger as $$
begin
  if new.is_featured <> old.is_featured and public.my_role() <> 'admin' then
    raise exception 'Only admins can change is_featured';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_is_featured_admin_only
  before update on public.farms
  for each row execute function public.guard_is_featured();

-- --

create table public.farm_addresses (
  id               uuid        primary key default gen_random_uuid(),
  farm_id          uuid        not null references public.farms(id) on delete cascade,
  address_line_1   text,
  address_line_2   text,
  city             text,
  state            text        default 'CA',
  postal_code      text,
  country          text        default 'USA',
  latitude         numeric(9,6),
  longitude        numeric(9,6),
  is_primary       boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- --

-- Tracks which plan a farm is paying the platform for
create table public.farm_platform_subscriptions (
  id                       uuid        primary key default gen_random_uuid(),
  farm_id                  uuid        not null references public.farms(id) on delete cascade,
  plan_id                  uuid        not null references public.farm_plans(id),
  status                   text        not null default 'active'
                                       check (status in ('active', 'past_due', 'cancelled', 'trialing')),
  starts_at                timestamptz not null default now(),
  ends_at                  timestamptz,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  stripe_customer_id       text,
  stripe_subscription_id   text        unique,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger set_farm_platform_subscriptions_updated_at
  before update on public.farm_platform_subscriptions
  for each row execute function public.set_updated_at();


-- ============================================================
-- STOREFRONT LAYER
-- ============================================================

create table public.categories (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null unique,
  slug        text    not null unique,
  description text,
  icon_name   text,
  color_hex   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- --

create table public.products (
  id                  uuid          primary key default gen_random_uuid(),
  farm_id             uuid          not null references public.farms(id) on delete cascade,
  category_id         uuid          references public.categories(id) on delete set null,
  name                text          not null,
  slug                text          not null,
  description         text,
  short_description   text,
  product_type        text          not null
                                    check (product_type in ('one_time', 'subscription', 'both')),
  unit_name           text,         -- dozen, bunch, lb, box, tray
  price               numeric(10,2) not null,
  compare_at_price    numeric(10,2),
  inventory_count     integer,
  is_active           boolean       not null default true,
  is_featured         boolean       not null default false,
  image_url           text,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  unique (farm_id, slug)
);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- --

create table public.product_images (
  id          uuid    primary key default gen_random_uuid(),
  product_id  uuid    not null references public.products(id) on delete cascade,
  image_url   text    not null,
  alt_text    text,
  sort_order  integer not null default 0
);


-- ============================================================
-- SUBSCRIPTION COMMERCE LAYER
-- ============================================================

-- Farmer-defined subscription offerings (egg box, produce box, etc.)
create table public.subscription_plans (
  id                uuid          primary key default gen_random_uuid(),
  farm_id           uuid          not null references public.farms(id) on delete cascade,
  product_id        uuid          references public.products(id) on delete set null,
  name              text          not null,
  description       text,
  price             numeric(10,2) not null,
  billing_interval  text          not null
                                  check (billing_interval in ('weekly', 'biweekly', 'monthly')),
  fulfillment_type  text          not null
                                  check (fulfillment_type in ('pickup', 'delivery', 'both')),
  is_active         boolean       not null default true,
  stripe_price_id   text,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create trigger set_subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- --

-- Customer enrollment in a farmer's subscription plan
create table public.customer_subscriptions (
  id                      uuid        primary key default gen_random_uuid(),
  customer_id             uuid        not null references public.profiles(id) on delete cascade,
  farm_id                 uuid        not null references public.farms(id) on delete cascade,
  subscription_plan_id    uuid        not null references public.subscription_plans(id) on delete cascade,
  status                  text        not null default 'active'
                                      check (status in ('active', 'paused', 'cancelled', 'past_due')),
  start_date              date        not null default current_date,
  next_billing_date       date,
  stripe_subscription_id  text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger set_customer_subscriptions_updated_at
  before update on public.customer_subscriptions
  for each row execute function public.set_updated_at();


-- ============================================================
-- ORDERS LAYER
-- ============================================================

create table public.orders (
  id                        uuid          primary key default gen_random_uuid(),
  customer_id               uuid          references public.profiles(id) on delete set null,
  farm_id                   uuid          not null references public.farms(id) on delete cascade,
  order_number              text          unique not null,
  order_type                text          not null check (order_type in ('one_time', 'subscription')),
  status                    text          not null default 'pending'
                                          check (status in (
                                            'pending', 'paid', 'processing', 'ready',
                                            'out_for_delivery', 'completed', 'cancelled', 'refunded'
                                          )),
  fulfillment_method        text          not null check (fulfillment_method in ('pickup', 'delivery')),
  subtotal                  numeric(10,2) not null default 0,
  delivery_fee              numeric(10,2) not null default 0,
  tax_amount                numeric(10,2) not null default 0,
  platform_fee              numeric(10,2) not null default 0,
  total_amount              numeric(10,2) not null default 0,
  stripe_payment_intent_id  text,
  notes                     text,
  created_at                timestamptz   not null default now(),
  updated_at                timestamptz   not null default now()
);

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- --

create table public.order_items (
  id                    uuid          primary key default gen_random_uuid(),
  order_id              uuid          not null references public.orders(id) on delete cascade,
  product_id            uuid          references public.products(id) on delete set null,
  subscription_plan_id  uuid          references public.subscription_plans(id) on delete set null,
  product_name          text          not null,  -- snapshot at time of purchase
  quantity              integer       not null default 1,
  unit_price            numeric(10,2) not null,
  line_total            numeric(10,2) not null
);


-- ============================================================
-- LOGISTICS LAYER
-- ============================================================

create table public.delivery_zones (
  id                    uuid          primary key default gen_random_uuid(),
  farm_id               uuid          not null references public.farms(id) on delete cascade,
  zone_name             text          not null,
  city                  text,
  postal_code           text,
  state                 text          default 'CA',
  delivery_fee          numeric(10,2) not null default 0,
  minimum_order_amount  numeric(10,2) not null default 0,
  is_active             boolean       not null default true,
  created_at            timestamptz   not null default now()
);

-- --

create table public.drivers (
  id                        uuid    primary key default gen_random_uuid(),
  profile_id                uuid    not null unique references public.profiles(id) on delete cascade,
  vehicle_type              text,
  license_number            text,
  insurance_verified        boolean not null default false,
  background_check_status   text    not null default 'pending'
                                    check (background_check_status in ('pending', 'approved', 'rejected')),
  is_active                 boolean not null default false,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger set_drivers_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

-- --

create table public.driver_service_areas (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  city        text,
  postal_code text,
  state       text default 'CA'
);

-- --

create table public.deliveries (
  id                      uuid        primary key default gen_random_uuid(),
  order_id                uuid        not null unique references public.orders(id) on delete cascade,
  driver_id               uuid        references public.drivers(id) on delete set null,
  delivery_zone_id        uuid        references public.delivery_zones(id) on delete set null,
  delivery_status         text        not null default 'unassigned'
                                      check (delivery_status in (
                                        'unassigned', 'assigned', 'picked_up', 'delivered', 'failed'
                                      )),
  scheduled_date          date,
  scheduled_window        text,       -- e.g. '9am–12pm'
  delivery_address_line_1 text,
  delivery_address_line_2 text,
  city                    text,
  state                   text        default 'CA',
  postal_code             text,
  delivery_notes          text,
  delivered_at            timestamptz,
  proof_photo_url         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger set_deliveries_updated_at
  before update on public.deliveries
  for each row execute function public.set_updated_at();


-- ============================================================
-- CUSTOMER LAYER
-- ============================================================

create table public.customer_addresses (
  id              uuid    primary key default gen_random_uuid(),
  customer_id     uuid    not null references public.profiles(id) on delete cascade,
  address_line_1  text    not null,
  address_line_2  text,
  city            text    not null,
  state           text    not null,
  postal_code     text    not null,
  country         text    not null default 'USA',
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);


-- ============================================================
-- SUPPORT LAYER
-- ============================================================

create table public.support_tickets (
  id          uuid    primary key default gen_random_uuid(),
  profile_id  uuid    references public.profiles(id) on delete set null,
  farm_id     uuid    references public.farms(id) on delete set null,
  subject     text    not null,
  message     text    not null,
  status      text    not null default 'open'
                      check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();


-- ============================================================
-- INDEXES
-- ============================================================

create index on public.profiles (role);

create index on public.farms (owner_id);
create index on public.farms (slug);
create index on public.farms (is_active);

create index on public.farm_platform_subscriptions (farm_id);
create index on public.farm_platform_subscriptions (status);

create index on public.products (farm_id);
create index on public.products (category_id);
create index on public.products (is_active);
create index on public.products (product_type);

create index on public.subscription_plans (farm_id);

create index on public.customer_subscriptions (customer_id);
create index on public.customer_subscriptions (farm_id);
create index on public.customer_subscriptions (status);

create index on public.orders (customer_id);
create index on public.orders (farm_id);
create index on public.orders (status);
create index on public.orders (order_number);
create index on public.orders (created_at desc);

create index on public.order_items (order_id);

create index on public.delivery_zones (farm_id);

create index on public.deliveries (driver_id);
create index on public.deliveries (delivery_status);
create index on public.deliveries (scheduled_date);

create index on public.driver_service_areas (driver_id);

create index on public.support_tickets (profile_id);
create index on public.support_tickets (status);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: get the calling user's role
create or replace function public.my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- Helper: check if calling user owns a given farm
create or replace function public.i_own_farm(farm_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.farms where id = farm_uuid and owner_id = auth.uid()
  );
$$ language sql stable security definer;

-- Enable RLS on all tables
alter table public.profiles                   enable row level security;
alter table public.farms                      enable row level security;
alter table public.farm_addresses             enable row level security;
alter table public.farm_plans                 enable row level security;
alter table public.farm_platform_subscriptions enable row level security;
alter table public.categories                 enable row level security;
alter table public.products                   enable row level security;
alter table public.product_images             enable row level security;
alter table public.subscription_plans         enable row level security;
alter table public.customer_subscriptions     enable row level security;
alter table public.orders                     enable row level security;
alter table public.order_items                enable row level security;
alter table public.delivery_zones             enable row level security;
alter table public.drivers                    enable row level security;
alter table public.driver_service_areas       enable row level security;
alter table public.deliveries                 enable row level security;
alter table public.customer_addresses         enable row level security;
alter table public.support_tickets            enable row level security;

-- ---- profiles ----
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.my_role() = 'admin');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---- farms ----
create policy "Active farms are publicly readable"
  on public.farms for select
  using (is_active = true or owner_id = auth.uid() or public.my_role() = 'admin');

create policy "Farmers can insert own farms"
  on public.farms for insert
  with check (auth.uid() = owner_id);

create policy "Farmers can update own farms"
  on public.farms for update
  using (auth.uid() = owner_id or public.my_role() = 'admin');

create policy "Admins can delete farms"
  on public.farms for delete
  using (public.my_role() = 'admin');

-- ---- farm_addresses ----
create policy "Farm owner and admin can manage addresses"
  on public.farm_addresses for all
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

-- ---- farm_plans ----
create policy "Farm plans are publicly readable"
  on public.farm_plans for select
  using (is_active = true or public.my_role() = 'admin');

create policy "Only admins can manage farm plans"
  on public.farm_plans for all
  using (public.my_role() = 'admin');

-- ---- farm_platform_subscriptions ----
create policy "Farmers can view own platform subscription"
  on public.farm_platform_subscriptions for select
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

create policy "Only admins can manage platform subscriptions"
  on public.farm_platform_subscriptions for all
  using (public.my_role() = 'admin');

-- ---- categories ----
create policy "Categories are publicly readable"
  on public.categories for select
  using (is_active = true or public.my_role() = 'admin');

create policy "Only admins can manage categories"
  on public.categories for all
  using (public.my_role() = 'admin');

-- ---- products ----
create policy "Active products are publicly readable"
  on public.products for select
  using (is_active = true or public.i_own_farm(farm_id) or public.my_role() = 'admin');

create policy "Farmers can manage own products"
  on public.products for all
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

-- ---- product_images ----
create policy "Product images are publicly readable"
  on public.product_images for select
  using (true);

create policy "Farmers can manage own product images"
  on public.product_images for all
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (public.i_own_farm(p.farm_id) or public.my_role() = 'admin')
    )
  );

-- ---- subscription_plans ----
create policy "Active subscription plans are publicly readable"
  on public.subscription_plans for select
  using (is_active = true or public.i_own_farm(farm_id) or public.my_role() = 'admin');

create policy "Farmers can manage own subscription plans"
  on public.subscription_plans for all
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

-- ---- customer_subscriptions ----
create policy "Customers, farm owners, and admins can view subscriptions"
  on public.customer_subscriptions for select
  using (
    auth.uid() = customer_id
    or public.i_own_farm(farm_id)
    or public.my_role() = 'admin'
  );

create policy "Customers can manage own subscriptions"
  on public.customer_subscriptions for all
  using (auth.uid() = customer_id or public.my_role() = 'admin');

-- ---- orders ----
create policy "Orders visible to customer, farm owner, and admin"
  on public.orders for select
  using (
    auth.uid() = customer_id
    or public.i_own_farm(farm_id)
    or public.my_role() = 'admin'
  );

create policy "Customers can insert orders"
  on public.orders for insert
  with check (auth.uid() = customer_id or customer_id is null);

create policy "Farm owners and admins can update orders"
  on public.orders for update
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

-- ---- order_items ----
create policy "Order items visible with order access"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or public.i_own_farm(o.farm_id)
          or public.my_role() = 'admin'
        )
    )
  );

create policy "Order items insertable with own order"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id = auth.uid() or o.customer_id is null)
    )
  );

-- ---- delivery_zones ----
create policy "Delivery zones are publicly readable"
  on public.delivery_zones for select
  using (is_active = true or public.i_own_farm(farm_id) or public.my_role() = 'admin');

create policy "Farmers can manage own delivery zones"
  on public.delivery_zones for all
  using (public.i_own_farm(farm_id) or public.my_role() = 'admin');

-- ---- drivers ----
create policy "Drivers can view own profile"
  on public.drivers for select
  using (auth.uid() = profile_id or public.my_role() = 'admin');

create policy "Drivers can insert own profile"
  on public.drivers for insert
  with check (auth.uid() = profile_id);

create policy "Drivers can update own profile"
  on public.drivers for update
  using (auth.uid() = profile_id);

create policy "Admins manage all driver records"
  on public.drivers for all
  using (public.my_role() = 'admin');

-- ---- driver_service_areas ----
create policy "Drivers can manage own service areas"
  on public.driver_service_areas for all
  using (
    exists (
      select 1 from public.drivers d
      where d.id = driver_id
        and (d.profile_id = auth.uid() or public.my_role() = 'admin')
    )
  );

-- ---- deliveries ----
create policy "Deliveries visible to relevant parties"
  on public.deliveries for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.i_own_farm(o.farm_id))
    )
    or exists (
      select 1 from public.drivers d
      where d.id = driver_id and d.profile_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

create policy "Farm owners and admins can manage deliveries"
  on public.deliveries for all
  using (
    public.my_role() = 'admin'
    or exists (
      select 1 from public.orders o
      where o.id = order_id and public.i_own_farm(o.farm_id)
    )
  );

create policy "Order creators can insert delivery records"
  on public.deliveries for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or o.customer_id is null)
    )
  );

create policy "Drivers can update own assigned deliveries"
  on public.deliveries for update
  using (
    exists (
      select 1 from public.drivers d
      where d.id = driver_id and d.profile_id = auth.uid()
    )
  );

-- ---- customer_addresses ----
create policy "Customers manage own addresses"
  on public.customer_addresses for all
  using (auth.uid() = customer_id or public.my_role() = 'admin');

-- ---- support_tickets ----
create policy "Users can view own tickets"
  on public.support_tickets for select
  using (auth.uid() = profile_id or public.my_role() = 'admin');

create policy "Users can create tickets"
  on public.support_tickets for insert
  with check (auth.uid() = profile_id);

create policy "Admins can manage all tickets"
  on public.support_tickets for all
  using (public.my_role() = 'admin');


-- ============================================================
-- GEO FUNCTIONS — Farm Radius
-- ============================================================
-- Returns all active farms whose delivery_radius_miles reaches
-- the given customer coordinates, ordered by distance ascending.
-- Uses the Haversine formula (no extensions required).
-- 3958.8 = Earth's radius in miles.
--
-- Usage from client:
--   supabase.rpc('farms_within_radius', { customer_lat: 35.37, customer_lng: -119.02 })
-- ============================================================

create or replace function public.farms_within_radius(
  customer_lat  numeric,
  customer_lng  numeric
)
returns table (
  farm_id        uuid,
  farm_name      text,
  slug           text,
  tagline        text,
  logo_url       text,
  banner_url     text,
  city           text,
  distance_miles numeric
) as $$
  select
    f.id,
    f.farm_name,
    f.slug,
    f.tagline,
    f.logo_url,
    f.banner_url,
    fa.city,
    round(
      (3958.8 * acos(
        least(1.0,
          cos(radians(customer_lat))
          * cos(radians(fa.latitude))
          * cos(radians(fa.longitude) - radians(customer_lng))
          + sin(radians(customer_lat))
          * sin(radians(fa.latitude))
        )
      ))::numeric, 1
    ) as distance_miles
  from public.farms f
  join public.farm_addresses fa
    on fa.farm_id = f.id and fa.is_primary = true
  where
    f.is_active = true
    and f.delivery_radius_miles is not null
    and fa.latitude  is not null
    and fa.longitude is not null
    and (3958.8 * acos(
      least(1.0,
        cos(radians(customer_lat))
        * cos(radians(fa.latitude))
        * cos(radians(fa.longitude) - radians(customer_lng))
        + sin(radians(customer_lat))
        * sin(radians(fa.latitude))
      )
    )) <= f.delivery_radius_miles
  order by distance_miles asc;
$$ language sql stable security definer;

-- Returns the distance in miles between a specific farm and a customer location.
-- Used for the "Eggs from a farm 6 miles away" display on product/farm cards.
--
-- Usage:
--   supabase.rpc('farm_distance_miles', { farm_uuid: '...', customer_lat: 35.37, customer_lng: -119.02 })

create or replace function public.farm_distance_miles(
  farm_uuid     uuid,
  customer_lat  numeric,
  customer_lng  numeric
)
returns numeric as $$
  select round(
    (3958.8 * acos(
      least(1.0,
        cos(radians(customer_lat))
        * cos(radians(fa.latitude))
        * cos(radians(fa.longitude) - radians(customer_lng))
        + sin(radians(customer_lat))
        * sin(radians(fa.latitude))
      )
    ))::numeric, 1
  )
  from public.farm_addresses fa
  where fa.farm_id = farm_uuid
    and fa.is_primary = true
    and fa.latitude  is not null
    and fa.longitude is not null
  limit 1;
$$ language sql stable security definer;


-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.categories (name, slug, description, icon_name, color_hex, sort_order) values
  ('Eggs',        'eggs',        'Farm fresh eggs',                        'Egg',     '#E8B86D', 1),
  ('Vegetables',  'vegetables',  'Seasonal vegetables',                    'Carrot',  '#7CB342', 2),
  ('Microgreens', 'microgreens', 'Nutrient-dense microgreens',             'Leaf',    '#43A047', 3),
  ('Honey',       'honey',       'Raw and unfiltered honey',               'Heart',   '#FFB300', 4),
  ('Seafood',     'seafood',     'Shrimp, fish, and aquaponics products',  'Fish',    '#4FC3F7', 5),
  ('Fruit',       'fruit',       'Fresh seasonal fruit',                   'Apple',   '#EF5350', 6),
  ('Meat',        'meat',        'Pasture-raised meats',                   'Package', '#8D6E63', 7),
  ('Dairy',       'dairy',       'Milk, cheese, and cream',                'Package', '#90A4AE', 8);

-- --

insert into public.farm_plans
  (name, slug, description, plan_type, price, max_products,
   allows_subscriptions, allows_delivery_zone_management, allows_featured_listing, sort_order)
values
  (
    'One-Time Listing', 'listing',
    'Farm page, up to 10 product listings, and shareable link. One-time payment, no recurring fees.',
    'one_time', 25.00, 10, false, false, false, 0
  ),
  (
    'Seed', 'seed',
    'Monthly plan. Farm page, up to 20 product listings, and shareable link.',
    'monthly', 39.00, 20, false, false, false, 1
  ),
  (
    'Growth', 'growth',
    'Monthly plan. Everything in Seed plus recurring customer subscriptions, delivery zone management, and farm analytics.',
    'monthly', 79.00, 40, true, true, true, 2
  ),
  (
    'Network Pro', 'pro',
    'Monthly plan. Everything in Growth plus driver network access, homepage placement boosts, and priority support.',
    'monthly', 129.00, 60, true, true, true, 3
  );

-- ─── Product Limit Enforcement ────────────────────────────────────────────────

-- Atomically syncs farms.platform_plan_slug and deactivates excess products.
-- Called by the Stripe webhook after every subscription event.
create or replace function public.sync_farm_plan(p_farm_id uuid, p_plan_slug text)
returns void language plpgsql security definer as $$
declare
  v_max     integer;
  v_active  integer;
  v_excess  integer;
begin
  update public.farms set platform_plan_slug = p_plan_slug where id = p_farm_id;

  if p_plan_slug is null then
    update public.products set is_active = false
    where farm_id = p_farm_id and is_active = true;
    return;
  end if;

  select max_products into v_max
  from public.farm_plans
  where slug = p_plan_slug and is_active = true;

  if v_max is null then return; end if;

  select count(*) into v_active
  from public.products
  where farm_id = p_farm_id and is_active = true;

  v_excess := v_active - v_max;

  if v_excess > 0 then
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

-- Trigger function: blocks INSERT when the farm has no plan or is at its limit.
create or replace function public.check_product_limit()
returns trigger language plpgsql security definer as $$
declare
  v_slug  text;
  v_max   integer;
  v_count integer;
begin
  select platform_plan_slug into v_slug from public.farms where id = new.farm_id;

  if v_slug is null then
    raise exception 'no_subscription';
  end if;

  select max_products into v_max from public.farm_plans where slug = v_slug and is_active = true;
  if v_max is null then return new; end if;

  select count(*) into v_count from public.products where farm_id = new.farm_id and is_active = true;
  if v_count >= v_max then
    raise exception 'product_limit_reached';
  end if;

  return new;
end;
$$;

create trigger enforce_product_limit
  before insert on public.products
  for each row execute function public.check_product_limit();
