-- ============================================================
-- Water Jar Delivery Management System — Database Schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

create extension if not exists pgcrypto;

-- ============ PROFILES (extends Supabase auth.users) ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'driver')),
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ ROUTES ============
create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  areas text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ CUSTOMERS ============
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text,
  address text,
  route_id uuid references routes(id) on delete set null,
  route_order int not null default 0,
  selling_price numeric(10,2) not null,
  regular_quantity int not null default 0,
  delivery_frequency text not null default 'daily',
  opening_empty_balance int not null default 0,
  payment_cycle text not null default 'daily',
  payment_cycle_custom text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);
create index idx_customers_route on customers(route_id);
create index idx_customers_name on customers using gin (to_tsvector('simple', name));

-- ============ DAILY DELIVERY PLAN (auto-generated) ============
create table daily_delivery_plan (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  delivery_date date not null,
  expected_quantity int not null,
  adjusted_quantity int,
  route_id uuid references routes(id),
  status text not null default 'pending' check (status in ('pending','delivered','skipped')),
  created_at timestamptz not null default now(),
  unique (customer_id, delivery_date)
);
create index idx_plan_date on daily_delivery_plan(delivery_date);

-- ============ DELIVERIES (append-only source of truth) ============
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references daily_delivery_plan(id),
  customer_id uuid not null references customers(id),
  driver_id uuid not null references profiles(id),
  delivery_date date not null default current_date,
  full_delivered int not null default 0 check (full_delivered >= 0),
  empty_received int not null default 0 check (empty_received >= 0),
  rate numeric(10,2) not null,
  amount_due numeric(10,2) generated always as (full_delivered * rate) stored,
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  payment_method text check (payment_method in ('cash','upi','none')),
  remark text,
  created_at timestamptz not null default now()
);
create index idx_deliveries_customer on deliveries(customer_id);
create index idx_deliveries_date on deliveries(delivery_date);

-- ============ ADJUSTMENTS (admin-only, audited corrections) ============
create table ledger_adjustments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  type text not null check (type in ('empty_jar','payment')),
  delta numeric(10,2) not null,
  reason text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- ============ EXPENSES ============
create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (category in
    ('driver_salary','khalasi_salary','fuel','vehicle_maintenance','jar_replacement','electricity','breakfast','other')),
  amount numeric(10,2) not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============ SETTINGS (editable business assumptions — never hardcode) ============
create table settings (
  key text primary key,
  value numeric(10,2) not null,
  updated_at timestamptz not null default now()
);
insert into settings (key, value) values
  ('purchase_price_per_jar', 7),
  ('target_jars_per_day', 100),
  ('driver_salary_monthly', 8000),
  ('khalasi_salary_monthly', 8000),
  ('breakfast_daily', 40),
  ('fuel_daily', 100);

-- ============ JAR STOCK ENTRIES (purchases from supplier, empties sent for refilling) ============
-- Enables full opening→purchased→delivered→remaining reconciliation on the
-- Daily Closing screen (spec section 11), which the deliveries table alone
-- can't provide since it only tracks jars moving to/from customers, not the
-- business's own stock coming from/going back to the supplier.
create table jar_stock_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  purchased_qty int not null default 0 check (purchased_qty >= 0),
  empty_sent_qty int not null default 0 check (empty_sent_qty >= 0),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_jar_stock_date on jar_stock_entries(entry_date);

alter table jar_stock_entries enable row level security;
create policy "jar_stock_admin_all" on jar_stock_entries for all using (is_admin()) with check (is_admin());

-- ============ AUDIT LOG ============
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- COMPUTED BALANCE VIEWS
-- ============================================================
create view customer_empty_balance as
select
  c.id as customer_id,
  c.opening_empty_balance
    + coalesce((select sum(d.full_delivered - d.empty_received) from deliveries d where d.customer_id = c.id), 0)
    + coalesce((select sum(a.delta) from ledger_adjustments a where a.customer_id = c.id and a.type = 'empty_jar'), 0)
    as empty_balance
