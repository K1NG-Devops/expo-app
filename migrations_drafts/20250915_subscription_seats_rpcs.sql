-- Draft migration: subscription seat assignment RPCs
-- Safe to run multiple times; uses upserts and guards

-- Ensure subscription_seats table (id, subscription_id, user_id) exists (optional)
-- Uncomment if you want table creation here. Otherwise assume it exists.
-- create table if not exists public.subscription_seats (
--   id uuid primary key default gen_random_uuid(),
--   subscription_id uuid not null,
--   user_id uuid not null,
--   granted_at timestamptz not null default now(),
--   unique (subscription_id, user_id)
-- );

-- assign_teacher_seat(subscription_id uuid, user_id uuid)
create or replace function public.assign_teacher_seat(
  p_subscription_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  -- Upsert seat mapping
  insert into public.subscription_seats (subscription_id, user_id)
  values (p_subscription_id, p_user_id)
  on conflict (subscription_id, user_id) do nothing;

  -- Best-effort counter bump if columns exist
  begin
    update public.subscriptions
      set seats_used = coalesce(seats_used, 0) + 1
    where id = p_subscription_id
      and (seats_total is null or coalesce(seats_used,0) < seats_total);
  exception when undefined_column then
    -- ignore if seats_used / seats_total not present
    null;
  end;
end;
$$;

-- revoke_teacher_seat(subscription_id uuid, user_id uuid)
create or replace function public.revoke_teacher_seat(
  p_subscription_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  -- Remove seat mapping
  delete from public.subscription_seats
   where subscription_id = p_subscription_id
     and user_id = p_user_id;

  -- Best-effort counter decrement if columns exist
  begin
    update public.subscriptions
      set seats_used = greatest(0, coalesce(seats_used, 0) - 1)
    where id = p_subscription_id;
  exception when undefined_column then
    null;
  end;
end;
$$;

-- Optional: grant execute to anon/authenticated roles (adjust to your policy)
-- grant execute on function public.assign_teacher_seat(uuid, uuid) to authenticated;
-- grant execute on function public.revoke_teacher_seat(uuid, uuid) to authenticated;
