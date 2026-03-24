-- HORUS Barber SaaS - Multi-tenant schema
create extension if not exists "uuid-ossp";

create type user_role as enum ('platform_admin', 'barbershop_owner', 'barber', 'client');
create type appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

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

alter table public.barbershops enable row level security;
alter table public.users enable row level security;
alter table public.units enable row level security;
alter table public.barbers enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.barber_reviews enable row level security;
alter table public.qr_checkins enable row level security;

create policy "tenant_isolation_read" on public.clients
for select using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy "tenant_isolation_write" on public.clients
for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Replicar politicas por tenant_id para todas as tabelas operacionais.