from customers c;

create view customer_payment_balance as
select
  c.id as customer_id,
  coalesce((select sum(d.amount_due - d.amount_paid) from deliveries d where d.customer_id = c.id), 0)
    + coalesce((select sum(a.delta) from ledger_adjustments a where a.customer_id = c.id and a.type = 'payment'), 0)
    as outstanding
from customers c;

create view daily_summary as
select
  delivery_date,
  count(*) as delivery_count,
  sum(full_delivered) as jars_delivered,
  sum(full_delivered) filter (where rate = 15) as jars_at_15,
  sum(full_delivered) filter (where rate = 20) as jars_at_20,
  sum(amount_due) as total_sales,
  sum(amount_paid) filter (where payment_method = 'cash') as cash_collected,
  sum(amount_paid) filter (where payment_method = 'upi') as upi_collected,
  sum(empty_received) as empty_jars_collected
from deliveries
group by delivery_date;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table routes enable row level security;
alter table customers enable row level security;
alter table daily_delivery_plan enable row level security;
alter table deliveries enable row level security;
alter table ledger_adjustments enable row level security;
alter table expenses enable row level security;
alter table settings enable row level security;
alter table audit_log enable row level security;

create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and active
  );
$$ language sql security definer stable;

create or replace function is_active_user() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$ language sql security definer stable;

-- profiles: everyone can read their own row; admin reads/writes all
create policy "profiles_self_read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_admin_write" on profiles for all using (is_admin()) with check (is_admin());

-- routes, customers, settings, expenses, adjustments, audit_log: admin full access,
-- driver read-only on routes/customers (needed for their delivery screen)
create policy "routes_admin_all" on routes for all using (is_admin()) with check (is_admin());
create policy "routes_driver_read" on routes for select using (is_active_user());

create policy "customers_admin_all" on customers for all using (is_admin()) with check (is_admin());
create policy "customers_driver_read" on customers for select using (is_active_user());

create policy "plan_admin_all" on daily_delivery_plan for all using (is_admin()) with check (is_admin());
create policy "plan_driver_read" on daily_delivery_plan for select using (is_active_user());
-- driver may update ONLY adjusted_quantity/status via the delivery flow (enforced in app layer + trigger below)
create policy "plan_driver_update" on daily_delivery_plan for update using (is_active_user());

-- deliveries: driver can INSERT their own delivery rows, cannot update/delete (append-only, enforces
-- "historical delivery records cannot be deleted/edited by driver"); admin has full access for corrections
create policy "deliveries_admin_all" on deliveries for all using (is_admin()) with check (is_admin());
create policy "deliveries_driver_insert" on deliveries for insert
  with check (is_active_user() and driver_id = auth.uid());
create policy "deliveries_driver_read" on deliveries for select using (is_active_user());

-- ledger_adjustments: admin only, both read and write
create policy "adjustments_admin_all" on ledger_adjustments for all using (is_admin()) with check (is_admin());

create policy "expenses_admin_all" on expenses for all using (is_admin()) with check (is_admin());
create policy "settings_admin_all" on settings for all using (is_admin()) with check (is_admin());
create policy "settings_driver_read" on settings for select using (is_active_user());
create policy "audit_admin_read" on audit_log for select using (is_admin());
create policy "audit_system_insert" on audit_log for insert with check (is_active_user());

-- ============================================================
-- TRIGGER: log every rate/quantity change on customers to audit_log
-- ============================================================
create or replace function log_customer_change() returns trigger as $$
begin
  if (old.selling_price is distinct from new.selling_price)
     or (old.regular_quantity is distinct from new.regular_quantity) then
    insert into audit_log (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'customer_rate_or_qty_change', 'customer', new.id,
      jsonb_build_object('selling_price', old.selling_price, 'regular_quantity', old.regular_quantity),
      jsonb_build_object('selling_price', new.selling_price, 'regular_quantity', new.regular_quantity));
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_customer_change
  after update on customers
  for each row execute function log_customer_change();
