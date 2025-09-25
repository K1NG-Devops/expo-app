-- Secure subscriptions RPCs and policies baseline
-- Generated at 2025-09-15T21:29Z

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

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

create or replace function public.public_list_schools()
returns table (
  id uuid,
  name text,
  tenant_slug text,
  subscription_tier text
) language sql stable security definer as $$
  select s.id, s.name, s.tenant_slug, s.subscription_tier
  from public.preschools s
  order by s.name asc;
$$;
revoke all on function public.public_list_schools from public;
grant execute on function public.public_list_schools() to authenticated;

create or replace function public.app_is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','superadmin')
  );
$$;

create or replace function public.ensure_school_free_subscription(p_school_id uuid, p_seats int default 5)
returns uuid language plpgsql security definer as $$
declare v_id uuid; begin
  select id into v_id from public.subscriptions 
    where owner_type = 'school' and school_id = p_school_id and plan_id = 'free' limit 1;
  if v_id is null then
    insert into public.subscriptions(id, school_id, plan_id, status, owner_type, billing_frequency, start_date, end_date, next_billing_date, seats_total, seats_used, metadata)
    values (gen_random_uuid(), p_school_id, 'free', 'active', 'school', 'monthly', now(), now() + interval '1 month', now() + interval '1 month', greatest(1, p_seats), 0, jsonb_build_object('created_by','ensure_free'))
    returning id into v_id;
  end if;
  return v_id;
end; $$;
revoke all on function public.ensure_school_free_subscription from public;
grant execute on function public.ensure_school_free_subscription(uuid, int) to authenticated;

create or replace function public.admin_create_school_subscription(
  p_school_id uuid,
  p_plan_id text,
  p_billing_frequency text,
  p_seats_total int default 5,
  p_start_trial boolean default true
) returns uuid language plpgsql security definer as $$
declare v_id uuid; v_start timestamptz := now(); v_end timestamptz; v_status text; begin
  if not public.app_is_super_admin() then
    raise exception 'not authorized';
  end if;
  if p_billing_frequency not in ('monthly','annual') then
    raise exception 'invalid billing_frequency';
  end if;
  if p_billing_frequency = 'annual' then v_end := v_start + interval '1 year'; else v_end := v_start + interval '1 month'; end if;
  v_status := case when p_start_trial then 'trial' else 'active' end;
  insert into public.subscriptions(id, school_id, plan_id, status, owner_type, billing_frequency, start_date, end_date, next_billing_date, trial_end_date, seats_total, seats_used, metadata)
  values (gen_random_uuid(), p_school_id, p_plan_id, v_status, 'school', p_billing_frequency, v_start, v_end, v_end, (case when p_start_trial then v_start + interval '14 days' else null end), greatest(1, p_seats_total), 0, jsonb_build_object('created_by','admin_create'))
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.admin_create_school_subscription from public;
grant execute on function public.admin_create_school_subscription(uuid, text, text, int, boolean) to authenticated;

create or replace function public.teacher_self_subscribe(
  p_plan_id text,
  p_billing_frequency text default 'monthly'
) returns uuid language plpgsql security definer as $$
declare v_id uuid; v_start timestamptz := now(); v_end timestamptz; begin
  if p_billing_frequency = 'annual' then v_end := v_start + interval '1 year'; else v_end := v_start + interval '1 month'; end if;
  insert into public.subscriptions(id, user_id, plan_id, status, owner_type, billing_frequency, start_date, end_date, next_billing_date, seats_total, seats_used, metadata)
  values (gen_random_uuid(), auth.uid(), p_plan_id, 'active', 'user', p_billing_frequency, v_start, v_end, v_end, 1, 1, jsonb_build_object('created_by','teacher_self'))
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.teacher_self_subscribe from public;
grant execute on function public.teacher_self_subscribe(text, text) to authenticated;

do $$ begin
  create policy subscriptions_admin_read on public.subscriptions
  for select using (public.app_is_super_admin());
exception when others then null; end $$;
