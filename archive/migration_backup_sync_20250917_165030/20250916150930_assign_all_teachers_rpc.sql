-- Bulk-assign all current teachers to a school's active subscription seats
-- Ensures RLS-safe, role-checked operation and respects seat limits
--
-- Usage:
--  select * from public.assign_all_teachers_to_subscription(p_subscription_id := '...', p_school_id := '...');
--
-- Returns rows for each candidate teacher with assignment status and reason.

create or replace function public.assign_all_teachers_to_subscription(
  p_subscription_id uuid,
  p_school_id uuid default null
)
returns table (
  user_id uuid,
  assigned boolean,
  reason text
) language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_seats_total int;
  v_available int;
  v_is_super_or_principal boolean;
begin
  -- Resolve subscription and school
  select s.school_id, s.seats_total
    into v_school_id, v_seats_total
  from public.subscriptions s
  where s.id = p_subscription_id
    and s.owner_type = 'school'
    and coalesce(s.status, 'active') in ('active','trial')
  limit 1;

  if v_school_id is null then
    raise exception 'Subscription not found, not school-owned, or not active/trial';
  end if;

  if p_school_id is not null and p_school_id <> v_school_id then
    raise exception 'Provided school (%%) does not match subscription school (%%)', p_school_id, v_school_id;
  end if;

  -- Authorization: super admin OR principal/principal_admin of the school
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        lower(p.role) in ('super_admin','superadmin')
        or (lower(p.role) in ('principal','principal_admin') and p.preschool_id = v_school_id)
      )
  ) into v_is_super_or_principal;

  if not coalesce(v_is_super_or_principal, false) then
    raise exception 'not authorized';
  end if;

  -- Available seats = seats_total - current assigned
  select greatest(0, coalesce(v_seats_total,0) - coalesce((
    select count(*) from public.subscription_seats ss where ss.subscription_id = p_subscription_id
  ),0)) into v_available;

  if v_available <= 0 then
    -- Return a single informative row
    return query select null::uuid as user_id, false as assigned, 'no available seats'::text as reason
    limit 1;
    return;
  end if;

  -- Select up to v_available candidate teachers and insert
  return query with candidate_teachers as (
    select p.id as user_id
    from public.profiles p
    where p.preschool_id = v_school_id
      and lower(p.role) = 'teacher'
      and coalesce(p.is_active, true) = true
      and not exists (
        select 1 from public.subscription_seats ss
        where ss.subscription_id = p_subscription_id and ss.user_id = p.id
      )
    limit v_available
  ), inserted as (
    insert into public.subscription_seats(subscription_id, user_id)
    select p_subscription_id, ct.user_id
    from candidate_teachers ct
    on conflict do nothing
    returning user_id
  )
  select
    ct.user_id,
    (i.user_id is not null) as assigned,
    case when i.user_id is not null then 'assigned' else 'skipped' end as reason
  from candidate_teachers ct
  left join inserted i on i.user_id = ct.user_id;
end;
$$;

revoke all on function public.assign_all_teachers_to_subscription(uuid, uuid) from public;
grant execute on function public.assign_all_teachers_to_subscription(uuid, uuid) to authenticated;
