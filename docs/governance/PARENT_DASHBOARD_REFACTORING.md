# ParentDashboard.tsx Refactoring Plan

**Current**: 2082 lines (4x over limit)  
**Target**: <300 lines  
**Priority**: CRITICAL  
**Estimated effort**: 4-6 hours

## Problem

ParentDashboard.tsx is **2082 lines** - the largest file in the codebase and a critical WARP.md violation:
- 4x over the 500 line limit for screens
- Monolithic: All logic, state, UI, and helpers in one file
- Hard to review, test, and maintain
- High merge conflict risk

## Extraction Strategy

### Phase 1: Extract Components (~900 lines → separate files)

#### 1.1 ChildSwitcher Component (lines 78-152)
**Target**: `components/dashboard/parent/ChildSwitcher.tsx` (~80 lines)

```tsx
export interface ChildSwitcherProps {
  children: any[];
  activeChildId: string | null;
  onChildChange: (childId: string) => void;
}
```

#### 1.2 ChildCard Component (lines ~1676-1743)
**Target**: `components/dashboard/parent/ChildCard.tsx` (~150 lines)

```tsx
export interface ChildCardProps {
  child: {
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    className: string | null;
    status: string;
    progressScore: number;
    homeworkPending: number;
    upcomingEvents: number;
    lastActivity: Date;
  };
  onViewAttendance: (childId: string) => void;
  onViewHomework: (childId: string) => void;
  onMessage: (child: any) => void;
  getChildAgeText: (child: any) => string;
}
```

#### 1.3 MetricsGrid Component (lines ~1768-1856)
**Target**: `components/dashboard/parent/MetricsGrid.tsx` (~200 lines)

```tsx
export interface MetricsGridProps {
  unreadMessageCount: number;
  popStats: any;
  urgentMetrics: {
    pendingHomework: number;
    todayAttendance: 'present' | 'absent' | 'late' | 'unknown';
  };
  getAttendanceColor: () => string;
  getAttendanceIcon: () => string;
}
```

#### 1.4 POPActionsGrid Component (lines ~1772-1847)
**Target**: `components/dashboard/parent/POPActionsGrid.tsx` (~150 lines)

```tsx
export interface POPActionsGridProps {
  activeChildId: string | null;
  childrenCards: any[];
  popStats: any;
}
```

#### 1.5 CommunicationHub Component (lines ~1886-1970)
**Target**: `components/dashboard/parent/CommunicationHub.tsx` (~180 lines)

```tsx
export interface CommunicationHubProps {
  onNavigate: (route: string) => void;
}
```

#### 1.6 WelcomeSection Component (lines ~1609-1648)
**Target**: `components/dashboard/parent/WelcomeSection.tsx` (~100 lines)

```tsx
export interface WelcomeSectionProps {
  profile: any;
  childrenCards: any[];
  activeChildId: string | null;
  children: any[];
  getGreeting: () => string;
  toggleTheme: () => Promise<void>;
}
```

### Phase 2: Extract Hooks (~400 lines → 2 hooks)

#### 2.1 useParentDashboardState Hook
**Target**: `hooks/useParentDashboardState.ts` (~200 lines)

**Exports**:
```tsx
export interface ParentDashboardState {
  tier: 'free' | 'starter' | 'premium' | 'enterprise';
  usage: { ai_help: number; ai_lessons: number; tutoring_sessions: number };
  limits: { ai_help: number | 'unlimited'; ai_lessons: number | 'unlimited'; tutoring_sessions: number | 'unlimited' };
  children: any[];
  childrenCards: any[];
  activeChildId: string | null;
  urgentMetrics: {
    feesDue: { amount: number; dueDate: string | null; overdue: boolean } | null;
    unreadMessages: number;
    pendingHomework: number;
    todayAttendance: 'present' | 'absent' | 'late' | 'unknown';
    upcomingEvents: number;
  };
  setActiveChildId: (id: string | null) => void;
}

export function useParentDashboardState(): ParentDashboardState;
```

**Consolidates**:
- `useTier()` logic (lines 59-76)
- State declarations (lines 159-198)
- `useEffect` for tier limits (lines 441-454)
- Active child persistence logic (lines 460-469)

#### 2.2 useParentDashboardData Hook
**Target**: `hooks/useParentDashboardData.ts` (~200 lines)

**Exports**:
```tsx
export interface ParentDashboardData {
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  loadDashboardData: () => Promise<void>;
  onRefresh: () => Promise<void>;
  loadUrgentMetrics: (studentId: string) => Promise<void>;
}

export function useParentDashboardData(
  userId: string | undefined,
  activeChildId: string | null
): ParentDashboardData;
```

**Consolidates**:
- `loadDashboardData` callback (lines 200-405)
- `onRefresh` callback (lines 411-439)
- `loadUrgentMetrics` function (lines 472-565)

### Phase 3: Extract Utilities (~150 lines → 1 utils file)

#### 3.1 ParentDashboardHelpers
**Target**: `lib/dashboard/parentHelpers.ts` (~150 lines)

**Exports**:
```tsx
export function getGreeting(): string;
export function getChildAgeText(child: any): string;
export function formatCurrency(amount: number): string;
export function getAttendanceColor(status: string, theme: any): string;
export function getAttendanceIcon(status: string): string;
export function getMockWhatsAppConnection(): any;
```

**Consolidates**:
- Helper functions (lines 452-601)
- Mock WhatsApp connection (lines 41-57)

### Phase 4: Refactored ParentDashboard.tsx

**Target**: ~280 lines (screen orchestration only)

