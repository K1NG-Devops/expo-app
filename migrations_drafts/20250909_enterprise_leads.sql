-- Draft migration: enterprise_leads table + RLS and policies
-- NOTE: Apply this via your Supabase migrations in the edudash-mobile-standalone project.

-- Helper enum for lead status
create type if not exists lead_status as enum ('new','contacted','qualified','proposal','closed-won','closed-lost');

create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contact_name text,
  contact_email text not null,
  phone text,
  organization_name text,
  country text,
  role text,
  school_size text,
  plan_interest text,
  notes text,
  status lead_status not null default 'new'
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists enterprise_leads_set_updated_at on public.enterprise_leads;
create trigger enterprise_leads_set_updated_at
before update on public.enterprise_leads
for each row execute function public.set_updated_at();

alter table public.enterprise_leads enable row level security;

-- Helper: adjust to your profiles/roles model
create or replace function public.app_is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  );
$$;

-- Policies
-- Allow anyone authenticated to insert a lead
create policy enterprise_leads_insert_authenticated
on public.enterprise_leads
for insert
to authenticated
with check (true);

-- Only super admins can read/update/delete
create policy enterprise_leads_admin_read
on public.enterprise_leads
for select
using (public.app_is_super_admin());

create policy enterprise_leads_admin_update
on public.enterprise_leads
for update
using (public.app_is_super_admin());

create policy enterprise_leads_admin_delete
on public.enterprise_leads
for delete
using (public.app_is_super_admin());

