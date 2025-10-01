-- Debug Teaching Staff Issues
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check teachers table for your preschool
SELECT 
    t.id,
    t.user_id,
    t.email,
    t.first_name,
    t.last_name,
    t.is_active,
    t.preschool_id,
    t.subject_specialization,
    t.created_at
FROM teachers t
WHERE t.preschool_id = (
    SELECT preschool_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
)
ORDER BY t.created_at DESC;

-- 2. Check users table for teachers role
SELECT 
    u.id,
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    u.is_active,
    u.preschool_id,
    u.created_at
FROM users u
WHERE u.role = 'teacher'
  AND u.preschool_id = (
    SELECT preschool_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  )
ORDER BY u.created_at DESC;

-- 3. Check subscription_seats for teacher seats
SELECT 
    ss.id,
    ss.user_id,
    ss.subscription_id,
    ss.seat_role,
    ss.seat_status,
    ss.assigned_by,
    ss.assigned_at,
    ss.revoked_at,
    u.email as teacher_email,
    u.first_name,
    u.last_name
FROM subscription_seats ss
LEFT JOIN users u ON u.id = ss.user_id
WHERE ss.seat_role = 'teacher'
  AND ss.subscription_id IN (
    SELECT s.id 
    FROM subscriptions s
    WHERE s.preschool_id = (
        SELECT preschool_id 
        FROM users 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
  )
ORDER BY ss.assigned_at DESC;

-- 4. Check if there's a mismatch between teachers and users tables
SELECT 
    'Only in teachers' as source,
    t.email,
    t.first_name,
    t.last_name,
    t.is_active
FROM teachers t
LEFT JOIN users u ON u.email = t.email
WHERE u.id IS NULL
  AND t.preschool_id = (
    SELECT preschool_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  )
  
UNION ALL

SELECT 
    'Only in users' as source,
    u.email,
    u.first_name,
    u.last_name,
    u.is_active
FROM users u
LEFT JOIN teachers t ON t.email = u.email
WHERE t.id IS NULL
  AND u.role = 'teacher'
  AND u.preschool_id = (
    SELECT preschool_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );

-- 5. Summary counts
SELECT 
    'Teachers table' as source,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM teachers
WHERE preschool_id = (
    SELECT preschool_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
)

UNION ALL

SELECT 
    'Users table' as source,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM users
WHERE role = 'teacher'
  AND preschool_id = (
    SELECT preschool_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
