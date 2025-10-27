-- Comprehensive cleanup and setup migration
-- This will clean up all subscription-related data and set up a robust system

-- =============================================================================
-- PART 1: CLEAN UP SUBSCRIPTION-RELATED TABLES
-- =============================================================================

-- Clean up subscriptions table
DELETE FROM subscriptions WHERE true;

-- Clean up subscription_plans table completely
DELETE FROM subscription_plans WHERE true;

-- Clean up any plan-related data in preschools table
UPDATE preschools SET subscription_tier = 'free' WHERE subscription_tier IS NOT NULL;

-- =============================================================================
-- PART 2: SET UP ROBUST SUBSCRIPTION PLANS
-- =============================================================================

-- Insert Free Tier
INSERT INTO subscription_plans (
  id,
  name,
  tier,
  price_monthly,
  price_annual,
  max_teachers,
  max_students,
  features,
  is_active,
  school_types,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Free Plan',
  'free',
  0,
  0,
  2,
  30,
  '[
    "Basic student management",
    "Simple attendance tracking", 
    "Parent communication",
    "Basic reporting",
    "Mobile app access",
    "Basic invoicing"
  ]'::jsonb,
  true,
  ARRAY['preschool', 'k12_school', 'hybrid'],
  now(),
  now()
);

-- Insert Starter Tier  
INSERT INTO subscription_plans (
  id,
  name,
  tier,
  price_monthly,
  price_annual,
  max_teachers,
  max_students,
  features,
  is_active,
  school_types,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Starter Plan',
  'starter',
  299,
  2990,
  8,
  150,
  '[
    "All Free features",
    "Advanced student management",
    "Comprehensive attendance tracking",
    "Parent & teacher messaging",
    "Financial management",
    "Professional invoice generation",
    "Basic analytics & reports",
    "WhatsApp integration",
    "Payment tracking",
    "Petty cash management",
    "Email notifications",
    "Data backup"
  ]'::jsonb,
  true,
  ARRAY['preschool', 'k12_school', 'hybrid'],
  now(),
  now()
);

-- Insert Premium Tier
INSERT INTO subscription_plans (
  id,
  name,
  tier,
  price_monthly,
  price_annual,
  max_teachers,
  max_students,
  features,
  is_active,
  school_types,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Premium Plan',
  'premium',
  699,
  6990,
  25,
  500,
  '[
    "All Starter features",
    "Advanced analytics & reporting",
    "AI-powered insights",
    "Custom branding & themes",
    "Advanced financial reports",
    "Bulk operations & imports",
    "Data export capabilities",
    "Priority support",
    "Advanced WhatsApp features",
    "Multiple school locations",
    "Advanced user roles",
    "Custom invoice templates",
    "Advanced parent portal",
    "Academic performance tracking"
  ]'::jsonb,
  true,
  ARRAY['preschool', 'k12_school', 'hybrid'],
  now(),
  now()
);

-- Insert Enterprise Tier
INSERT INTO subscription_plans (
  id,
  name,
  tier,
  price_monthly,
  price_annual,
  max_teachers,
  max_students,
  features,
  is_active,
  school_types,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Enterprise Plan',
  'enterprise',
  0,
  0,
  999,
  9999,
  '[
    "All Premium features",
    "Unlimited users & students",
    "Custom integrations & APIs",
    "White-label solution",
    "Dedicated account manager",
    "Custom training & onboarding",
    "SLA guarantees",
    "Advanced security features",
    "Custom reporting & dashboards",
    "Multi-tenant architecture",
    "Custom development",
    "Integration with existing systems",
    "Advanced data analytics",
    "Custom mobile app branding"
  ]'::jsonb,
  true,
  ARRAY['preschool', 'k12_school', 'hybrid'],
  now(),
  now()
);

-- =============================================================================
-- PART 3: CLEAN UP TEST USERS (Keep only specified users)
-- =============================================================================

-- Get the IDs of users we want to keep
DO $$
DECLARE
    superadmin_id uuid;
    principal_id uuid;
    teacher_id uuid;
BEGIN
    -- Get superadmin ID
    SELECT id INTO superadmin_id FROM auth.users WHERE email = 'superadmin@edudashpro.org.za';
    
    -- Get principal ID  
    SELECT id INTO principal_id FROM auth.users WHERE email = 'elsha@youngeagles.org.za';
    
    -- Get teacher ID
    SELECT id INTO teacher_id FROM auth.users WHERE email = 'katso@youngeagles.org.za';
    
    -- Delete all other users from profiles first (to avoid foreign key issues)
    DELETE FROM profiles 
    WHERE id NOT IN (superadmin_id, principal_id, teacher_id)
    AND id IS NOT NULL;
    
    -- Delete all other auth users
    DELETE FROM auth.users 
    WHERE id NOT IN (superadmin_id, principal_id, teacher_id)
    AND id IS NOT NULL;
    
    RAISE NOTICE 'Cleaned up test users. Kept: %, %, %', superadmin_id, principal_id, teacher_id;
