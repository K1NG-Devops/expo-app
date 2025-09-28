-- Seed basic subscription plans if they don't exist
-- This ensures the pricing page has data to display

-- First, check and insert plans that don't exist
INSERT INTO public.subscription_plans (name, tier, price_monthly, price_annual, max_teachers, max_students, features, is_active)
SELECT * FROM (VALUES
  ('Free', 'free', 0, 0, 3, 50, '["Basic dashboard", "Student management", "Parent communication", "Email support"]'::jsonb, true),
  ('Starter', 'starter', 49, 490, 5, 100, '["Advanced dashboard", "AI-powered insights", "Priority support", "Parent portal"]'::jsonb, true),
  ('Basic', 'basic', 299, 2990, 10, 200, '["Full feature set", "Advanced analytics", "Multi-teacher support", "WhatsApp integration"]'::jsonb, true),
  ('Premium', 'premium', 499, 4990, 20, 400, '["Premium features", "Advanced reporting", "Priority support", "Custom branding"]'::jsonb, true),
  ('Pro', 'pro', 899, 8990, 50, 800, '["All features", "Custom integrations", "Dedicated support", "Multi-school management"]'::jsonb, true),
  ('Enterprise', 'enterprise', 1999, 19990, 100, 2000, '["Unlimited features", "Custom integrations", "Dedicated success manager", "SLA guarantee", "White-label solution"]'::jsonb, true)
) AS new_plans(name, tier, price_monthly, price_annual, max_teachers, max_students, features, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans 
  WHERE subscription_plans.tier = new_plans.tier
);