-- Principal Onboarding RPCs and policies (idempotent)
-- This migration adds a secure RPC for principals to create a preschool that becomes their tenant org,
-- and ensures appropriate RLS and grants. It is designed to work with existing preschools/profiles schema.

begin;

-- Helper: generate slug
create or replace function public.slugify(input text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(coalesce(input,''));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  if s is null or length(s) = 0 then
    s := 'school-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;
  return s;
end;
$$;

-- RPC: principal_create_school
-- Creates a new preschool and assigns the calling user as principal_admin of that preschool.
-- Returns the new preschool UUID.
create or replace function public.principal_create_school(
  p_school_name text,
  p_admin_name text default null,
  p_phone text default null,
  p_plan_tier text default 'free'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_school_id uuid;
  v_slug text;
  v_email text;
  v_existing_preschool uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- If user already has a preschool assigned, just return it (idempotent behavior)
  select preschool_id from public.profiles where id = v_user into v_existing_preschool;
  if v_existing_preschool is not null then
    return v_existing_preschool;
  end if;

  -- Get email for metadata
  select email from public.profiles where id = v_user into v_email;

  v_slug := slugify(p_school_name);

  insert into public.preschools (name, phone, is_active, setup_completed, subscription_tier, tenant_slug, created_at, updated_at)
  values (coalesce(p_school_name,'New Preschool'), p_phone, true, false, coalesce(p_plan_tier,'free'), v_slug, now(), now())
  returning id into v_school_id;

  -- Assign the user as principal_admin and link to the preschool
  update public.profiles
    set preschool_id = v_school_id,
        organization_id = coalesce(organization_id, v_school_id),
        role = case when role in ('super_admin','principal_admin','principal') then role else 'principal_admin' end,
        updated_at = now()
  where id = v_user;

  -- Best-effort: upsert into organization_members if table exists
  begin
    insert into public.organization_members (id, organization_id, user_id, role, seat_status, created_at, updated_at)
    values (gen_random_uuid(), v_school_id, v_user, 'principal_admin', 'active', now(), now());
  exception when undefined_table then
    -- ignore if organization_members not present in this environment
    null;
  end;

  return v_school_id;
end;
$$;

-- Grants
revoke all on function public.principal_create_school(text, text, text, text) from public;
grant execute on function public.principal_create_school(text, text, text, text) to authenticated;

comment on function public.principal_create_school(text, text, text, text) is
  'Creates a new preschool and assigns the caller as principal_admin; returns preschool id.';

-- Ensure RLS enabled on preschools and profiles (safe if already enabled)
alter table if exists public.preschools enable row level security;
alter table if exists public.profiles enable row level security;

-- Minimal policies to allow creator to see their preschool after creation (idempotent creation)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='preschools' and policyname='preschools_member_read_minimal'
  ) then
    create policy preschools_member_read_minimal on public.preschools for select using (
      exists (
        select 1 from public.profiles p where p.id = auth.uid() and (p.preschool_id = preschools.id)
      )
      or exists (
        select 1 from public.organization_members m where m.user_id = auth.uid() and m.organization_id = preschools.id
      )
    );
  end if;
end $$;

commit;
