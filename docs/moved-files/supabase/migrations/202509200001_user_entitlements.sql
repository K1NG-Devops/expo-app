-- Supabase migration: user-level entitlements + RC webhook events
-- Safe to run multiple times (IF NOT EXISTS)

begin;

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null,
  source text not null default 'revenuecat' check (source in ('revenuecat','manual','promo','school_plan')),
  product_id text null,
  platform text not null default 'unknown' check (platform in ('android','ios','web','unknown')),
  rc_app_user_id text null,
  rc_entitlement_id text null,
  rc_event_id text null,
  active boolean not null default true,
  expires_at timestamptz null,
  started_at timestamptz not null default now(),
  cancelled_at timestamptz null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_user_entitlements_active
  on public.user_entitlements (user_id, entitlement) where active = true;
create index if not exists idx_user_entitlements_user on public.user_entitlements(user_id);
create index if not exists idx_user_entitlements_rc_event on public.user_entitlements(rc_event_id);

create table if not exists public.revenuecat_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  app_user_id text null,
  type text not null,
  environment text null,
  raw jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_entitlements enable row level security;
alter table public.revenuecat_webhook_events enable row level security;

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

drop policy if exists user_entitlements_select_own on public.user_entitlements;
create policy user_entitlements_select_own
  on public.user_entitlements for select to authenticated
  using (user_id = auth.uid() or public.app_is_super_admin());

drop policy if exists rc_events_admin_select on public.revenuecat_webhook_events;
create policy rc_events_admin_select
  on public.revenuecat_webhook_events for select to authenticated
  using (public.app_is_super_admin());

create or replace function public.grant_user_entitlement(
  p_user_id uuid,
  p_entitlement text,
  p_product_id text default null,
  p_platform text default 'unknown',
  p_source text default 'revenuecat',
  p_expires_at timestamptz default null,
  p_rc_app_user_id text default null,
  p_rc_event_id text default null,
  p_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  update public.user_entitlements
     set active = false,
         cancelled_at = coalesce(cancelled_at, now()),
         updated_at = now()
   where user_id = p_user_id
     and entitlement = p_entitlement
     and active = true;

  insert into public.user_entitlements (
    user_id, entitlement, source, product_id, platform,
    rc_app_user_id, rc_event_id, expires_at, meta
  ) values (
    p_user_id, p_entitlement, p_source, p_product_id, p_platform,
    p_rc_app_user_id, p_rc_event_id, p_expires_at, coalesce(p_meta, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;$$;

create or replace function public.revoke_user_entitlement(
  p_user_id uuid,
  p_entitlement text,
  p_reason text default null,
  p_rc_event_id text default null
) returns integer
language plpgsql
security definer
as $$
begin
  update public.user_entitlements
     set active = false,
         cancelled_at = now(),
         updated_at = now(),
         meta = coalesce(meta, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('revocation_reason', p_reason, 'rc_event_id', p_rc_event_id))
   where user_id = p_user_id
     and entitlement = p_entitlement
     and active = true;

  return found::int;
end;$$;

commit;
