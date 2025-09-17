-- RLS-safe RPCs and policies for subscriptions dashboard
-- Run this in Supabase SQL editor with service role or via CLI

-- 1) Public read access to active plans via RPC (keeps RLS intact)
create or replace function public.public_list_plans()
returns table (
  id uuid,
  name text,
  tier text,
  price_monthly numeric,
  price_annual numeric,
  max_teachers int,
  max_students int,
  is_active boolean
) language sql stable security definer as $$
  select p.id, p.name, p.tier, p.price_monthly, p.price_annual, p.max_teachers, p.max_students, coalesce(p.is_active, true)
  from public.subscription_plans p
  where coalesce(p.is_active, true) = true
  order by p.price_monthly nulls last;
$$;

revoke all on function public.public_list_plans from public;
grant execute on function public.public_list_plans() to anon, authenticated;

-- 2) Public read access to schools list via RPC (minimal columns)
create or replace function public.public_list_schools()
returns table (
  id uuid,
  name text,
  tenant_slug text,
  subscription_tier text
) language sql stable security definer as $$
  select s.id, s.name, s.tenant_slug, s.subscription_tier
  from public.preschools s
  order by s.name asc
$$;

revoke all on function public.public_list_schools from public;
grant execute on function public.public_list_schools() to authenticated;

-- 3) Admin RPC to create a school-owned subscription safely (checks role)
create or replace function public.admin_create_school_subscription(
  p_school_id uuid,
  p_plan_id text,
  p_billing_frequency text,
  p_seats_total int default 1
) returns uuid
language plpgsql security definer as $$
declare
  v_sub_id uuid;
  v_is_admin boolean;
  v_start timestamptz := now();
  v_end timestamptz;
begin
  -- Require authenticated user; verify they are super admin or principal_admin
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('super_admin','superadmin','principal_admin')
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'not authorized';
  end if;

  if p_billing_frequency not in ('monthly','annual') then
    raise exception 'invalid billing_frequency';
  end if;

  if p_billing_frequency = 'annual' then
    v_end := (v_start + interval '1 year');
  else
    v_end := (v_start + interval '1 month');
  end if;

  insert into public.subscriptions (
    id, school_id, plan_id, status, owner_type, billing_frequency,
    start_date, end_date, next_billing_date, seats_total, seats_used, metadata
  ) values (
    gen_random_uuid(), p_school_id, p_plan_id, 'active', 'school', p_billing_frequency,
    v_start, v_end, v_end, greatest(1, coalesce(p_seats_total, 1)), 0,
    jsonb_build_object('created_by', 'admin_rpc')
  ) returning id into v_sub_id;

  -- Optional: set school subscription_tier to plan_id when applicable
  update public.preschools set subscription_tier = p_plan_id where id = p_school_id;

  return v_sub_id;
end;
$$;

revoke all on function public.admin_create_school_subscription(uuid, text, text, int) from public;
grant execute on function public.admin_create_school_subscription(uuid, text, text, int) to authenticated;

-- 4) Optional: RLS policies for read-only access if not present
-- Allow read of subscriptions to authenticated users who are super admins
create or replace function public.app_is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','super_admin')
  );
$$;

drop policy if exists subscriptions_admin_read on public.subscriptions;
create policy subscriptions_admin_read on public.subscriptions
for select using (public.app_is_super_admin());
