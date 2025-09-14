-- Create Financial Management Tables for EduDash Pro
-- This migration creates all tables needed for comprehensive financial management

-- ============================================================================
-- MAIN FINANCIAL TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    
    -- Transaction details
    type TEXT NOT NULL CHECK (type IN ('fee_payment', 'expense', 'refund', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    reference_number TEXT, -- Invoice number, receipt number, etc.
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    -- Payment details (for fee payments)
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'eft', 'card', 'mobile_payment', 'cheque', 'other')),
    payment_reference TEXT, -- Bank reference, card last 4 digits, etc.
    
    -- Expense details (for expenses)
    expense_category_id UUID, -- Will reference expense_categories table
    vendor_name TEXT,
    receipt_image_path TEXT,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- EXPENSE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1', -- Hex color for UI
    icon TEXT DEFAULT 'receipt', -- Icon name for UI
    
    -- Budget tracking
    monthly_budget DECIMAL(10,2) DEFAULT 0.00,
    yearly_budget DECIMAL(10,2) DEFAULT 0.00,
    
    -- Settings
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(preschool_id, name)
);

-- ============================================================================
-- FEE STRUCTURES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- e.g., "Monthly Tuition", "Registration Fee", "Activity Fee"
    description TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    
    -- Fee type and frequency
    fee_type TEXT NOT NULL CHECK (fee_type IN ('tuition', 'registration', 'activity', 'transport', 'meals', 'uniform', 'other')),
    frequency TEXT NOT NULL CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'yearly')),
    
    -- Applicability
    grade_levels TEXT[], -- Array of grade levels this fee applies to
    mandatory BOOLEAN DEFAULT true,
    
    -- Timing
    due_day INTEGER DEFAULT 1, -- Day of month/period when due
    late_fee_amount DECIMAL(10,2) DEFAULT 0.00,
    late_fee_days INTEGER DEFAULT 7, -- Days after due date before late fee applies
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(preschool_id, name)
);

-- ============================================================================
-- STUDENT FEES (INDIVIDUAL FEE ASSIGNMENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
    
    -- Override amounts (if different from fee structure)
    amount DECIMAL(10,2), -- NULL means use fee_structure amount
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL, -- Calculated amount after discounts
    
    -- Due date tracking
    due_date DATE,
    paid_date DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'waived')),
    
    -- Payment tracking
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    amount_outstanding DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, fee_structure_id, due_date)
);

