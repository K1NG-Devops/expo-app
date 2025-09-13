-- Create Petty Cash Transactions Table
-- This table supports the Principal Hub petty cash management system

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preschool_id UUID NOT NULL REFERENCES preschools(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Stationery & Supplies',
    'Refreshments', 
    'Maintenance & Repairs',
    'Travel & Transport',
    'Communication',
    'Medical & First Aid',
    'Cleaning Supplies',
    'Utilities (small amounts)',
    'Emergency Expenses',
    'Replenishment',
    'Other'
  )),
  type TEXT NOT NULL CHECK (type IN ('expense', 'replenishment')),
  receipt_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(auth_user_id),
  approved_by UUID REFERENCES users(auth_user_id),
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Audit fields
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_petty_cash_preschool_id ON petty_cash_transactions(preschool_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_created_at ON petty_cash_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petty_cash_type ON petty_cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_petty_cash_status ON petty_cash_transactions(status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_category ON petty_cash_transactions(category);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_petty_cash_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_petty_cash_transactions_updated_at ON petty_cash_transactions;
CREATE TRIGGER update_petty_cash_transactions_updated_at
    BEFORE UPDATE ON petty_cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_transactions_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see transactions from their preschool
DROP POLICY IF EXISTS "Users can view petty cash from their preschool" ON petty_cash_transactions;
CREATE POLICY "Users can view petty cash from their preschool" ON petty_cash_transactions
    FOR SELECT 
    USING (
        preschool_id IN (
            SELECT preschool_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
            AND role IN ('principal_admin', 'teacher', 'staff')
        )
    );

-- Policy: Users can insert petty cash transactions for their preschool
DROP POLICY IF EXISTS "Users can create petty cash for their preschool" ON petty_cash_transactions;
CREATE POLICY "Users can create petty cash for their preschool" ON petty_cash_transactions
    FOR INSERT 
    WITH CHECK (
        preschool_id IN (
            SELECT preschool_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
            AND role IN ('principal_admin', 'teacher', 'staff')
        )
    );

-- Policy: Users can update petty cash transactions for their preschool
DROP POLICY IF EXISTS "Users can update petty cash for their preschool" ON petty_cash_transactions;
CREATE POLICY "Users can update petty cash for their preschool" ON petty_cash_transactions
    FOR UPDATE 
    USING (
        preschool_id IN (
            SELECT preschool_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
            AND role IN ('principal_admin', 'teacher', 'staff')
        )
    );

-- Policy: Only principals can delete petty cash transactions
DROP POLICY IF EXISTS "Principals can delete petty cash for their preschool" ON petty_cash_transactions;
CREATE POLICY "Principals can delete petty cash for their preschool" ON petty_cash_transactions
    FOR DELETE 
    USING (
        preschool_id IN (
            SELECT preschool_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
            AND role = 'principal_admin'
        )
    );

-- Add opening balance field to school_settings if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'opening_balance') THEN
        ALTER TABLE school_settings ADD COLUMN opening_balance DECIMAL(10,2) DEFAULT 5000.00;
    END IF;
END $$;

-- Add petty cash limit field to school_settings if it doesn't exist  
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'petty_cash_limit') THEN
        ALTER TABLE school_settings ADD COLUMN petty_cash_limit DECIMAL(10,2) DEFAULT 1000.00;
    END IF;
END $$;

-- Insert some sample petty cash data for existing preschools (optional)
INSERT INTO petty_cash_transactions (
    preschool_id,
    amount,
    description,
    category,
    type,
    created_by,
    created_at,
    status
) 
SELECT 
    p.id as preschool_id,
    50.00 as amount,
    'Office supplies - pens and paper' as description,
    'Stationery & Supplies' as category,
    'expense' as type,
    u.auth_user_id as created_by,
    NOW() - INTERVAL '2 days' as created_at,
    'approved' as status
FROM preschools p
JOIN users u ON u.preschool_id = p.id AND u.role = 'principal_admin'
WHERE NOT EXISTS (
    SELECT 1 FROM petty_cash_transactions WHERE preschool_id = p.id
)
LIMIT 5; -- Only add to first 5 schools to avoid too much sample data

COMMENT ON TABLE petty_cash_transactions IS 'Petty cash expense and replenishment tracking for Principal Hub';
COMMENT ON COLUMN petty_cash_transactions.type IS 'expense: money spent, replenishment: money added to petty cash';
COMMENT ON COLUMN petty_cash_transactions.status IS 'approved: transaction is processed, pending: awaiting approval, rejected: denied';