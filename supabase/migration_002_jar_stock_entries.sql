-- Run this if you already executed the original supabase/schema.sql and
-- don't want to drop/recreate everything. Safe to run once.

create table if not exists jar_stock_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  purchased_qty int not null default 0 check (purchased_qty >= 0),
  empty_sent_qty int not null default 0 check (empty_sent_qty >= 0),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_jar_stock_date on jar_stock_entries(entry_date);

alter table jar_stock_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'jar_stock_entries' and policyname = 'jar_stock_admin_all'
  ) then
    create policy "jar_stock_admin_all" on jar_stock_entries for all using (is_admin()) with check (is_admin());
  end if;
end $$;