-- ============================================================================
-- PAYMENT REMINDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE,
    
    -- Reminder details
    type TEXT NOT NULL CHECK (type IN ('upcoming_due', 'overdue', 'final_notice')),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    
    -- Communication
    sent_to TEXT NOT NULL, -- Email address or phone number
    communication_method TEXT NOT NULL CHECK (communication_method IN ('email', 'sms', 'whatsapp', 'in_app')),
    message_content TEXT NOT NULL,
    subject TEXT,
    
    -- Tracking
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'opened')),
    
    -- Response tracking
    parent_response TEXT, -- If parent replies
    response_received_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID NOT NULL REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- SCHOOL SETTINGS TABLE (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    -- Financial settings
    currency TEXT DEFAULT 'ZAR',
    late_fee_percentage DECIMAL(5,2) DEFAULT 5.00,
    grace_period_days INTEGER DEFAULT 7,
    
    -- Petty cash settings
    petty_cash_limit DECIMAL(10,2) DEFAULT 1000.00,
    opening_balance DECIMAL(10,2) DEFAULT 5000.00,
    
    -- Payment settings
    accepted_payment_methods TEXT[] DEFAULT ARRAY['cash', 'bank_transfer', 'eft'],
    payment_terms TEXT DEFAULT 'Payment due by the 5th of each month',
    
    -- Notification settings
    send_reminders BOOLEAN DEFAULT true,
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1], -- Days before due date
    reminder_days_after INTEGER[] DEFAULT ARRAY[1, 7, 14], -- Days after due date
    
    -- Banking details (for payment references)
    bank_name TEXT,
    account_holder TEXT,
    account_number TEXT,
    branch_code TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Settings stored as JSON for flexibility
    additional_settings JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(preschool_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Financial transactions indexes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_preschool_id ON public.financial_transactions(preschool_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_student_id ON public.financial_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at ON public.financial_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_amount ON public.financial_transactions(amount);

-- Expense categories indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_preschool_id ON public.expense_categories(preschool_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(is_active);

-- Fee structures indexes
CREATE INDEX IF NOT EXISTS idx_fee_structures_preschool_id ON public.fee_structures(preschool_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_type ON public.fee_structures(fee_type);
CREATE INDEX IF NOT EXISTS idx_fee_structures_active ON public.fee_structures(is_active);

-- Student fees indexes
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON public.student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON public.student_fees(status);
CREATE INDEX IF NOT EXISTS idx_student_fees_due_date ON public.student_fees(due_date);

-- Payment reminders indexes
CREATE INDEX IF NOT EXISTS idx_payment_reminders_preschool_id ON public.payment_reminders(preschool_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_student_id ON public.payment_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON public.payment_reminders(sent_at DESC);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key from financial_transactions to expense_categories
ALTER TABLE public.financial_transactions 
ADD CONSTRAINT fk_financial_transactions_expense_category
FOREIGN KEY (expense_category_id) REFERENCES public.expense_categories(id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON public.financial_transactions;
CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fee_structures_updated_at ON public.fee_structures;
CREATE TRIGGER update_fee_structures_updated_at
    BEFORE UPDATE ON public.fee_structures
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_fees_updated_at ON public.student_fees;
CREATE TRIGGER update_student_fees_updated_at
    BEFORE UPDATE ON public.student_fees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_school_settings_updated_at ON public.school_settings;
CREATE TRIGGER update_school_settings_updated_at
    BEFORE UPDATE ON public.school_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Financial transactions policies
DROP POLICY IF EXISTS "Users can view financial transactions from their preschool" ON public.financial_transactions;
CREATE POLICY "Users can view financial transactions from their preschool" ON public.financial_transactions
    FOR SELECT USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role IN ('principal_admin', 'teacher', 'staff')
        )
        OR 
        (type = 'fee_payment' AND student_id IN (
            SELECT id FROM public.students 
            WHERE parent_id = auth.uid() OR guardian_id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Users can create financial transactions for their preschool" ON public.financial_transactions;
CREATE POLICY "Users can create financial transactions for their preschool" ON public.financial_transactions
    FOR INSERT WITH CHECK (
        preschool_id IN (
            SELECT preschool_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role IN ('principal_admin', 'teacher', 'staff')
        )
    );

-- Expense categories policies
DROP POLICY IF EXISTS "Users can manage expense categories for their preschool" ON public.expense_categories;
CREATE POLICY "Users can manage expense categories for their preschool" ON public.expense_categories
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role IN ('principal_admin', 'teacher', 'staff')
        )
    );

-- Fee structures policies
DROP POLICY IF EXISTS "Users can manage fee structures for their preschool" ON public.fee_structures;
CREATE POLICY "Users can manage fee structures for their preschool" ON public.fee_structures
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role IN ('principal_admin', 'teacher')
        )
    );

-- Student fees policies
DROP POLICY IF EXISTS "Users can view relevant student fees" ON public.student_fees;
CREATE POLICY "Users can view relevant student fees" ON public.student_fees
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM public.students s
            JOIN public.users u ON u.preschool_id = s.preschool_id
            WHERE u.auth_user_id = auth.uid() AND u.role IN ('principal_admin', 'teacher', 'staff')
        )
        OR
        student_id IN (
            SELECT id FROM public.students 
            WHERE parent_id = auth.uid() OR guardian_id = auth.uid()
        )
    );

-- Payment reminders policies
DROP POLICY IF EXISTS "Users can manage payment reminders for their preschool" ON public.payment_reminders;
CREATE POLICY "Users can manage payment reminders for their preschool" ON public.payment_reminders
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role IN ('principal_admin', 'teacher', 'staff')
        )
    );

-- School settings policies
DROP POLICY IF EXISTS "Users can manage settings for their preschool" ON public.school_settings;
CREATE POLICY "Users can manage settings for their preschool" ON public.school_settings
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'principal_admin'
        )
    );

-- ============================================================================
-- DEFAULT DATA SETUP
-- ============================================================================

-- Insert default expense categories for existing preschools
INSERT INTO public.expense_categories (preschool_id, name, description, color, icon, created_by)
SELECT 
    p.id as preschool_id,
    category_data.name,
    category_data.description,
    category_data.color,
    category_data.icon,
    u.auth_user_id as created_by
