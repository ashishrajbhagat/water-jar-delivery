-- Run this if you already executed the original supabase/schema.sql and
-- don't want to drop/recreate everything. Safe to run once.

alter table customers add column if not exists payment_cycle_custom text;
