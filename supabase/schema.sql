-- HORUS Barber SaaS - Multi-tenant schema
create extension if not exists "uuid-ossp";

-- ─── Enum types ──────────────────────────────────────────────────────────────

create type user_role as enum ('platform_admin', 'barbershop_owner', 'barber', 'client');
create type appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

-- ─── Core tables ─────────────────────────────────────────────────────────────

create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  max_barbers integer not null,
  monthly_price numeric(10,2) not null,
  features jsonb not null default '{}',
  created_at timestamptz default now()
);

create table public.barbershops (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id),
  name text not null,
  slug text not null unique,
  phone text,
  address text,
  logo_url text,
  opening_hours jsonb not null default '{}',
  barbers_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table public.units (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  address text not null,
  phone text,
  created_at timestamptz default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid,
  unit_id uuid,
  role user_role not null,
  name text not null,
  phone text,
  email text not null unique,
  created_at timestamptz default now()
);

alter table public.users
  add constraint users_tenant_fk foreign key (tenant_id) references public.barbershops(id) on delete set null,
  add constraint users_unit_fk foreign key (unit_id) references public.units(id) on delete set null;

create table public.barbers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  commission_percent numeric(5,2) not null default 40,
  monthly_goal numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  preferred_barber_id uuid references public.barbers(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  notes text,
  birthday date,
  loyalty_points integer not null default 0,
  created_at timestamptz default now()
);

create table public.services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  name text not null,
  duration_minutes integer not null,
  price numeric(10,2) not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  source text not null default 'public_link',
  waitlist boolean not null default false,
  cancellation_reason text,
  created_at timestamptz default now()
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_status payment_status not null default 'pending',
  created_at timestamptz default now()
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null check (item_type in ('service', 'product')),
  reference_id uuid,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) generated always as (quantity * unit_price) stored
);

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  plan_name text not null,
  included_cuts integer,
  unlimited boolean not null default false,
  monthly_price numeric(10,2) not null,
  starts_at date not null,
  ends_at date not null,
  auto_renew boolean not null default true,
  usage_count integer not null default 0,
  active boolean not null default true,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  name text not null,
  sku text,
  sale_price numeric(10,2) not null,
  cost_price numeric(10,2),
  min_stock integer not null default 5,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table public.inventory (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity integer not null,
  reason text,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(10,2) not null,
  method text not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'whatsapp')),
  type text not null,
  payload jsonb not null,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table public.barber_reviews (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table public.qr_checkins (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.barbershops(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  checked_in_at timestamptz default now()
);

-- ─── Helper function (security definer avoids RLS recursion) ─────────────────

create or replace function public.my_tenant_id()
returns uuid as $$
  select tenant_id from public.users where id = auth.uid()
$$ language sql stable security definer;

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.plans           enable row level security;
alter table public.barbershops     enable row level security;
alter table public.users           enable row level security;
alter table public.units           enable row level security;
alter table public.barbers         enable row level security;
alter table public.clients         enable row level security;
alter table public.services        enable row level security;
alter table public.appointments    enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.products        enable row level security;
alter table public.inventory       enable row level security;
alter table public.payments        enable row level security;
alter table public.notifications   enable row level security;
alter table public.barber_reviews  enable row level security;
alter table public.qr_checkins     enable row level security;

-- plans: anyone authenticated can read
create policy "plans_read" on public.plans
  for select using (auth.uid() is not null);

-- barbershops: public read for booking page; write only for own tenant
create policy "barbershops_public_read" on public.barbershops
  for select using (active = true);

create policy "barbershops_owner_write" on public.barbershops
  for update using (id = public.my_tenant_id())
  with check (id = public.my_tenant_id());

-- users: own record + same-tenant reads
create policy "users_self_read" on public.users
  for select using (id = auth.uid() or tenant_id = public.my_tenant_id());

create policy "users_self_insert" on public.users
  for insert with check (id = auth.uid());

create policy "users_self_update" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Tenant-isolated tables: all CRUD scoped to the caller's tenant
create policy "units_tenant" on public.units
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "barbers_tenant" on public.barbers
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "clients_tenant" on public.clients
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "services_tenant" on public.services
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "appointments_tenant" on public.appointments
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "orders_tenant" on public.orders
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "order_items_tenant" on public.order_items
  for all using (
    order_id in (select id from public.orders where tenant_id = public.my_tenant_id())
  );

create policy "subscriptions_tenant" on public.subscriptions
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "products_tenant" on public.products
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "inventory_tenant" on public.inventory
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "payments_tenant" on public.payments
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "notifications_tenant" on public.notifications
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "barber_reviews_tenant" on public.barber_reviews
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

create policy "qr_checkins_tenant" on public.qr_checkins
  for all using (tenant_id = public.my_tenant_id())
  with check (tenant_id = public.my_tenant_id());

-- ─── Trigger: auto-provision user + barbershop on signup ─────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_plan_id      uuid;
  v_barbershop_id uuid;
  v_slug         text;
  v_name         text;
begin
  -- Get or create the free Trial plan
  select id into v_plan_id from public.plans where name = 'Trial' limit 1;
  if v_plan_id is null then
    insert into public.plans (name, max_barbers, monthly_price, features)
    values ('Trial', 3, 0, '{"trial": true}')
    returning id into v_plan_id;
  end if;

  -- Create barbershop when metadata is present (owner registration)
  v_name := new.raw_user_meta_data->>'barbershop_name';
  if v_name is not null then
    v_slug := new.raw_user_meta_data->>'barbershop_slug';

    -- Avoid slug collision by appending part of the user UUID
    if exists (select 1 from public.barbershops where slug = v_slug) then
      v_slug := v_slug || '-' || substr(new.id::text, 1, 6);
    end if;

    insert into public.barbershops (plan_id, name, slug, phone)
    values (
      v_plan_id,
      v_name,
      v_slug,
      new.raw_user_meta_data->>'phone'
    )
    returning id into v_barbershop_id;
  end if;

  -- Create the public.users row linked to auth.users
  insert into public.users (id, tenant_id, role, name, email, phone)
  values (
    new.id,
    v_barbershop_id,
    coalesce(
      (new.raw_user_meta_data->>'role')::user_role,
      'barbershop_owner'
    ),
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise warning 'handle_new_user error for %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Seed data ────────────────────────────────────────────────────────────────

insert into public.plans (name, max_barbers, monthly_price, features) values
  ('Trial',       3,  0.00, '{"trial": true, "whatsapp": false}'),
  ('Basico',      3, 79.90, '{"whatsapp": true, "reports": false}'),
  ('Profissional',10,149.90, '{"whatsapp": true, "reports": true, "multi_unit": false}'),
  ('Enterprise',  50,299.90, '{"whatsapp": true, "reports": true, "multi_unit": true}')
on conflict do nothing;