FROM public.preschools p
CROSS JOIN (VALUES 
    ('Teaching Materials', 'Books, stationery, educational supplies', '#3b82f6', 'library'),
    ('Utilities', 'Electricity, water, internet, phone bills', '#f59e0b', 'flash'),
    ('Maintenance', 'Building repairs, equipment servicing', '#10b981', 'construct'),
    ('Staff Expenses', 'Travel, training, refreshments', '#6366f1', 'people'),
    ('Food & Catering', 'Student meals, snacks, kitchen supplies', '#ef4444', 'restaurant'),
    ('Transport', 'Fuel, vehicle maintenance, transport costs', '#8b5cf6', 'car'),
    ('Marketing', 'Advertising, promotional materials', '#ec4899', 'megaphone'),
    ('Administration', 'Office supplies, printing, communication', '#6b7280', 'filing'),
    ('Health & Safety', 'First aid, cleaning supplies, security', '#059669', 'shield-checkmark'),
    ('Other', 'Miscellaneous expenses', '#9ca3af', 'ellipsis-horizontal')
) AS category_data(name, description, color, icon)
JOIN public.users u ON u.preschool_id = p.id AND u.role = 'principal_admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.expense_categories ec 
    WHERE ec.preschool_id = p.id AND ec.name = category_data.name
)
ON CONFLICT (preschool_id, name) DO NOTHING;

-- Insert default fee structures for existing preschools
INSERT INTO public.fee_structures (preschool_id, name, description, amount, fee_type, frequency, created_by)
SELECT 
    p.id as preschool_id,
    fee_data.name,
    fee_data.description,
    fee_data.amount,
    fee_data.fee_type,
    fee_data.frequency,
    u.auth_user_id as created_by
FROM public.preschools p
CROSS JOIN (VALUES 
    ('Monthly Tuition', 'Regular monthly school fees', 1500.00, 'tuition', 'monthly'),
    ('Registration Fee', 'One-time registration fee for new students', 500.00, 'registration', 'one_time'),
    ('Activity Fee', 'Quarterly fee for extracurricular activities', 300.00, 'activity', 'quarterly'),
    ('Uniform Fee', 'School uniform and accessories', 200.00, 'uniform', 'one_time')
) AS fee_data(name, description, amount, fee_type, frequency)
JOIN public.users u ON u.preschool_id = p.id AND u.role = 'principal_admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.fee_structures fs 
    WHERE fs.preschool_id = p.id AND fs.name = fee_data.name
)
ON CONFLICT (preschool_id, name) DO NOTHING;

-- Insert default school settings for existing preschools
INSERT INTO public.school_settings (
    preschool_id, 
    currency, 
    late_fee_percentage, 
    grace_period_days,
    petty_cash_limit,
    opening_balance,
    updated_by
)
SELECT 
    p.id as preschool_id,
    'ZAR' as currency,
    5.00 as late_fee_percentage,
    7 as grace_period_days,
    1000.00 as petty_cash_limit,
    5000.00 as opening_balance,
    u.auth_user_id as updated_by
FROM public.preschools p
JOIN public.users u ON u.preschool_id = p.id AND u.role = 'principal_admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.school_settings ss WHERE ss.preschool_id = p.id
)
ON CONFLICT (preschool_id) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.financial_transactions IS 'Main financial transactions table for all money movements';
COMMENT ON TABLE public.expense_categories IS 'Categories for organizing and budgeting expenses';
COMMENT ON TABLE public.fee_structures IS 'Template fee structures that can be assigned to students';
COMMENT ON TABLE public.student_fees IS 'Individual fee assignments and payment tracking per student';
COMMENT ON TABLE public.payment_reminders IS 'Track payment reminders sent to parents';
COMMENT ON TABLE public.school_settings IS 'Financial and administrative settings per preschool';

COMMENT ON COLUMN public.financial_transactions.type IS 'Type of transaction: fee_payment, expense, refund, adjustment';
COMMENT ON COLUMN public.financial_transactions.status IS 'Transaction status: pending, completed, failed, cancelled';
COMMENT ON COLUMN public.student_fees.status IS 'Fee status: pending, partially_paid, paid, overdue, waived';
COMMENT ON COLUMN public.fee_structures.frequency IS 'How often the fee is charged: one_time, monthly, quarterly, yearly';