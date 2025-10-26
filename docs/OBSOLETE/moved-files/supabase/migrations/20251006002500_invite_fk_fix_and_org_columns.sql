-- 2025-10-06: Fix invitation FK and ensure organizations columns exist (no resets)

-- 1) Adjust invited_by foreign key to reference profiles(id) instead of users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'school_invitation_codes_invited_by_fkey'
      AND table_name = 'school_invitation_codes'
      AND table_schema = 'public'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.school_invitation_codes
      DROP CONSTRAINT school_invitation_codes_invited_by_fkey;
  END IF;
END$$;

-- Null out invited_by values without a matching profile to avoid FK violations
UPDATE public.school_invitation_codes sic
SET invited_by = NULL
WHERE invited_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = sic.invited_by
  );

ALTER TABLE public.school_invitation_codes
  ADD CONSTRAINT school_invitation_codes_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES public.profiles(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- 2) Ensure organizations has needed columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Null out created_by values without a matching profile before adding FK
UPDATE public.organizations o
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = o.created_by
  );

-- Link created_by to profiles.id (best effort)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organizations_created_by_fkey'
      AND table_name = 'organizations'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END$$;
