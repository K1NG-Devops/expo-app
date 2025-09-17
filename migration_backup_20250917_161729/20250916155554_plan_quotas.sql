-- Seed plan quotas for AI features across tiers (idempotent)
-- Unique version 20250916a to avoid conflicts with existing remote history

begin;

create or replace function public.upsert_plan_quota(
  p_plan_tier text,
  p_quota_type text,
  p_monthly_limit integer,
  p_overage_enabled boolean,
  p_overage_unit_price numeric
) returns void
language plpgsql
as $$
begin
  if exists (
    select 1 from public.plan_quotas where plan_tier = p_plan_tier and quota_type = p_quota_type
  ) then
    update public.plan_quotas
      set monthly_limit = p_monthly_limit,
          overage_enabled = p_overage_enabled,
          overage_unit_price = p_overage_unit_price,
          updated_at = now()
      where plan_tier = p_plan_tier and quota_type = p_quota_type;
  else
    insert into public.plan_quotas(
      id, plan_tier, quota_type, monthly_limit, overage_enabled, overage_unit_price, created_at, updated_at
    ) values (
      gen_random_uuid(), p_plan_tier, p_quota_type, p_monthly_limit, p_overage_enabled, p_overage_unit_price, now(), now()
    );
  end if;
end;
$$;

-- Defaults
select public.upsert_plan_quota('free', 'lesson_generation', 10, false, 0);
select public.upsert_plan_quota('free', 'homework_help', 20, false, 0);
select public.upsert_plan_quota('free', 'grading_assistance', 20, false, 0);

select public.upsert_plan_quota('starter', 'lesson_generation', 100, true, 0.05);
select public.upsert_plan_quota('starter', 'homework_help', 200, true, 0.03);
select public.upsert_plan_quota('starter', 'grading_assistance', 200, true, 0.03);

select public.upsert_plan_quota('premium', 'lesson_generation', 500, true, 0.04);
select public.upsert_plan_quota('premium', 'homework_help', 1000, true, 0.025);
select public.upsert_plan_quota('premium', 'grading_assistance', 1000, true, 0.025);

select public.upsert_plan_quota('enterprise', 'lesson_generation', 1000000, true, 0.02);
select public.upsert_plan_quota('enterprise', 'homework_help', 1000000, true, 0.02);
select public.upsert_plan_quota('enterprise', 'grading_assistance', 1000000, true, 0.02);

commit;
