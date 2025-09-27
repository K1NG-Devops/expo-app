-- Debug script to check subscription tiers in database
-- Run this to understand why AI Quota Management shows ENTERPRISE instead of STARTER

-- Check preschools table structure and data
SELECT 
  id,
  name,
  subscription_tier,
  subscription_plan,
  is_active,
  created_at
FROM preschools
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- Check subscriptions table and their plans
SELECT 
  s.id as subscription_id,
  s.preschool_id,
  s.status,
  sp.name as plan_name,
  sp.tier as plan_tier,
  sp.price_monthly,
  s.created_at
FROM subscriptions s
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.status = 'active'
ORDER BY s.created_at DESC
LIMIT 5;

-- Check subscription plans available
SELECT 
  id,
  name,
  tier,
  price_monthly,
  is_active,
  created_at
FROM subscription_plans
WHERE is_active = true
ORDER BY 
  CASE tier 
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'basic' THEN 3
    WHEN 'premium' THEN 4
    WHEN 'pro' THEN 5
    WHEN 'enterprise' THEN 6
    ELSE 7
  END;

-- Check combined view - what the allocation logic would see
SELECT 
  p.id as preschool_id,
  p.name as school_name,
  p.subscription_tier as school_tier,
  s.status as subscription_status,
  sp.name as plan_name,
  sp.tier as plan_tier,
  COALESCE(sp.tier, p.subscription_tier, 'free') as effective_tier
FROM preschools p
LEFT JOIN subscriptions s ON s.preschool_id = p.id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE p.is_active = true
ORDER BY p.created_at DESC
LIMIT 10;