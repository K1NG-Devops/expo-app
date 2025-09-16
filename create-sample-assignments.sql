-- Create sample assignment data to test the teacher dashboard
-- This will populate the empty assignments table with test data

BEGIN;

-- First, let's get the current teacher's info
-- Teacher ID from the error: 48f8086a-3c88-44a2-adcd-570d97d3a580

-- Get the teacher's preschool_id
WITH teacher_info AS (
  SELECT 
    id,
    preschool_id,
    role
  FROM public.users 
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
)
-- Insert sample assignments for this teacher
INSERT INTO public.assignments (
  id,
  teacher_id,
  preschool_id,
  title,
  description,
  due_date,
  status,
  created_at,
  updated_at,
  class_id,
  category_id
)
SELECT 
  gen_random_uuid() as id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid as teacher_id,
  t.preschool_id,
  'Sample Math Assignment' as title,
  'Practice counting numbers 1-10' as description,
  CURRENT_DATE + INTERVAL '7 days' as due_date,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at,
  NULL as class_id,  -- We'll set this properly if classes exist
  NULL as category_id
FROM teacher_info t
WHERE t.preschool_id IS NOT NULL

UNION ALL

SELECT 
  gen_random_uuid() as id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid as teacher_id,
  t.preschool_id,
  'Reading Exercise' as title,
  'Read the story about animals' as description,
  CURRENT_DATE + INTERVAL '5 days' as due_date,
  'active' as status,
  NOW() as created_at,
  NOW() as updated_at,
  NULL as class_id,
  NULL as category_id
FROM teacher_info t
WHERE t.preschool_id IS NOT NULL

UNION ALL

SELECT 
  gen_random_uuid() as id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid as teacher_id,
  t.preschool_id,
  'Art Project' as title,
  'Draw your favorite animal' as description,
  CURRENT_DATE + INTERVAL '3 days' as due_date,
  'draft' as status,
  NOW() as created_at,
  NOW() as updated_at,
  NULL as class_id,
  NULL as category_id
FROM teacher_info t
WHERE t.preschool_id IS NOT NULL;

COMMIT;

-- Check if assignments were created
SELECT 
  id,
  title,
  teacher_id,
  preschool_id,
  status,
  due_date
FROM public.assignments 
WHERE teacher_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid

-- This should now allow the teacher dashboard to load assignment data successfully