-- Create table for RevenueCat webhook event logging
CREATE TABLE IF NOT EXISTS revenuecat_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  app_user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'PRODUCTION',
  raw JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_app_user_id ON revenuecat_webhook_events (app_user_id);
CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_type ON revenuecat_webhook_events (type);
CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_created_at ON revenuecat_webhook_events (created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role access
CREATE POLICY IF NOT EXISTS "Service role can access all revenuecat webhook events" 
ON revenuecat_webhook_events FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

COMMENT ON TABLE revenuecat_webhook_events IS 'Logs RevenueCat webhook events for subscription management and auditing';
