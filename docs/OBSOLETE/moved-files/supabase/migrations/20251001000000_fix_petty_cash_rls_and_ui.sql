-- Fix Petty Cash RLS Policies and Issues
-- Date: 2025-10-01
-- Description: Fixes RLS policies using correct auth_user_id column and ensures proper permissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view petty cash transactions in their preschool" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Principals and admins can manage petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Users can view petty cash accounts in their preschool" ON public.petty_cash_accounts;
DROP POLICY IF EXISTS "Principals and admins can manage petty cash accounts" ON public.petty_cash_accounts;

-- Petty cash transactions policies with correct auth_user_id column
CREATE POLICY "Users can view petty cash transactions in their preschool"
ON public.petty_cash_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_transactions.school_id
  )
);

CREATE POLICY "Principals and admins can insert petty cash transactions"
ON public.petty_cash_transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_transactions.school_id
      AND u.role IN ('principal', 'admin', 'superadmin')
  )
);

CREATE POLICY "Principals and admins can update petty cash transactions"
ON public.petty_cash_transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_transactions.school_id
      AND u.role IN ('principal', 'admin', 'superadmin')
  )
);

CREATE POLICY "Principals and admins can delete petty cash transactions"
ON public.petty_cash_transactions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_transactions.school_id
      AND u.role IN ('principal', 'admin', 'superadmin')
  )
);

-- Petty cash accounts policies with correct auth_user_id column
CREATE POLICY "Users can view petty cash accounts in their preschool"
ON public.petty_cash_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_accounts.school_id
  )
);

CREATE POLICY "Principals and admins can insert petty cash accounts"
ON public.petty_cash_accounts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_accounts.school_id
      AND u.role IN ('principal', 'admin', 'superadmin')
  )
);

CREATE POLICY "Principals and admins can update petty cash accounts"
ON public.petty_cash_accounts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_accounts.school_id
      AND u.role IN ('principal', 'admin', 'superadmin')
  )
);

CREATE POLICY "Principals and admins can delete petty cash accounts"
ON public.petty_cash_accounts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.preschool_id = petty_cash_accounts.school_id
      AND u.role IN ('principal', 'admin', 'superadmin')
  )
);

-- Add comment
COMMENT ON POLICY "Users can view petty cash transactions in their preschool" ON public.petty_cash_transactions
IS 'Fixed RLS policy using correct auth_user_id column from users table';
