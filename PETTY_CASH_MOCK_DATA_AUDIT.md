# Petty Cash Mock Data Audit Report

## Files with Mock/Fallback Data to Remove

### 1. `/app/screens/petty-cash.tsx`
**Issues Found:**
- Line 162: `const openingBalance = settingsData?.opening_balance ?? 0; // No mock fallback` - Comment suggests no mock but still has fallback
- Line 219: `status: 'approved', // In a real system, this might need approval` - Hardcoded approved status
- Lines 739, 750, 775, 788, 853, 1151: Various placeholder text ("0.00", "What was this expense for?", "Select category...", "Receipt or reference number")
- Line 864: `Recommended replenishment when balance falls below R1,000` - Hardcoded threshold

**Actions Required:**
- Remove fallback `?? 0` for opening balance; handle missing data gracefully with proper error states
- Change auto-approval logic to proper role-based approval system
- Replace hardcoded threshold with database-driven configuration
- Use proper internationalization for placeholder text

### 2. `/hooks/usePrincipalHub.ts`
**Issues Found:**
- Line 449: `const estimatedMonthlyRevenue = currentMonthRevenue > 0 ? currentMonthRevenue : studentsCount * 1200;` - Mock revenue calculation
- Line 450: `const finalPreviousRevenue = previousMonthRevenue > 0 ? previousMonthRevenue : Math.round(estimatedMonthlyRevenue * 0.9);` - Mock previous revenue
- Line 498: `const totalExpenses = realExpenses > 0 ? realExpenses : Math.round(estimatedMonthlyRevenue * 0.65);` - Mock expense calculation
- Line 513: `capacity: preschoolCapacity.capacity || 60` - Default capacity fallback
- Line 515: `available_spots: (preschoolCapacity.capacity || 60) - studentsCount` - Default capacity fallback
- Line 516: `utilization_percentage: Math.round((studentsCount / (preschoolCapacity.capacity || 60)) * 100)` - Default capacity fallback
- Lines 518-520: Age group distribution using fixed percentages (0.3, 0.4, 0.3)
- Lines 529-532: Enrollment pipeline using mock percentages (0.6, 0.2, 0.2, 0.8)
- Lines 567-581: Mock activities when no real data exists

**Actions Required:**
- Remove all revenue estimation formulas; use only actual transaction data
- Remove capacity defaults; require proper school configuration
- Remove age group distribution calculations; use actual student data
- Remove enrollment pipeline mock percentages; use actual application data
- Remove fallback activities; show empty state instead

### 3. `/components/dashboard/EnhancedPrincipalDashboard.tsx`
**Issues Found:**
- Lines 471-483: References petty cash data from usePrincipalHub hook which contains mock data
- Financial summary card displays potentially mocked financial data

**Actions Required:**
- Update to use dedicated petty cash data layer instead of hook fallbacks
- Ensure all financial data comes from actual transactions

### 4. `/migrations_drafts/20250913_create_petty_cash_table.sql`
**Issues Found:**
- Lines 126-151: Sample data insertion for testing
- Line 115: Default opening balance of 5000.00
- Line 122: Default petty cash limit of 1000.00

**Actions Required:**
- Remove sample data insertion entirely
- Make default values configurable per school
- Move seed data to separate dev-only script

## Database Schema Issues

### Current Schema Problems:
1. **Missing Tables**: No dedicated `petty_cash_accounts` table for per-school configuration
2. **Missing tenant isolation**: Queries use `preschool_id` but no proper tenant context helpers
3. **Hard-coded limits**: Opening balance and limits are in `school_settings` with defaults
4. **No receipts table**: Receipt storage handled ad-hoc with path in transactions table

### Required Schema Changes:
1. Create proper `petty_cash_accounts` table with per-school configuration
2. Create `petty_cash_receipts` table for proper receipt management
3. Update RLS policies for multi-tenant isolation
4. Add proper indexes for performance

## Tenant Context Issues

### Current Problems:
1. **Ad-hoc school ID retrieval**: Each component queries `users.preschool_id` directly
2. **No standardized tenant context**: No central way to get current school
3. **Inconsistent RLS enforcement**: Some queries might bypass tenant scoping

### Required Changes:
1. Create tenant context helpers
2. Standardize school ID retrieval
3. Ensure all petty cash queries are tenant-scoped

## UI/UX Issues

### Current Problems:
1. **Hardcoded thresholds**: Low balance warning at R1,000
2. **Mock placeholders**: Form placeholders not internationalized
3. **Auto-approval**: Expenses automatically approved instead of proper workflow
4. **No empty states**: Fallback to mock data instead of proper empty states

### Required Changes:
1. Make thresholds configurable per school
2. Implement proper approval workflows
3. Add proper empty states and loading skeletons
4. Internationalize all user-facing text

## Testing Strategy

### Required Tests:
1. **Unit Tests**: Data layer functions, tenant scoping, validation
2. **Integration Tests**: API routes, database queries, RLS policies
3. **E2E Tests**: User workflows, tenant isolation, approval processes
4. **Security Tests**: RLS policy enforcement, tenant data isolation

## Implementation Priority

### Phase 1 (High Priority):
1. Remove revenue/expense estimation fallbacks
2. Implement proper tenant context helpers
3. Remove sample data from migration
4. Fix auto-approval logic

### Phase 2 (Medium Priority):
1. Create proper database schema
2. Implement data access layer
3. Add proper empty states
4. Internationalize text

### Phase 3 (Lower Priority):
1. Add comprehensive tests
2. Implement advanced features
3. Performance optimization
4. Documentation

## Success Criteria

- [ ] No mock or hardcoded data in petty cash system
- [ ] All data comes from Supabase with proper RLS
- [ ] Tenant isolation is enforced and tested
- [ ] Proper error handling and empty states
- [ ] All tests pass (unit, integration, E2E)
- [ ] ESLint and TypeScript checks pass
- [ ] Performance meets requirements (<2s load time)