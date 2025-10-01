-- Backfill teacher <-> user links and assign unassigned classes in single-teacher schools
-- Rule compliance:
-- - No direct dashboard SQL: this is a migration file under supabase/migrations
-- - No local docker: apply via `supabase db push` (remote)
-- - Lint with sqlfluff before push
--
-- Summary:
-- 1) Link teachers.user_id to users.id by email within the same preschool (idempotent)
-- 2) Assign classes.teacher_id for unassigned active classes in preschools that have exactly one active teacher
--
-- Safety:
-- - All updates are scoped by tenant (preschool_id)
-- - No schema changes; data backfill only
-- - Idempotent: re-running causes no harm

begin;

-- 1) Backfill teachers.user_id by joining users on email + preschool_id (case-insensitive email match)
update public.teachers t
set user_id = u.id
from public.users u
where t.user_id is null
  and t.email is not null
  and lower(t.email) = lower(u.email)
  and t.preschool_id = u.preschool_id;

-- 2) Assign unassigned active classes to the only active teacher in that preschool
--    This establishes a sensible default so per-teacher stats align with school overview totals.
with one_active_teacher as (
  select preschool_id,
         (array_agg(user_id))[1] as user_id  -- exactly one active teacher; any single aggregate works
  from public.teachers
  where is_active is true
    and user_id is not null
  group by preschool_id
  having count(*) = 1
)
update public.classes c
set teacher_id = o.user_id,
    updated_at = now()
from one_active_teacher o
where c.teacher_id is null
  and (c.is_active is true or c.is_active is null)
  and c.preschool_id = o.preschool_id;

commit;
