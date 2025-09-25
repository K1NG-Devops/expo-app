-- Finance indexes to improve dashboard query performance
-- Safe to run multiple times due to IF NOT EXISTS

create index if not exists idx_payments_preschool_status_created_at
  on public.payments (preschool_id, status, created_at desc);

create index if not exists idx_petty_cash_school_status_created_at
  on public.petty_cash_transactions (school_id, status, created_at desc);

create index if not exists idx_petty_cash_receipts_txid
  on public.petty_cash_receipts (transaction_id);

create index if not exists idx_students_preschool_active
  on public.students (preschool_id, is_active);

create index if not exists idx_financial_tx_preschool_type_status_created_at
  on public.financial_transactions (preschool_id, type, status, created_at desc);
