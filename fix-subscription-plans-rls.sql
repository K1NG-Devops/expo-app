-- Enable RLS on subscription_plans table
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;

-- Create policy to allow public read access to active subscription plans
CREATE POLICY "subscription_plans_public_read" 
ON public.subscription_plans 
FOR SELECT 
TO public 
USING (is_active = true);

-- Also allow authenticated users to read all plans (for admin interfaces)
DROP POLICY IF EXISTS "subscription_plans_authenticated_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_authenticated_read"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);
