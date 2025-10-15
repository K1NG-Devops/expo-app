# Principal Dashboard Backend Integration

**Status:** ✅ Completed  
**Date:** 2025-10-02  
**Component:** `EnhancedPrincipalDashboard.tsx`

## Overview

The Enhanced Principal Dashboard has been wired to use the centralized `SchoolSettingsService` and React Query hooks to fetch and respect real database-backed school settings. This ensures all configuration state (WhatsApp number, feature toggles, display preferences) is persisted to Supabase and propagates app-wide with proper cache invalidation.

---

## Key Changes

### 1. **Centralized School Settings Integration**

The dashboard now subscribes to school settings via `useSchoolSettings(organizationId)` hook:

```typescript
const schoolSettingsQuery = useSchoolSettings((profile as any)?.organization_id);
const schoolSettings = schoolSettingsQuery.data;
```

**Benefits:**
- Real-time synchronization with database
- Automatic cache management via React Query
- Type-safe settings access
- Deep merge with defaults for backward compatibility

---

### 2. **Database-Backed WhatsApp Configuration**

WhatsApp functionality now prioritizes the database-stored number from `preschools.settings.whatsapp_number`:

```typescript
const isWAConfigured = !!schoolSettings?.whatsapp_number;
const isWAEnabled = isWhatsAppEnabled() || isWAConfigured;

const openWhatsAppWithFallback = async () => {
  const configuredNumber = schoolSettings?.whatsapp_number;
  if (configuredNumber) {
    const waLink = `https://wa.me/${configuredNumber.replace(/[^\d]/g, '')}?text=${message}`;
    await Linking.openURL(waLink);
    return;
  }
  // Fallback to legacy deep link or alert
};
```

**Flow:**
1. Check `schoolSettings.whatsapp_number` from database
2. Fallback to legacy `useWhatsAppConnection` deep link helper
3. If neither configured, prompt user to configure in Admin School Settings

---

### 3. **Feature Toggle Enforcement**

Dashboard sections now respect backend feature flags:

```typescript
const quickActionsEnabled = schoolSettings?.features?.activityFeed?.enabled ?? true;
const financialsEnabled = schoolSettings?.features?.financialReports?.enabled ?? true;
const pettyCashEnabled = schoolSettings?.features?.pettyCash?.enabled ?? true;
```

**Conditional Rendering:**
- Financial Summary section: `{financialsEnabled && data.financialSummary && ...}`
- Petty Cash cards: `{pettyCashEnabled && ...}`
- Financial Management Tools: `{financialsEnabled && <View>...</View>}`

**Default Behavior:**
- All features default to `true` (enabled) if settings not yet saved
- Null-safe with fallback to defaults via `??` operator

---

### 4. **School Name from Centralized Settings**

The dashboard now displays `schoolSettings.schoolName` as the primary source, with cascading fallbacks:

```typescript
{schoolSettings?.schoolName || tenantSlug || data.schoolName || 
 (profile as any)?.organization_membership?.organization_name || 
 t('dashboard.your_school')}
```

**Priority Order:**
1. Database `preschools.settings.schoolName`
2. Tenant slug from profile
3. Legacy `data.schoolName` from hook
4. Organization membership name
5. Translated fallback "Your School"

---

### 5. **Auto-Refresh on Focus**

Settings are refetched when the dashboard regains focus to ensure latest configuration:

```typescript
useFocusEffect(
  useCallback(() => {
    if (hasRefreshedOnFocus.current) {
      refresh();
      schoolSettingsQuery.refetch(); // ← New: Ensure fresh settings
    } else {
      hasRefreshedOnFocus.current = true;
    }
  }, [refresh, schoolSettingsQuery])
);
```

---

### 6. **Console.log Cleanup**

Removed debug console statements in compliance with governance rules:

**Removed:**
- `console.log('🔄 Dashboard refocused - refreshing data')`
- `console.log('📢 Sending announcement via database:', announcement)`
- `console.log('🚀 AI Analytics button pressed!')`

**Retained:**
- `console.error()` for critical error logging
- Server-side logging via `logger.info/warn/error`

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  EnhancedPrincipalDashboard                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ useSchoolSettings(organizationId)                          │ │
│  │   ↓                                                         │ │
│  │ React Query                                                 │ │
│  │   ↓                                                         │ │
│  │ SchoolSettingsService.get(schoolId)                        │ │
│  │   ↓                                                         │ │
│  │ Supabase: preschools.settings (JSONB)                      │ │
│  │   ↓                                                         │ │
│  │ Deep merge with DEFAULT_SCHOOL_SETTINGS                    │ │
│  │   ↓                                                         │ │
│  │ schoolSettings object (typed SchoolSettings)               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Derived State:                                                  │
│  • isWAConfigured = !!schoolSettings?.whatsapp_number           │
│  • financialsEnabled = schoolSettings?.features?.financialReports│
│  • pettyCashEnabled = schoolSettings?.features?.pettyCash        │
│                                                                   │
│  Conditional UI:                                                 │
│  • {financialsEnabled && <FinancialSection />}                  │
│  • {pettyCashEnabled && <PettyCashCard />}                      │
│  • WhatsApp actions use schoolSettings.whatsapp_number          │
└─────────────────────────────────────────────────────────────────┘
```

---

## RBAC Compliance

All updates to school settings use the secure `update_school_settings` RPC function:

**Server-Side Validation:**
- ✅ User authentication check
- ✅ Role validation (admin/principal only)
- ✅ School membership verification
- ✅ Audit logging (before/after snapshots)
- ✅ Safe key whitelisting

**Client-Side:**
- Uses `useUpdateSchoolSettings(schoolId)` mutation hook
- Automatic cache invalidation on success
- Optimistic updates for instant UI feedback

---

## Testing Checklist

- [ ] Dashboard displays correct school name from database
- [ ] WhatsApp quick action uses database-stored number
- [ ] Financial sections hidden when `features.financialReports.enabled = false`
- [ ] Petty Cash hidden when `features.pettyCash.enabled = false`
- [ ] Settings refetch on dashboard focus
- [ ] Alert shown with "Go to Settings" CTA when WhatsApp not configured
- [ ] No console.log statements in production build
- [ ] TypeScript compiles without errors
- [ ] React Query cache invalidates correctly after settings update

---

## Future Enhancements

1. **Loading States:** Show skeleton UI while `schoolSettingsQuery.isLoading`
2. **Error Boundaries:** Graceful fallback if settings fetch fails
3. **Offline Support:** Cache settings for offline-first experience
4. **Real-time Sync:** WebSocket updates for multi-admin scenarios
5. **Feature Tour:** Highlight newly enabled features via tooltips

---

## Related Files

- **Service:** `lib/services/SchoolSettingsService.ts`
- **Hooks:** `lib/hooks/useSchoolSettings.ts`
- **RPC Migration:** `supabase/migrations/20251001235130_update_school_settings_rpc.sql`
- **Admin Settings Screen:** `screens/admin/school-settings.tsx` (to be created)
- **WhatsApp Settings Screen:** `screens/whatsapp-settings.tsx` (existing)

---

## References

- [School Settings Service Documentation](../governance/school-settings-service.md)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
