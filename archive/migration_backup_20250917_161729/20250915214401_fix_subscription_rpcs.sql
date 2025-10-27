-- Fix subscriptions RPCs: dedupe plans by tier, upsert school subscription, free seats=1

-- 1) Replace plans listing to return distinct tiers
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
  select distinct on (lower(p.tier))
         p.id, p.name, p.tier, p.price_monthly, p.price_annual, p.max_teachers, p.max_students, coalesce(p.is_active, true)
  from public.subscription_plans p
  where coalesce(p.is_active, true) = true
  order by lower(p.tier), p.price_monthly nulls last, p.created_at desc;
$$;
revoke all on function public.public_list_plans from public;
grant execute on function public.public_list_plans() to anon, authenticated;

-- 2) Ensure free subscription uses 1 seat by default
create or replace function public.ensure_school_free_subscription(p_school_id uuid, p_seats int default 1)
returns uuid language plpgsql security definer as $$
declare v_id uuid; begin
  select id into v_id from public.subscriptions 
    where owner_type = 'school' and school_id = p_school_id limit 1;
  if v_id is null then
    insert into public.subscriptions(id, school_id, plan_id, status, owner_type, billing_frequency, start_date, end_date, next_billing_date, seats_total, seats_used, metadata)
    values (gen_random_uuid(), p_school_id, 'free', 'active', 'school', 'monthly', now(), now() + interval '1 month', now() + interval '1 month', greatest(1, coalesce(p_seats,1)), 0, jsonb_build_object('created_by','ensure_free'))
    returning id into v_id;
  else
    -- If exists already, ensure it's at least free with 1 seat
    update public.subscriptions
      set plan_id = 'free', status = 'active', billing_frequency = 'monthly',
          start_date = now(), end_date = now() + interval '1 month', next_billing_date = now() + interval '1 month',
          seats_total = greatest(1, coalesce(p_seats,1))
    where id = v_id;
  end if;
  return v_id;
end; $$;
revoke all on function public.ensure_school_free_subscription from public;
grant execute on function public.ensure_school_free_subscription(uuid, int) to authenticated;

-- 3) Upsert school subscription to avoid duplicate key errors
create or replace function public.admin_create_school_subscription(
  p_school_id uuid,
  p_plan_id text,
  p_billing_frequency text,
  p_seats_total int default 1,
  p_start_trial boolean default false
) returns uuid language plpgsql security definer as $$
declare v_id uuid; v_start timestamptz := now(); v_end timestamptz; v_status text; begin
  if not public.app_is_super_admin() then
    raise exception 'not authorized';
  end if;
  if p_billing_frequency not in ('monthly','annual') then
    raise exception 'invalid billing_frequency';
  end if;
  if p_billing_frequency = 'annual' then v_end := v_start + interval '1 year'; else v_end := v_start + interval '1 month'; end if;
  v_status := case when p_start_trial and p_plan_id = 'free' then 'trial' else 'active' end;

  select id into v_id from public.subscriptions where owner_type = 'school' and school_id = p_school_id limit 1;
  if v_id is null then
    insert into public.subscriptions(id, school_id, plan_id, status, owner_type, billing_frequency, start_date, end_date, next_billing_date, trial_end_date, seats_total, seats_used, metadata)
    values (gen_random_uuid(), p_school_id, p_plan_id, v_status, 'school', p_billing_frequency, v_start, v_end, v_end, (case when v_status = 'trial' then v_start + interval '14 days' else null end), greatest(1, coalesce(p_seats_total,1)), 0, jsonb_build_object('created_by','admin_create'))
    returning id into v_id;
  else
    update public.subscriptions
      set plan_id = p_plan_id,
          status = v_status,
          billing_frequency = p_billing_frequency,
          start_date = v_start,
          end_date = v_end,
          next_billing_date = v_end,
          trial_end_date = (case when v_status = 'trial' then v_start + interval '14 days' else null end),
          seats_total = greatest(1, coalesce(p_seats_total,1))
    where id = v_id;
  end if;

  -- Update school tier to match plan_id
  update public.preschools set subscription_tier = p_plan_id where id = p_school_id;

  return v_id;
end; $$;
revoke all on function public.admin_create_school_subscription from public;
grant execute on function public.admin_create_school_subscription(uuid, text, text, int, boolean) to authenticated;