-- Update admin_create_school_subscription to map preschools.subscription_tier safely
create or replace function public.admin_create_school_subscription(
  p_school_id uuid,
  p_plan_id text,
  p_billing_frequency text,
  p_seats_total int default 1,
  p_start_trial boolean default false
) returns uuid language plpgsql security definer as $$
declare v_id uuid; v_start timestamptz := now(); v_end timestamptz; v_status text; v_school_tier text; begin
  if not public.app_is_super_admin() then
    raise exception 'not authorized';
  end if;
  if p_billing_frequency not in ('monthly','annual') then
    raise exception 'invalid billing_frequency';
  end if;
  if p_billing_frequency = 'annual' then v_end := v_start + interval '1 year'; else v_end := v_start + interval '1 month'; end if;
  v_status := case when p_start_trial and p_plan_id = 'free' then 'trial' else 'active' end;

  -- Upsert school subscription
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

  -- Map plan tier to allowed preschools.subscription_tier values
  v_school_tier := case lower(p_plan_id)
    when 'basic' then 'basic'
    when 'premium' then 'premium'
    when 'enterprise' then 'enterprise'
    when 'starter' then 'basic'
    when 'pro' then 'premium'
    when 'free' then 'trial'
    else null
  end;

  if v_school_tier is not null then
    begin
      update public.preschools set subscription_tier = v_school_tier where id = p_school_id;
    exception when others then
      -- In case of constraint issues, ignore but keep subscription upserted
      perform 1;
    end;
  end if;

  return v_id;
end; $$;
revoke all on function public.admin_create_school_subscription from public;
grant execute on function public.admin_create_school_subscription(uuid, text, text, int, boolean) to authenticated;