END $$;

-- =============================================================================
-- PART 4: CLEAN UP TEST DATA
-- =============================================================================

-- Remove Olivia and other test students
DELETE FROM students 
WHERE first_name = 'Olivia' 
   OR email ILIKE '%test%' 
   OR email ILIKE '%demo%';

-- Clean up any orphaned student enrollments
DELETE FROM student_enrollments 
WHERE student_id NOT IN (SELECT id FROM students);

-- Clean up any orphaned parent-child relationships
DELETE FROM parent_children 
WHERE student_id NOT IN (SELECT id FROM students);

-- Clean up orphaned messages
DELETE FROM messages 
WHERE sender_id NOT IN (SELECT id FROM profiles)
   OR recipient_id NOT IN (SELECT id FROM profiles);

-- Clean up orphaned teacher assignments
DELETE FROM teacher_assignments 
WHERE teacher_id NOT IN (SELECT id FROM profiles WHERE role = 'teacher');

-- =============================================================================
-- PART 5: SET UP YOUNG EAGLES PRESCHOOL PROPERLY
-- =============================================================================

-- Ensure Young Eagles preschool exists and is properly configured
INSERT INTO preschools (
  id,
  name, 
  email,
  phone,
  address,
  subscription_tier,
  school_type,
  is_active,
  capacity,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Young Eagles Preschool',
  'admin@youngeagles.org.za',
  '+27123456789',
  '123 Education Street, Cape Town, South Africa',
  'free',
  'preschool',
  true,
  100,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  subscription_tier = EXCLUDED.subscription_tier,
  school_type = EXCLUDED.school_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Update the principal and teacher profiles to be linked to Young Eagles
DO $$
DECLARE
    youngeagles_id uuid;
    principal_profile_id uuid;
    teacher_profile_id uuid;
BEGIN
    -- Get Young Eagles ID
    SELECT id INTO youngeagles_id FROM preschools WHERE email = 'admin@youngeagles.org.za';
    
    -- Get profile IDs
    SELECT id INTO principal_profile_id FROM auth.users WHERE email = 'elsha@youngeagles.org.za';
    SELECT id INTO teacher_profile_id FROM auth.users WHERE email = 'katso@youngeagles.org.za';
    
    -- Update principal profile
    UPDATE profiles SET 
      organization_id = youngeagles_id,
      role = 'principal',
      is_active = true,
      updated_at = now()
    WHERE id = principal_profile_id;
    
    -- Update teacher profile  
    UPDATE profiles SET
      organization_id = youngeagles_id,
      role = 'teacher', 
      is_active = true,
      updated_at = now()
    WHERE id = teacher_profile_id;
    
    RAISE NOTICE 'Updated profiles for Young Eagles: principal=%, teacher=%', principal_profile_id, teacher_profile_id;
END $$;

-- =============================================================================
-- PART 6: CREATE FREE SUBSCRIPTION FOR YOUNG EAGLES
-- =============================================================================

DO $$
DECLARE
    youngeagles_id uuid;
    free_plan_id uuid;
BEGIN
    -- Get Young Eagles and Free Plan IDs
    SELECT id INTO youngeagles_id FROM preschools WHERE email = 'admin@youngeagles.org.za';
    SELECT id INTO free_plan_id FROM subscription_plans WHERE tier = 'free';
    
    -- Create free subscription
    INSERT INTO subscriptions (
      id,
      school_id,
      plan_id,
      status,
      billing_cycle,
      seats_total,
      seats_used,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      youngeagles_id,
      free_plan_id,
      'active',
      'monthly',
      2,
      1, -- Principal + teacher
      now(),
      now() + interval '1 month',
      now(),
      now()
    );
    
    RAISE NOTICE 'Created free subscription for Young Eagles';
END $$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Show subscription plans
SELECT 
  tier,
  name,
  price_monthly,
  price_annual,
  max_teachers,
  max_students,
  jsonb_array_length(features) as feature_count,
  is_active
FROM subscription_plans 
WHERE is_active = true
ORDER BY 
  CASE tier 
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'premium' THEN 3
    WHEN 'enterprise' THEN 4
    ELSE 5
  END;

-- Show remaining users
SELECT 
  u.email,
  p.role,
  p.first_name,
  p.last_name,
  pr.name as school_name
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN preschools pr ON p.organization_id = pr.id
ORDER BY p.role, u.email;

-- Show subscriptions
SELECT 
  pr.name as school_name,
  sp.name as plan_name,
  s.status,
  s.seats_total,
  s.seats_used
FROM subscriptions s
JOIN preschools pr ON s.school_id = pr.id  
JOIN subscription_plans sp ON s.plan_id = sp.id;

-- Final summary
SELECT 
  'Cleanup and setup completed!' as status,
  (SELECT count(*) FROM subscription_plans WHERE is_active = true) as active_plans,
  (SELECT count(*) FROM auth.users) as total_users,
  (SELECT count(*) FROM students) as total_students,
  (SELECT count(*) FROM subscriptions) as active_subscriptions;