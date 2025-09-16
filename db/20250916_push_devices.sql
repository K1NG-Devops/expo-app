-- Create push_devices table, unique index, updated_at trigger, and RLS policies
-- Safe to run multiple times (IF NOT EXISTS where possible)

-- 1) Table
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text check (platform in ('web','ios','android')) default 'web',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Unique constraint/index for on_conflict=user_id,expo_push_token
create unique index if not exists push_devices_user_token_idx
  on public.push_devices (user_id, expo_push_token);

-- 3) updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_push_devices_updated_at on public.push_devices;
create trigger trg_push_devices_updated_at
before update on public.push_devices
for each row execute function public.set_updated_at();

-- 4) RLS policies (owner-only)
alter table public.push_devices enable row level security;

-- Postgres does not support IF NOT EXISTS for CREATE POLICY.
-- Use DROP POLICY IF EXISTS to make this idempotent.

drop policy if exists push_devices_select_own on public.push_devices;
create policy push_devices_select_own
  on public.push_devices
  for select
  using (auth.uid() = user_id);


drop policy if exists push_devices_insert_own on public.push_devices;
create policy push_devices_insert_own
  on public.push_devices
  for insert
  with check (auth.uid() = user_id);


drop policy if exists push_devices_update_own on public.push_devices;
create policy push_devices_update_own
  on public.push_devices
  for update
  using (auth.uid() = user_id);


drop policy if exists push_devices_delete_own on public.push_devices;
create policy push_devices_delete_own
  on public.push_devices
  for delete
  using (auth.uid() = user_id);
