-- Add sample assignments data for testing teacher dashboard
-- Run this AFTER fixing assignments RLS

-- First, verify we can insert data by checking teacher info
SELECT 
  'Teacher Check' as section,
  id,
  email,
  role,
  preschool_id
FROM public.users
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- Create sample assignments for the teacher
-- Using proper UUID casting and matching the table structure
INSERT INTO public.assignments (
  id,
  teacher_id,
  preschool_id,
  title,
  description,
  due_date,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid,
  u.preschool_id,
  'Math Practice: Counting 1-20',
  'Count objects and write the numbers from 1 to 20',
  CURRENT_DATE + INTERVAL '7 days',
  'active',
  NOW(),
  NOW()
FROM public.users u
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid

UNION ALL

SELECT 
  gen_random_uuid(),
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid,
  u.preschool_id,
  'Reading Time: Animal Sounds',
  'Read about different animals and practice the sounds they make',
  CURRENT_DATE + INTERVAL '5 days',
  'active',
  NOW(),
  NOW()
FROM public.users u
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid

UNION ALL

SELECT 
  gen_random_uuid(),
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid,
  u.preschool_id,
  'Art Project: Draw Your Family',
  'Draw a picture of your family members and color it',
  CURRENT_DATE + INTERVAL '3 days',
  'draft',
  NOW(),
  NOW()
FROM public.users u
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- Verify assignments were created
SELECT 
  'Created Assignments' as section,
  id,
  title,
  teacher_id,
  preschool_id,
  status,
  due_date
FROM public.assignments
WHERE teacher_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
ORDER BY created_at DESC;