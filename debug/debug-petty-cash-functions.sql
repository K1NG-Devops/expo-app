-- Check if petty cash functions exist
SELECT routine_name, routine_type, specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_petty_cash_summary', 'get_petty_cash_balance')
ORDER BY routine_name;

-- Check if petty cash tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%petty_cash%'
ORDER BY table_name;

-- Sample query to test the functions if they exist
-- SELECT get_petty_cash_balance('ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid);
-- SELECT * FROM get_petty_cash_summary('ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid);