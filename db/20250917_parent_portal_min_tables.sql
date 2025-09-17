-- Minimal parent portal tables for PoP upload and child registration (RLS-enabled)
-- Date: 2025-09-17

begin;

-- Ensure required extension is available (on Supabase it usually is)
-- create extension if not exists pgcrypto;

-- 1) Parent Payments (Proof of Payment uploads)
create table if not exists public.parent_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  parent_id uuid null references auth.users(id) on delete set null,
  reference text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  notes text null
);

alter table public.parent_payments enable row level security;

-- Function to set parent_id from auth.uid() when not provided
create or replace function public.set_parent_payments_parent_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.parent_id is null then
    new.parent_id := auth.uid();
  end if;
  return new;
end;$$;

drop trigger if exists trg_set_parent_payments_parent_id on public.parent_payments;
create trigger trg_set_parent_payments_parent_id
before insert on public.parent_payments
for each row execute function public.set_parent_payments_parent_id();

-- Super admin helper (if not present)
create or replace function public.app_is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() and lower(p.role) in ('super_admin','superadmin')
  );
$$;

-- Policies (drop if exist to avoid IF NOT EXISTS incompatibilities)
-- SELECT own or super admin
drop policy if exists parent_payments_select_own_or_admin on public.parent_payments;
create policy parent_payments_select_own_or_admin
on public.parent_payments for select
using (
  parent_id = auth.uid() or public.app_is_super_admin()
);

-- INSERT self
drop policy if exists parent_payments_insert_self on public.parent_payments;
create policy parent_payments_insert_self
on public.parent_payments for insert to authenticated
with check (
  parent_id is null or parent_id = auth.uid()
);

-- UPDATE pending (own)
drop policy if exists parent_payments_update_pending_own on public.parent_payments;
create policy parent_payments_update_pending_own
on public.parent_payments for update to authenticated
using (
  parent_id = auth.uid() and status = 'pending_review'
)
with check (
  parent_id = auth.uid() and status = 'pending_review'
);

-- 2) Child Registration Requests
create table if not exists public.child_registration_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  parent_id uuid null references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  date_of_birth date null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  notes text null
);

alter table public.child_registration_requests enable row level security;

create or replace function public.set_child_reg_parent_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.parent_id is null then
    new.parent_id := auth.uid();
  end if;
  return new;
end;$$;

drop trigger if exists trg_set_child_reg_parent_id on public.child_registration_requests;
create trigger trg_set_child_reg_parent_id
before insert on public.child_registration_requests
for each row execute function public.set_child_reg_parent_id();

drop policy if exists child_reg_select_own_or_admin on public.child_registration_requests;
create policy child_reg_select_own_or_admin
on public.child_registration_requests for select
using (
  parent_id = auth.uid() or public.app_is_super_admin()
);

-- INSERT self
drop policy if exists child_reg_insert_self on public.child_registration_requests;
create policy child_reg_insert_self
on public.child_registration_requests for insert to authenticated
with check (
  parent_id is null or parent_id = auth.uid()
);

-- UPDATE pending (own)
drop policy if exists child_reg_update_pending_own on public.child_registration_requests;
create policy child_reg_update_pending_own
on public.child_registration_requests for update to authenticated
using (
  parent_id = auth.uid() and status = 'pending'
)
with check (
  parent_id = auth.uid() and status = 'pending'
);

commit;
