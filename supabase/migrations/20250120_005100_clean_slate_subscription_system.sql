-- Clean slate subscription system migration
-- This migration completely rebuilds the subscription system to align with the tier system
-- Following WARP.md principles: proper migrations, no schema drift

-- ====================================================================
-- PART 1: CLEAN SLATE - Drop all existing subscription tables
-- ====================================================================

-- Drop tables in dependency order (most dependent first)
DROP TABLE IF EXISTS subscription_usage CASCADE;
DROP TABLE IF EXISTS subscription_events CASCADE;
DROP TABLE IF EXISTS subscription_payments CASCADE;
DROP TABLE IF EXISTS subscription_invoices CASCADE;
DROP TABLE IF EXISTS subscription_seats CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Drop any leftover sequences or types
DROP SEQUENCE IF EXISTS subscription_plans_id_seq CASCADE;
DROP SEQUENCE IF EXISTS subscriptions_id_seq CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS billing_frequency CASCADE;

-- ====================================================================
-- PART 2: REBUILD - Create new clean subscription schema
-- ====================================================================

-- Create enums for type safety
CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'premium', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid', 'trialing');
CREATE TYPE billing_frequency AS ENUM ('monthly', 'annual');

-- Subscription Plans Table (Master data)
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan identification
    name TEXT NOT NULL,
    tier subscription_tier NOT NULL UNIQUE,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_annual DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Limits
    max_teachers INTEGER NOT NULL DEFAULT 0, -- -1 means unlimited
    max_students INTEGER NOT NULL DEFAULT 0, -- -1 means unlimited
    max_schools INTEGER NOT NULL DEFAULT 1,
    
    -- Features and metadata
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    school_types TEXT[] NOT NULL DEFAULT ARRAY['preschool'],
    
    -- Status and ordering
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions Table (School subscriptions)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    school_id UUID NOT NULL REFERENCES preschools(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    -- Subscription details
    status subscription_status NOT NULL DEFAULT 'trialing',
    billing_frequency billing_frequency NOT NULL DEFAULT 'monthly',
    
    -- Dates
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    
    -- Usage tracking
    seats_total INTEGER NOT NULL DEFAULT 0,
    seats_used INTEGER NOT NULL DEFAULT 0,
    
    -- Payment integration
    payfast_token TEXT,
    payfast_payment_id TEXT,
    stripe_subscription_id TEXT, -- For future Stripe integration
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT subscriptions_seats_check CHECK (seats_used <= seats_total),
    CONSTRAINT subscriptions_end_date_check CHECK (end_date IS NULL OR end_date > start_date)
);

-- Subscription Usage Tracking (for AI, storage, etc.)
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES preschools(id) ON DELETE CASCADE,
    
    -- Usage metrics
    usage_type TEXT NOT NULL, -- 'ai_requests', 'storage_mb', 'api_calls', etc.
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER, -- NULL means unlimited
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure one record per subscription/type/period
    UNIQUE(subscription_id, usage_type, period_start)
);

-- ====================================================================
-- PART 3: INDEXES AND CONSTRAINTS
-- ====================================================================

-- Subscription Plans indexes
CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- Subscriptions indexes  
CREATE INDEX idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE next_billing_date IS NOT NULL;

-- Usage indexes
CREATE INDEX idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);
CREATE INDEX idx_subscription_usage_type ON subscription_usage(usage_type);
CREATE INDEX idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- ====================================================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Subscription Plans policies (public read, admin write)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only superadmins can manage subscription plans" ON subscription_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- Subscriptions policies (school-based access)
CREATE POLICY "Users can view their school's subscription" ON subscriptions
    FOR SELECT USING (
        school_id IN (
            SELECT preschool_id FROM profiles 
            WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Principals and superadmins can manage subscriptions" ON subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.role = 'superadmin' 
                OR (profiles.role = 'principal' AND profiles.preschool_id = school_id)
            )
        )
    );

-- Usage policies (school-based access)
CREATE POLICY "Users can view their school's usage" ON subscription_usage
    FOR SELECT USING (
        school_id IN (
            SELECT preschool_id FROM profiles 
            WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "System can manage usage tracking" ON subscription_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- ====================================================================
-- PART 5: TRIGGERS AND FUNCTIONS
-- ====================================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at BEFORE UPDATE ON subscription_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- PART 6: SEED DATA - Insert clean tier plans
-- ====================================================================

INSERT INTO subscription_plans (
    name, tier, description, 
    price_monthly, price_annual,
    max_teachers, max_students, max_schools,
    features, school_types,
    sort_order
) VALUES 
-- Free Tier
(
    'Free Plan',
    'free',
    'Perfect for getting started with basic school management',
    0, 0,
    2, 50, 1,
    '["Basic student management", "Simple attendance tracking", "Parent communication", "Basic reporting"]'::jsonb,
    ARRAY['preschool', 'primary', 'secondary'],
    1
),
-- Starter Tier
(
    'Starter Plan',
    'starter', 
    'Ideal for small schools looking to grow their capabilities',
    299, 2990,
    5, 150, 1,
    '["Everything in Free", "Advanced reporting", "Custom forms", "Bulk messaging", "Class scheduling", "Basic integrations"]'::jsonb,
    ARRAY['preschool', 'primary', 'secondary'],
    2
),
-- Premium Tier
(
    'Premium Plan',
    'premium',
    'Comprehensive solution for medium to large schools', 
    599, 5990,
    15, 500, 3,
    '["Everything in Starter", "Multi-school management", "Advanced analytics", "API access", "Custom branding", "Priority support", "Assessment tools"]'::jsonb,
    ARRAY['preschool', 'primary', 'secondary'],
    3
),
-- Enterprise Tier
(
    'Enterprise Plan',
    'enterprise',
    'Complete solution for large educational institutions',
    1299, 12990,
    -1, -1, -1, -- Unlimited
    '["Everything in Premium", "Unlimited users", "Custom integrations", "Dedicated support", "Training & onboarding", "SLA guarantee", "Advanced security"]'::jsonb,
    ARRAY['preschool', 'primary', 'secondary', 'higher_education'],
    4
);

-- ====================================================================
-- PART 7: MIGRATE EXISTING DATA
-- ====================================================================

-- Create free subscriptions for existing schools that don't have subscriptions
INSERT INTO subscriptions (school_id, plan_id, status, seats_total, seats_used)
SELECT 
    p.id as school_id,
    sp.id as plan_id,
    'active' as status,
    50 as seats_total,
    COALESCE((
        SELECT COUNT(*) 
        FROM profiles pr 
        WHERE pr.preschool_id = p.id 
        AND pr.role IN ('teacher', 'principal')
    ), 0) as seats_used
FROM preschools p
CROSS JOIN subscription_plans sp
WHERE sp.tier = 'free'
AND NOT EXISTS (
    SELECT 1 FROM subscriptions s2 
    WHERE s2.school_id = p.id
);

-- ====================================================================
-- PART 8: VERIFICATION QUERIES
-- ====================================================================

-- Verify the setup worked
DO $$
DECLARE
    plan_count INTEGER;
    subscription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM subscription_plans WHERE is_active = true;
    SELECT COUNT(*) INTO subscription_count FROM subscriptions;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '- Created % active subscription plans', plan_count;
    RAISE NOTICE '- Created % subscriptions for existing schools', subscription_count;
    
    IF plan_count != 4 THEN
        RAISE EXCEPTION 'Expected 4 subscription plans, got %', plan_count;
    END IF;
END
$$;