```tsx
export default function ParentDashboard() {
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();
  const { data: popStats } = usePOPStats(activeChildId || undefined);
  
  // Extracted state hook
  const {
    tier,
    usage,
    limits,
    children,
    childrenCards,
    activeChildId,
    urgentMetrics,
    setActiveChildId,
  } = useParentDashboardState();
  
  // Extracted data hook
  const {
    loading,
    error,
    refreshing,
    loadDashboardData,
    onRefresh,
  } = useParentDashboardData(user?.id, activeChildId);
  
  // Modal states
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  
  // WhatsApp integration
  const whatsApp = useRealWhatsAppConnection() || getMockWhatsAppConnection();
  
  // Ad configuration
  const showBanner = Platform.OS === 'android' && tier === 'free';
  
  // Quick action handlers
  const handleQuickAction = (action: string) => { /* ... */ };
  
  if (loading) {
    return <LoadingSkeleton />;
  }
  
  return (
    <View style={styles.container}>
      <OfflineBanner />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && <ErrorBanner message={t('dashboard.loadError')} onRetry={loadDashboardData} />}
        
        <WelcomeSection
          profile={profile}
          childrenCards={childrenCards}
          activeChildId={activeChildId}
          children={children}
          getGreeting={getGreeting}
          toggleTheme={toggleTheme}
        />
        
        {children.length > 0 ? (
          <>
            {children.length > 1 && (
              <ChildSwitcher
                children={childrenCards}
                activeChildId={activeChildId}
                onChildChange={setActiveChildId}
              />
            )}
            
            {childrenCards
              .filter(c => !activeChildId || c.id === activeChildId)
              .map(child => (
                <ChildCard
                  key={child.id}
                  child={child}
                  onViewAttendance={(id) => console.log('attendance', id)}
                  onViewHomework={(id) => console.log('homework', id)}
                  onMessage={handleQuickMessage}
                  getChildAgeText={getChildAgeText}
                />
              ))}
          </>
        ) : (
          <EmptyChildrenState onRegister={() => router.push('/screens/parent-child-registration')} />
        )}
        
        <MetricsGrid
          unreadMessageCount={unreadMessageCount}
          popStats={popStats}
          urgentMetrics={urgentMetrics}
          getAttendanceColor={getAttendanceColor}
          getAttendanceIcon={getAttendanceIcon}
        />
        
        <POPActionsGrid
          activeChildId={activeChildId}
          childrenCards={childrenCards}
          popStats={popStats}
        />
        
        {showBanner && <AdBanner />}
        
        <EnhancedStatsRow
          aiHelp={usage.ai_help}
          aiHelpLimit={limits.ai_help}
          aiLessons={usage.ai_lessons}
          aiLessonsLimit={limits.ai_lessons}
        />
        
        <EnhancedQuickActions
          aiHelpUsage={usage.ai_help}
          aiHelpLimit={limits.ai_help}
          onHomeworkPress={() => handleQuickAction('homework')}
          onWhatsAppPress={() => handleQuickAction('whatsapp')}
          onUpgradePress={() => {}}
        />
        
        <CommunicationHub onNavigate={(route) => router.push(route)} />
        
        {showBanner && <NativeAdCard placement={PLACEMENT_KEYS.NATIVE_PARENT_FEED} />}
      </ScrollView>
      
      {/* Modals */}
      <HomeworkModal
        visible={showHomeworkModal}
        onClose={() => setShowHomeworkModal(false)}
      />
      
      <WhatsAppOptInModal
        visible={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        connection={whatsApp}
      />
      
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </View>
  );
}
```

## Implementation Order

### Week 1 (Priority)
1. ✅ Create directory: `components/dashboard/parent/`
2. ✅ Extract ChildSwitcher component
3. ✅ Extract ChildCard component
4. ✅ Extract helper functions to `lib/dashboard/parentHelpers.ts`
5. ✅ Test extracted components work independently

### Week 2
6. ✅ Extract MetricsGrid component
7. ✅ Extract POPActionsGrid component
8. ✅ Extract CommunicationHub component
9. ✅ Extract WelcomeSection component
10. ✅ Test all UI components

### Week 3
11. ✅ Create `useParentDashboardState` hook
12. ✅ Create `useParentDashboardData` hook
13. ✅ Test hooks with existing logic

### Week 4
14. ✅ Refactor main ParentDashboard.tsx to use extracted pieces
15. ✅ Remove old code
16. ✅ Verify line count <300
17. ✅ Full integration testing
18. ✅ Update tests if needed

## Success Metrics

- [ ] ParentDashboard.tsx ≤300 lines (from 2082)
- [ ] All extracted components ≤200 lines each
- [ ] All hooks ≤200 lines each
- [ ] Zero regressions in functionality
- [ ] ESLint warnings cleared
- [ ] Faster code reviews (smaller PRs)

## Testing Strategy

1. **Unit Tests**: Test extracted components independently
2. **Integration Tests**: Test hooks with mock data
3. **E2E Tests**: Full parent dashboard flow
4. **Visual Regression**: Screenshot comparison before/after

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing features | High | Extract incrementally, test each step |
| State management complexity | Medium | Use custom hooks to encapsulate logic |
| Props drilling | Medium | Consider Context if needed, but avoid over-engineering |
| Merge conflicts during refactor | High | Create feature branch, communicate with team |

## References

- **WARP.md**: File Size & Code Organization Standards (Section on File Size)
- **FILE_SIZE_VIOLATIONS.md**: Tracking document for all oversized files
- **React Native Best Practices**: Component composition patterns
