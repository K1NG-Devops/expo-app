-- ============================================================================
-- POP (PROOF OF PAYMENT) AND APPROVAL WORKFLOW SYSTEM
-- ============================================================================
-- This migration creates comprehensive approval workflows for:
-- 1. Parent payment proof submissions (POP)
-- 2. Teacher petty cash request approvals
-- 3. Principal review and approval system
-- 4. Receipt verification and matching

-- ============================================================================
-- PROOF OF PAYMENTS (POP) TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proof_of_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    
    -- Parent/Guardian information
    submitted_by UUID NOT NULL REFERENCES auth.users(id), -- Parent's user ID
    parent_name TEXT NOT NULL,
    parent_email TEXT,
    parent_phone TEXT,
    
    -- Payment details
    payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'eft', 'cash', 'cheque', 'mobile_payment', 'card', 'other')),
    payment_reference TEXT, -- Bank reference, transaction ID, etc.
    bank_name TEXT,
    account_number_last_4 TEXT, -- Last 4 digits for verification
    
    -- What this payment is for
    payment_purpose TEXT NOT NULL, -- "January School Fees", "Registration Fee", etc.
    fee_type TEXT CHECK (fee_type IN ('tuition', 'registration', 'activity', 'transport', 'meals', 'uniform', 'other')),
    month_year TEXT, -- "2025-01" format for monthly fees
    
    -- Proof documentation
    receipt_image_path TEXT, -- Main receipt/proof image
    bank_statement_path TEXT, -- Optional bank statement snippet
    additional_documents TEXT[], -- Array of additional document paths
    
    -- Approval workflow
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted',     -- Just submitted by parent
        'under_review',  -- Principal is reviewing
        'approved',      -- Approved by principal
        'rejected',      -- Rejected by principal
        'requires_info', -- More information needed
        'matched'        -- Approved and matched with school records
    )),
    
    -- Principal review
    reviewed_by UUID REFERENCES auth.users(id), -- Principal/admin who reviewed
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    rejection_reason TEXT,
    
    -- Auto-matching with school records
    matched_payment_id UUID REFERENCES public.payments(id), -- If matched with existing payment record
    auto_matched BOOLEAN DEFAULT FALSE,
    matching_confidence DECIMAL(3,2), -- 0.00 to 1.00 confidence score
    
    -- Status tracking
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    
    -- Parent notifications
    last_notification_sent TIMESTAMPTZ,
    notification_count INTEGER DEFAULT 0,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- PETTY CASH APPROVAL REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.petty_cash_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    -- Requestor information
    requested_by UUID NOT NULL REFERENCES auth.users(id), -- Teacher/staff requesting
    requestor_name TEXT NOT NULL,
    requestor_role TEXT NOT NULL, -- 'teacher', 'admin', etc.
    
    -- Request details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL, -- From expense categories
    description TEXT NOT NULL,
    justification TEXT NOT NULL, -- Why this expense is needed
    urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    
    -- Budget validation
    budget_category_id UUID REFERENCES public.expense_categories(id),
    estimated_total_cost DECIMAL(10,2), -- If this is part of larger expense
    
    -- Approval workflow
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Awaiting principal approval
        'approved',          -- Approved by principal
        'rejected',          -- Rejected by principal
        'requires_info',     -- More information needed
        'disbursed',         -- Money given to requestor
        'completed',         -- Expense completed with receipt
        'cancelled'          -- Cancelled by requestor or admin
    )),
    
    -- Principal approval
    approved_by UUID REFERENCES auth.users(id), -- Principal who approved/rejected
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    rejection_reason TEXT,
    approved_amount DECIMAL(10,2), -- May be different from requested amount
    
    -- Disbursement tracking
    disbursed_by UUID REFERENCES auth.users(id),
    disbursed_at TIMESTAMPTZ,
    disbursement_method TEXT CHECK (disbursement_method IN ('cash', 'bank_transfer', 'petty_cash_float')),
    
    -- Receipt requirements
    receipt_required BOOLEAN DEFAULT TRUE,
    receipt_deadline DATE, -- When receipt must be submitted
    receipt_submitted BOOLEAN DEFAULT FALSE,
    receipt_image_path TEXT,
    actual_amount_spent DECIMAL(10,2),
    
    -- Change/refund tracking
    change_amount DECIMAL(10,2) DEFAULT 0.00,
    change_returned BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    needed_by DATE, -- When the expense is needed
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- APPROVAL WORKFLOW LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.approval_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    -- What was approved/rejected
    entity_type TEXT NOT NULL CHECK (entity_type IN ('proof_of_payment', 'petty_cash_request', 'expense', 'payment')),
    entity_id UUID NOT NULL, -- ID of the POP, petty cash request, etc.
    
    -- Who performed the action
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performer_name TEXT NOT NULL,
    performer_role TEXT NOT NULL,
    
    -- What action was taken
    action TEXT NOT NULL CHECK (action IN ('submit', 'review', 'approve', 'reject', 'request_info', 'resubmit', 'cancel')),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    
    -- Details
    notes TEXT,
    reason TEXT, -- For rejections or requests for more info
    
    -- Notifications sent
    notifications_sent TEXT[], -- Array of notification types sent
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- RECEIPT VERIFICATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.receipt_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    -- What receipt this is for
    entity_type TEXT NOT NULL CHECK (entity_type IN ('proof_of_payment', 'petty_cash_request', 'expense')),
    entity_id UUID NOT NULL,
    
    -- Receipt details
    receipt_image_path TEXT NOT NULL,
    original_filename TEXT,
    file_size INTEGER,
    file_type TEXT,
    
    -- OCR and processing results
    ocr_text TEXT, -- Extracted text from receipt
    extracted_amount DECIMAL(10,2), -- Amount extracted from receipt
    extracted_date DATE, -- Date extracted from receipt
    extracted_vendor TEXT, -- Vendor/store name extracted
    
    -- Verification status
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
        'pending',      -- Not yet processed
        'processing',   -- OCR/analysis in progress
        'verified',     -- Receipt looks valid
        'suspicious',   -- Potential issues detected
        'rejected',     -- Receipt rejected
        'manual_review' -- Needs human review
    )),
    
    -- Verification results
    amount_matches BOOLEAN,
    date_reasonable BOOLEAN,
    vendor_recognized BOOLEAN,
    quality_score DECIMAL(3,2), -- 0.00 to 1.00 image quality
    
    -- Manual review
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    
    -- Processing timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- APPROVAL NOTIFICATION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.approval_notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    
    -- Template identification
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp', 'in_app'
    trigger_event TEXT NOT NULL, -- 'pop_submitted', 'pop_approved', 'petty_cash_rejected', etc.
    
    -- Template content
    subject TEXT, -- For emails
    message_template TEXT NOT NULL, -- Can include {{variables}}
    
    -- When to send
    send_immediately BOOLEAN DEFAULT TRUE,
    delay_hours INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(preschool_id, trigger_event, type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Proof of payments indexes
CREATE INDEX IF NOT EXISTS idx_proof_of_payments_preschool ON public.proof_of_payments(preschool_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_payments_student ON public.proof_of_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_payments_status ON public.proof_of_payments(status);
CREATE INDEX IF NOT EXISTS idx_proof_of_payments_submitted_by ON public.proof_of_payments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_proof_of_payments_submitted_at ON public.proof_of_payments(submitted_at);

-- Petty cash requests indexes
CREATE INDEX IF NOT EXISTS idx_petty_cash_requests_preschool ON public.petty_cash_requests(preschool_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_requests_requested_by ON public.petty_cash_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_petty_cash_requests_status ON public.petty_cash_requests(status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_requests_requested_at ON public.petty_cash_requests(requested_at);

-- Approval logs indexes
CREATE INDEX IF NOT EXISTS idx_approval_logs_preschool ON public.approval_logs(preschool_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_entity ON public.approval_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_performed_by ON public.approval_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_approval_logs_created_at ON public.approval_logs(created_at);

-- Receipt verifications indexes
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_entity ON public.receipt_verifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_status ON public.receipt_verifications(verification_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.proof_of_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_notification_templates ENABLE ROW LEVEL SECURITY;

-- Proof of payments policies
CREATE POLICY "proof_of_payments_preschool_isolation" ON public.proof_of_payments
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Parents can only see their own student's POPs
CREATE POLICY "proof_of_payments_parent_access" ON public.proof_of_payments
    FOR ALL USING (
        auth.uid() = submitted_by 
        OR preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('principal_admin', 'teacher')
        )
    );

-- Petty cash requests policies
CREATE POLICY "petty_cash_requests_preschool_isolation" ON public.petty_cash_requests
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Teachers can see their own requests, principals see all
CREATE POLICY "petty_cash_requests_role_access" ON public.petty_cash_requests
    FOR ALL USING (
        auth.uid() = requested_by 
        OR preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'principal_admin'
        )
    );

-- Approval logs policies
CREATE POLICY "approval_logs_preschool_isolation" ON public.approval_logs
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Receipt verifications policies
CREATE POLICY "receipt_verifications_preschool_isolation" ON public.receipt_verifications
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Notification templates policies
CREATE POLICY "approval_notification_templates_preschool_isolation" ON public.approval_notification_templates
    FOR ALL USING (
        preschool_id IN (
            SELECT preschool_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- DEFAULT NOTIFICATION TEMPLATES
-- ============================================================================

-- Function to create default notification templates for a preschool
CREATE OR REPLACE FUNCTION create_default_approval_templates(p_preschool_id UUID, p_created_by UUID)
RETURNS void AS $$
BEGIN
    -- POP submitted notification to principal
    INSERT INTO public.approval_notification_templates (preschool_id, name, type, trigger_event, subject, message_template, created_by)
    VALUES (
        p_preschool_id,
        'POP Submitted - Principal Notification',
        'email',
        'pop_submitted',
        'New Proof of Payment Submitted',
        'Hello Principal,

A new proof of payment has been submitted by {{parent_name}} for {{student_name}}.

Payment Details:
- Amount: {{amount}}
- Date: {{payment_date}}
- Method: {{payment_method}}
- Purpose: {{payment_purpose}}

Please review and approve/reject in your dashboard.

Best regards,
EduDash Pro Team',
        p_created_by
    );

    -- POP approved notification to parent
    INSERT INTO public.approval_notification_templates (preschool_id, name, type, trigger_event, subject, message_template, created_by)
    VALUES (
        p_preschool_id,
        'POP Approved - Parent Notification',
        'email',
        'pop_approved',
        'Payment Proof Approved',
        'Dear {{parent_name}},

Your proof of payment for {{student_name}} has been approved.

Payment Details:
- Amount: {{amount}}
- Purpose: {{payment_purpose}}
- Approved by: {{approved_by}}

Thank you for your prompt payment.

Best regards,
{{school_name}}',
        p_created_by
    );

    -- Petty cash approved notification to teacher
    INSERT INTO public.approval_notification_templates (preschool_id, name, type, trigger_event, subject, message_template, created_by)
    VALUES (
        p_preschool_id,
        'Petty Cash Approved - Teacher Notification',
        'email',
        'petty_cash_approved',
        'Petty Cash Request Approved',
        'Dear {{requestor_name}},

Your petty cash request has been approved.

Request Details:
- Amount: {{approved_amount}}
- Category: {{category}}
- Description: {{description}}
- Approved by: {{approved_by}}

Please collect the cash and remember to submit your receipt by {{receipt_deadline}}.

Best regards,
{{school_name}}',
        p_created_by
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update petty cash transaction status to require approval
CREATE OR REPLACE FUNCTION migrate_petty_cash_to_approval_workflow()
RETURNS void AS $$
BEGIN
    -- Update existing petty cash transactions to require approval
    UPDATE public.petty_cash_transactions 
    SET status = 'pending' 
    WHERE status = 'approved' 
    AND created_at > NOW() - INTERVAL '30 days' -- Only recent transactions
    AND type = 'expense';
    
    -- Keep replenishments as approved (admin actions)
    UPDATE public.petty_cash_transactions 
    SET status = 'approved' 
    WHERE type = 'replenishment';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- IMPORTANT: After running this migration:
-- 1. Run migrate_petty_cash_to_approval_workflow() to update existing data
-- 2. Update the petty cash screen to use approval workflow instead of auto-approval
-- 3. Create the principal approval dashboard
-- 4. Set up notification system integration
-- 5. Configure receipt upload bucket permissions in Supabase storage

COMMENT ON TABLE public.proof_of_payments IS 'Stores parent-submitted proof of payment documents with approval workflow';
COMMENT ON TABLE public.petty_cash_requests IS 'Stores teacher/staff petty cash requests requiring principal approval';
COMMENT ON TABLE public.approval_logs IS 'Audit trail for all approval workflow actions';
COMMENT ON TABLE public.receipt_verifications IS 'Receipt processing and verification system';
COMMENT ON TABLE public.approval_notification_templates IS 'Customizable notification templates for approval workflows';