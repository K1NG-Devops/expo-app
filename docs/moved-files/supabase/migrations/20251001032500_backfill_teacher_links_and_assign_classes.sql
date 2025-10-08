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

BEGIN;

-- 1) Backfill teachers.user_id by joining users on email + preschool_id (case-insensitive email match)
UPDATE public.teachers t
SET user_id = u.id
FROM public.users AS u
WHERE
  t.user_id IS NULL
  AND t.email IS NOT NULL
  AND lower(t.email) = lower(u.email)
  AND t.preschool_id = u.preschool_id;

-- 2) Assign unassigned active classes to the only active teacher in that preschool
--    This establishes a sensible default so per-teacher stats align with school overview totals.
WITH one_active_teacher AS (
  SELECT
    preschool_id,
    (array_agg(user_id))[1] AS user_id  -- exactly one active teacher; any single aggregate works
  FROM public.teachers
  WHERE
    is_active IS TRUE
    AND user_id IS NOT NULL
  GROUP BY preschool_id
  HAVING count(*) = 1
)

UPDATE public.classes c
SET
  teacher_id = o.user_id,
  updated_at = now()
FROM one_active_teacher AS o
WHERE
  c.teacher_id IS NULL
  AND (c.is_active IS TRUE OR c.is_active IS NULL)
  AND c.preschool_id = o.preschool_id;

COMMIT;
