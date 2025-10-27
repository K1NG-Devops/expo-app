# Notification Badge System - Comprehensive Implementation Plan

**Status**: 📋 Planning Complete - Ready for Implementation  
**Priority**: High (UX Enhancement & Real-time Updates)  
**Estimated Effort**: 3-4 weeks  
**Target Completion**: Q1 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [System Architecture](#system-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Security & Multi-Tenancy](#security--multi-tenancy)
7. [Testing Strategy](#testing-strategy)
8. [Rollout & Monitoring](#rollout--monitoring)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problem Statement

Currently, EduDash Pro has limited notification visibility across dashboard widgets. Only **PendingParentLinkRequests** and **PendingLinkRequests** show badge indicators with counts. Users miss important updates in:

- Registration requests
- Unread messages
- New announcements
- Recent activities
- Overdue payments
- Pending reports

### Solution

Implement a **unified notification badge system** with:

- **Reusable NotificationBadge component** (inline & corner positioning)
- **Exact count display** (e.g., "23" not "20+")
- **Color-coded urgency levels** (red/orange/blue/green)
- **Real-time auto-refresh** (30-180 second intervals by urgency)
- **Multi-tenant security** (RLS + preschool_id filtering)
- **Accessibility-first design** (screen reader support, 44x44 touch targets)

### Benefits

- ✅ **Improved user awareness** of pending actions
- ✅ **Reduced missed notifications** across all roles (Parent, Teacher, Principal)
- ✅ **Consistent UX** with standardized badge patterns
- ✅ **Real-time updates** without manual refresh
- ✅ **Performance optimized** with count-only queries and indexes

---

## Current State Analysis

### Existing Implementations ✅

**1. PendingParentLinkRequests Component**
```typescript
// Location: components/dashboard/PendingParentLinkRequests.tsx
// Badge: Red (#DC2626), inline position, exact count
// Query: TanStack Query v5 with 60s auto-refresh
// Count: guardian_requests WHERE status='pending' AND preschool_id=current
```

**Visual Example**:
```
┌──────────────────────────────────────┐
│ Parent Link Requests      [🔴 3]    │  ← Red badge with exact count
│                                      │
│ 3 pending approval                   │
└──────────────────────────────────────┘
```

**2. PendingLinkRequests Component (Parent View)**
```typescript
// Location: components/dashboard/PendingLinkRequests.tsx
// Badge: Orange (#F59E0B), inline position
// Shows pending, approved, rejected counts
```

### Missing Implementations ❌

**Widgets WITHOUT badges currently**:

1. **PendingRegistrationRequests** - Child registration approvals
2. **AnnouncementsCard** - Unread announcements
3. **Message Threads** - Unread message count
4. **Recent Activity** - New activities since last view
5. **Financial Summary** - Overdue invoices
6. **Student Progress Reports** - Reports requiring review
7. **SectionHeader** (Collapsible sections) - Section-level notification counts

---

## System Architecture

### Component Hierarchy

```
Dashboard (Principal/Teacher/Parent)
├── SectionHeader (with optional badge)
│   └── NotificationBadge (inline)
├── PendingParentLinkRequests
│   └── NotificationBadge (inline, urgent)
├── PendingLinkRequests
│   └── NotificationBadge (inline, pending)
├── PendingRegistrationRequests
│   └── NotificationBadge (inline, pending)
├── AnnouncementsCard
│   └── NotificationBadge (corner, info)
├── MessagesWidget
│   └── NotificationBadge (inline, info)
└── FinancialSummary
    └── NotificationBadge (inline, urgent)
```

### Data Flow

```
User Action (e.g., parent submits link request)
    ↓
Database Update (guardian_requests INSERT)
    ↓
RLS Policy Check (preschool_id + role verification)
    ↓
TanStack Query Auto-Refetch (60s interval for urgent)
    ↓
useParentLinkRequestCount Hook Updates
    ↓
NotificationBadge Re-renders with New Count
    ↓
User Sees Badge Update (with animation)
    ↓
User Taps Badge → Navigate to Detail Screen
    ↓
markWidgetAsViewed() Called
    ↓
Count Resets (for info-level badges based on last_viewed_at)
```

---

## Implementation Phases

### Phase 1: Reusable Component & Types (Week 1, Days 1-2)

**Deliverable**: `components/ui/NotificationBadge.tsx`

**Component API**:
```typescript
interface NotificationBadgeProps {
  count: number;                    // Exact count (auto-hide when 0)
  variant?: 'urgent' | 'pending' | 'info' | 'success'; // Default: 'info'
  position?: 'inline' | 'corner';   // Default: 'inline'
  size?: 'small' | 'medium' | 'large'; // Default: 'medium'
  maxCount?: number;                // Optional cap (if needed later)
  testID?: string;
  onPress?: () => void;             // Optional navigation/expand handler
}
```

**Variant Colors** (from theme):
- `urgent`: `#DC2626` (red) - Approvals, overdue payments
- `pending`: `#F59E0B` (orange) - Pending reviews, registrations
- `info`: `#3B82F6` (blue) - Messages, announcements, activities
- `success`: `#059669` (green) - Completed actions (future use)

**Position Types**:
- `inline`: Horizontal alignment next to section titles (most common)
- `corner`: Absolute positioned top-right in card containers

**Size Specifications**:
- `small`: Visual height ~20px, font 11px (touch area 44x44 via hitSlop)
- `medium`: Visual height ~24px, font 12px (default)
- `large`: Visual height ~28px, font 14px

**Visual Examples**:
```tsx
// Inline badge (beside title)
<View style={styles.header}>
  <Text style={styles.title}>Parent Link Requests</Text>
  <NotificationBadge count={3} variant="urgent" position="inline" />
</View>

// Corner badge (card overlay)
<View style={styles.card}>
  <NotificationBadge count={5} variant="info" position="corner" />
  <Text>Announcements Content</Text>
</View>
```

**Type Definitions**: `types/notifications.ts`
```typescript
export type NotificationVariant = 'urgent' | 'pending' | 'info' | 'success';
export type NotificationPosition = 'inline' | 'corner';
export type NotificationSize = 'small' | 'medium' | 'large';

export interface NotificationBadgeProps {
  count: number;
  variant?: NotificationVariant;
  position?: NotificationPosition;
  size?: NotificationSize;
  maxCount?: number;
  testID?: string;
  onPress?: () => void;
}

export interface WidgetNotificationConfig {
  widgetType: string;
  variant: NotificationVariant;
  position: NotificationPosition;
  queryHook: string; // Hook name for count
  refreshInterval: number; // milliseconds
}
```

**Constraints**:
- ✅ Keep `NotificationBadge.tsx` **under 200 lines**
- ✅ Use existing **Reanimated 3** for animations (no new dependencies)
- ✅ Theme-aware with **dark mode support**
- ✅ Accessibility: `accessibilityLabel`, `accessibilityLiveRegion`, `accessibilityHint`
- ✅ Min **44x44 touch target** via `hitSlop`

---

### Phase 2: Notification Count Hooks (Week 1, Days 3-4)

**Deliverable**: `hooks/useNotificationCounts.ts`

**All hooks follow these patterns**:
- ✅ Include `preschool_id` in query key
- ✅ Use Supabase v2 `.select('*', { count: 'exact', head: true })`
- ✅ Respect RLS policies (preschool_id + role filtering)
- ✅ Auto-refresh based on urgency level
- ✅ Error handling with Sentry logging in production

**Stale Time & Refresh Policies**:

| Urgency Level | Stale Time | Refetch Interval | Use Cases |
|---------------|------------|------------------|-----------|
| **Urgent** | 30 seconds | 60 seconds | Approvals, overdue payments |
| **Pending** | 60 seconds | 90 seconds | Messages, registrations |
| **Info** | 120 seconds | 180 seconds | Announcements, activities |

**Hooks to Implement**:

**1. useParentLinkRequestCount**
```typescript
export const useParentLinkRequestCount = (preschoolId: string | undefined) => {
  return useQuery({
    queryKey: ['notification-count', 'parent-link-requests', preschoolId],
    queryFn: async (): Promise<number> => {
      if (!preschoolId) return 0;
      
      const { count, error } = await assertSupabase()
        .from('guardian_requests')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!preschoolId,
    staleTime: 30 * 1000,      // 30 seconds (urgent)
    refetchInterval: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000,    // 10 minutes
  });
};
```

**2. useRegistrationRequestCount**
```typescript
export const useRegistrationRequestCount = (preschoolId: string | undefined) => {
  return useQuery({
    queryKey: ['notification-count', 'registration-requests', preschoolId],
    queryFn: async (): Promise<number> => {
      if (!preschoolId) return 0;
      
      const { count, error } = await assertSupabase()
        .from('child_registration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!preschoolId,
    staleTime: 60 * 1000,      // 60 seconds (pending)
    refetchInterval: 90 * 1000, // 90 seconds
    gcTime: 10 * 60 * 1000,
  });
};
```

**3. useUnreadMessageCount**
```typescript
export const useUnreadMessageCount = (userId: string | undefined, preschoolId: string | undefined) => {
  return useQuery({
    queryKey: ['notification-count', 'unread-messages', userId, preschoolId],
    queryFn: async (): Promise<number> => {
      if (!userId || !preschoolId) return 0;
      
      // Get user's participant records and sum unread counts
      // (Leverage existing useParentThreads logic)
      const { data: participants } = await assertSupabase()
        .from('message_participants')
        .select('thread_id, last_read_at')
        .eq('user_id', userId);
      
      if (!participants || participants.length === 0) return 0;
      
      // Count messages after last_read_at across all threads
      let totalUnread = 0;
      for (const p of participants) {
        const { count } = await assertSupabase()
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', p.thread_id)
          .gt('created_at', p.last_read_at)
          .neq('sender_id', userId)
          .is('deleted_at', null);
        
        totalUnread += count || 0;
      }
      
      return totalUnread;
    },
    enabled: !!userId && !!preschoolId,
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

**4. useRecentActivityCount** (Phase 6 dependency)
```typescript
export const useRecentActivityCount = (
  userId: string | undefined, 
  preschoolId: string | undefined
) => {
  const { data: lastViewed } = useLastViewedTime('recent_activity');
  
  return useQuery({
    queryKey: ['notification-count', 'recent-activity', userId, preschoolId, lastViewed],
    queryFn: async (): Promise<number> => {
      if (!userId || !preschoolId) return 0;
      
      const since = lastViewed || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { count, error } = await assertSupabase()
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .gt('created_at', since);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId && !!preschoolId,
    staleTime: 120 * 1000,      // 120 seconds (info)
    refetchInterval: 180 * 1000, // 180 seconds
    gcTime: 10 * 60 * 1000,
  });
};
```

**5. useAnnouncementCount**
```typescript
export const useAnnouncementCount = (
  userId: string | undefined, 
  preschoolId: string | undefined
) => {
  const { data: lastViewed } = useLastViewedTime('announcements');
  
  return useQuery({
    queryKey: ['notification-count', 'announcements', userId, preschoolId, lastViewed],
    queryFn: async (): Promise<number> => {
      if (!userId || !preschoolId) return 0;
      
      const since = lastViewed || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { count, error } = await assertSupabase()
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .gt('created_at', since);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId && !!preschoolId,
    staleTime: 120 * 1000,
    refetchInterval: 180 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

**6. useOverduePaymentCount**
```typescript
export const useOverduePaymentCount = (preschoolId: string | undefined) => {
  return useQuery({
    queryKey: ['notification-count', 'overdue-payments', preschoolId],
    queryFn: async (): Promise<number> => {
      if (!preschoolId) return 0;
      
      const { count, error } = await assertSupabase()
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .eq('status', 'overdue');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!preschoolId,
    staleTime: 30 * 1000,      // 30 seconds (urgent)
    refetchInterval: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

**7. usePendingReportCount**
```typescript
export const usePendingReportCount = (
  userId: string | undefined, 
  preschoolId: string | undefined, 
  role: string | undefined
) => {
  return useQuery({
    queryKey: ['notification-count', 'pending-reports', userId, preschoolId, role],
    queryFn: async (): Promise<number> => {
      if (!userId || !preschoolId || !role) return 0;
      
      // Filter by role: teachers see reports to review, principals see all pending
      const query = assertSupabase()
        .from('student_progress_reports')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .eq('status', 'pending');
      
      if (role === 'teacher') {
        query.eq('teacher_id', userId);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId && !!preschoolId && !!role,
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

---

### Phase 3: Widget Integration (Week 1-2, Days 5-8)

**Goal**: Replace custom badges with `NotificationBadge` and add badges to widgets that don't have them.

#### 3.1 Refactor PendingParentLinkRequests

**File**: `components/dashboard/PendingParentLinkRequests.tsx`

**Before**:
```typescript
{requests && requests.length > 0 && (
  <View style={[styles.pendingBadge, { backgroundColor: '#DC2626' }]}>
    <Text style={styles.pendingBadgeText}>{requests.length}</Text>
  </View>
)}
```

**After**:
```typescript
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useParentLinkRequestCount } from '@/hooks/useNotificationCounts';

export function PendingParentLinkRequests() {
  const { user } = useAuth();
  const { data: count = 0 } = useParentLinkRequestCount(user?.preschool_id);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parent Link Requests</Text>
        <NotificationBadge 
          count={count} 
          variant="urgent" 
          position="inline"
          onPress={() => {/* expand section or navigate */}}
        />
      </View>
      {/* ... rest of component */}
    </View>
  );
}
```

#### 3.2 Refactor PendingLinkRequests (Parent View)

**File**: `components/dashboard/PendingLinkRequests.tsx`

**Change**: Use `NotificationBadge` for pending count with `variant="pending"`

#### 3.3 Update PendingRegistrationRequests

**File**: `components/dashboard/PendingRegistrationRequests.tsx`

**Add Badge**:
```typescript
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useRegistrationRequestCount } from '@/hooks/useNotificationCounts';

export const PendingRegistrationRequests: React.FC = () => {
  const { user, profile } = useAuth();
  const { data: count = 0 } = useRegistrationRequestCount(profile?.organization_id);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registration Requests</Text>
        <NotificationBadge 
          count={count} 
          variant="pending" 
          position="inline" 
        />
      </View>
      {/* ... rest */}
    </View>
  );
};
```

#### 3.4 Update AnnouncementsCard

**File**: `components/dashboard/cards/AnnouncementsCard.tsx`

**Add Corner Badge**:
```typescript
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useAnnouncementCount } from '@/hooks/useNotificationCounts';

export function AnnouncementsCard() {
  const { user } = useAuth();
  const { data: count = 0 } = useAnnouncementCount(user?.id, user?.preschool_id);
  
  return (
    <DashboardCard title="Announcements" icon="megaphone-outline">
      <NotificationBadge 
        count={count} 
        variant="info" 
        position="corner"
        size="small"
      />
      {/* ... announcements list */}
    </DashboardCard>
  );
}
```

#### 3.5 Add Badges to Message Widgets

**File**: Various message components (Parent, Teacher, Principal dashboards)

**Pattern**:
```typescript
import { useUnreadMessageCount } from '@/hooks/useNotificationCounts';

const { data: unreadCount = 0 } = useUnreadMessageCount(user?.id, user?.preschool_id);

<NotificationBadge count={unreadCount} variant="info" position="inline" />
```

---

### Phase 4: SectionHeader Integration (Week 2, Days 1-3)

**Goal**: Add notification badges to collapsible section headers.

**Component Update**: Shared `SectionHeader` component

**Enhanced Props**:
```typescript
interface SectionHeaderProps {
  title: string;
  sectionId: string;
  icon?: string;
  notificationCount?: number;        // NEW
  notificationVariant?: NotificationVariant; // NEW
  onToggle?: () => void;
}
```

**Implementation**:
```typescript
import { NotificationBadge } from '@/components/ui/NotificationBadge';

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  sectionId, 
  icon, 
  notificationCount,
  notificationVariant = 'info',
  onToggle 
}) => {
  const isCollapsed = collapsedSections.has(sectionId);
  
  return (
    <TouchableOpacity onPress={onToggle} style={styles.sectionHeader}>
      <View style={styles.headerLeft}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.title}>{title}</Text>
        {notificationCount !== undefined && notificationCount > 0 && (
          <NotificationBadge 
            count={notificationCount} 
            variant={notificationVariant}
            position="inline"
          />
        )}
      </View>
      <Ionicons 
        name={isCollapsed ? 'chevron-down' : 'chevron-up'} 
        size={20} 
      />
    </TouchableOpacity>
  );
};
```

**Dashboard Wiring** (NewEnhancedPrincipalDashboard.tsx):

```typescript
const { data: parentLinkCount = 0 } = useParentLinkRequestCount(user?.preschool_id);
const { data: activityCount = 0 } = useRecentActivityCount(user?.id, user?.preschool_id);
const { data: overdueCount = 0 } = useOverduePaymentCount(user?.preschool_id);

// ...

<SectionHeader 
  title={t('dashboard.parent_requests')} 
  sectionId="parent-requests" 
  icon="👨‍👩‍👧"
  notificationCount={parentLinkCount}
  notificationVariant="urgent"
/>

<SectionHeader 
  title={t('activity.recent_activity')} 
  sectionId="recent-activity" 
  icon="🔔"
  notificationCount={activityCount}
  notificationVariant="info"
/>

<SectionHeader 
  title={t('dashboard.financial_overview')} 
  sectionId="financials" 
  icon="💰"
  notificationCount={overdueCount}
  notificationVariant="urgent"
/>
```

**Teacher Dashboard**: Add counts for Recent Activity, Reports, Messages  
**Parent Dashboard**: Add counts for Recent Activity, Announcements, Messages

---

### Phase 5: Collapsible UX & Performance (Week 2, Days 4-5)

**Goals**:
- ✅ Correct re-measurement when badges appear/disappear
- ✅ Mark sections as viewed on expand
- ✅ Memoize props to prevent re-render loops

**Implementation**:

```typescript
import { useCallback, useMemo } from 'react';
import { markWidgetAsViewed } from '@/hooks/useNotificationViews';

const handleSectionToggle = useCallback((sectionId: string) => {
  const wasCollapsed = collapsedSections.has(sectionId);
  
  if (wasCollapsed) {
    // Section is expanding - mark as viewed
    markWidgetAsViewed(sectionId);
  }
  
  setCollapsedSections(prev => {
    const newSet = new Set(prev);
    if (wasCollapsed) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    return newSet;
  });
}, [collapsedSections]);

// Memoize badge props
const parentRequestsBadgeProps = useMemo(() => ({
  count: parentLinkCount,
  variant: 'urgent' as const,
  position: 'inline' as const,
}), [parentLinkCount]);
```

**Touch Target Enforcement**:
```typescript
// In NotificationBadge.tsx
<TouchableOpacity
  onPress={onPress}
  disabled={!onPress}
  style={styles.badge}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} // Expands to 44x44
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel={`${count} ${variantLabel}`}
  accessibilityHint="Double tap to view details"
>
  {/* ... badge content */}
</TouchableOpacity>
```

---

### Phase 6: Last Viewed Persistence (Week 2-3, Days 1-3)

**Goal**: Track when users last viewed widgets to compute "new since last view" counts.

#### 6.1 Database Migration

**File**: `supabase/migrations/20250127000000_create_notification_views_table.sql`

```sql
BEGIN;

-- Table to track when users last viewed specific widgets
CREATE TABLE user_notification_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preschool_id uuid NOT NULL REFERENCES preschools(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, preschool_id, widget_type)
);

-- RLS Policies
ALTER TABLE user_notification_views ENABLE ROW LEVEL SECURITY;

-- Users can only select their own view records
CREATE POLICY user_notification_views_select
ON user_notification_views FOR SELECT
USING (user_id = auth.uid() AND preschool_id = (
  SELECT preschool_id FROM users WHERE id = auth.uid()
));

-- Users can insert/update their own view records
CREATE POLICY user_notification_views_upsert
ON user_notification_views FOR INSERT
WITH CHECK (user_id = auth.uid() AND preschool_id = (
  SELECT preschool_id FROM users WHERE id = auth.uid()
));

CREATE POLICY user_notification_views_update
ON user_notification_views FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_notification_views_user_preschool_widget 
ON user_notification_views (user_id, preschool_id, widget_type);

-- Updated_at trigger
CREATE TRIGGER update_notification_views_updated_at
  BEFORE UPDATE ON user_notification_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_notification_views IS 
'Tracks when users last viewed specific widgets for "new since last view" badge counts';

COMMIT;
```

#### 6.2 Hooks Implementation

**File**: `hooks/useNotificationViews.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assertSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Mark a widget as viewed (upsert last_viewed_at timestamp)
 */
export const useMarkWidgetAsViewed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (widgetType: string) => {
      if (!user?.id || !user?.preschool_id) return;
      
      const { error } = await assertSupabase()
        .from('user_notification_views')
        .upsert({
          user_id: user.id,
          preschool_id: user.preschool_id,
          widget_type: widgetType,
          last_viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,preschool_id,widget_type',
        });
      
      if (error) throw error;
    },
    onSuccess: (_, widgetType) => {
      // Invalidate counts that depend on last viewed
      queryClient.invalidateQueries({ 
        queryKey: ['notification-count', widgetType] 
      });
    },
  });
};

/**
 * Get last viewed timestamp for a widget
 */
export const useLastViewedTime = (widgetType: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notification-last-viewed', user?.id, user?.preschool_id, widgetType],
    queryFn: async (): Promise<string | null> => {
      if (!user?.id || !user?.preschool_id) return null;
      
      const { data, error } = await assertSupabase()
        .from('user_notification_views')
        .select('last_viewed_at')
        .eq('user_id', user.id)
        .eq('preschool_id', user.preschool_id)
        .eq('widget_type', widgetType)
        .maybeSingle();
      
      if (error) throw error;
      return data?.last_viewed_at || null;
    },
    enabled: !!user?.id && !!user?.preschool_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Helper to compute counts since last view
 */
export const useCountSinceLastView = (
  widgetType: string,
  table: string,
  preschoolId: string | undefined,
  extraFilters?: Record<string, any>
) => {
  const { data: lastViewed } = useLastViewedTime(widgetType);
  
  return useQuery({
    queryKey: ['notification-count-since-view', widgetType, preschoolId, lastViewed, extraFilters],
    queryFn: async (): Promise<number> => {
      if (!preschoolId) return 0;
      
      const since = lastViewed || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      let query = assertSupabase()
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .gt('created_at', since);
      
      // Apply extra filters
      if (extraFilters) {
        Object.entries(extraFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!preschoolId,
    staleTime: 120 * 1000,
    refetchInterval: 180 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

#### 6.3 Integration Example

```typescript
// In dashboard component
const { mutate: markAsViewed } = useMarkWidgetAsViewed();

const handleSectionExpand = (sectionId: string) => {
  setCollapsedSections(prev => {
    const newSet = new Set(prev);
    newSet.delete(sectionId);
    return newSet;
  });
  
  // Mark as viewed to reset "new since last view" counts
  markAsViewed(sectionId);
};
```

---

### Phase 7: Animations & Accessibility (Week 3, Days 1-2)

**Goal**: Polish badge UX with smooth animations and full accessibility support.

#### 7.1 Animations (Reanimated 3)

**File**: `components/ui/NotificationBadge.tsx`

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  variant = 'info',
  // ... other props
}) => {
  const scale = useSharedValue(count > 0 ? 1 : 0);
  const colorProgress = useSharedValue(0);
  
  // Entrance animation when count goes from 0 to positive
  useEffect(() => {
    if (count > 0) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
    }
  }, [count > 0]);
  
  // Pulse animation when count increases
  useEffect(() => {
    if (count > prevCount.current && count > 0) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
    }
    prevCount.current = count;
  }, [count]);
  
  // Color transition for variant changes
  useEffect(() => {
    colorProgress.value = withTiming(getColorIndex(variant), { duration: 300 });
  }, [variant]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      [COLORS.urgent, COLORS.pending, COLORS.info, COLORS.success]
    ),
  }));
  
  if (count === 0) return null;
  
  return (
    <Animated.View style={[styles.badge, animatedStyle]}>
      <Text style={styles.text}>{count}</Text>
    </Animated.View>
  );
};
```

#### 7.2 Accessibility

**Accessibility Labels**:
```typescript
const getAccessibilityLabel = (count: number, variant: NotificationVariant): string => {
  const variantMap = {
    urgent: 'urgent',
    pending: 'pending',
    info: 'new',
    success: 'completed',
  };
  
  const label = variantMap[variant];
  const plural = count === 1 ? '' : 's';
  
  return `${count} ${label} notification${plural}`;
};

// Usage
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={getAccessibilityLabel(count, variant)}
  accessibilityHint="Double tap to view details"
  accessibilityLiveRegion="polite" // Announces count changes
  accessibilityState={{ disabled: !onPress }}
>
  {/* ... badge content */}
</TouchableOpacity>
```

**Haptic Feedback** (optional, if expo-haptics available):
```typescript
import * as Haptics from 'expo-haptics';

const handlePress = () => {
  if (onPress) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available, skip
    }
    onPress();
  }
};
```

---

### Phase 8: Testing & Documentation (Week 3, Days 3-5)

#### 8.1 Unit Tests

**File**: `__tests__/components/ui/NotificationBadge.test.tsx`

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationBadge } from '@/components/ui/NotificationBadge';

describe('NotificationBadge', () => {
  it('renders with correct count', () => {
    const { getByText } = render(<NotificationBadge count={5} />);
    expect(getByText('5')).toBeTruthy();
  });
  
  it('hides when count is 0', () => {
    const { queryByText } = render(<NotificationBadge count={0} />);
    expect(queryByText('0')).toBeNull();
  });
  
  it('applies urgent variant color', () => {
    const { getByTestId } = render(
      <NotificationBadge count={3} variant="urgent" testID="badge" />
    );
    const badge = getByTestId('badge');
    expect(badge.props.style).toMatchObject({ backgroundColor: '#DC2626' });
  });
  
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <NotificationBadge count={2} onPress={onPress} testID="badge" />
    );
    fireEvent.press(getByTestId('badge'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  
  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <NotificationBadge count={3} variant="urgent" />
    );
    expect(getByLabelText('3 urgent notifications')).toBeTruthy();
  });
  
  // ... more tests for position, size, theme, animations
});
```

#### 8.2 Integration Tests

**File**: `__tests__/integration/notificationBadges.test.tsx`

```typescript
describe('Notification Badges Integration', () => {
  it('shows badge when pending requests exist', async () => {
    // Mock Supabase response
    mockSupabaseQuery('guardian_requests', { count: 3 });
    
    const { getByText } = render(<PendingParentLinkRequests />);
    
    await waitFor(() => {
      expect(getByText('3')).toBeTruthy();
    });
  });
  
  it('filters by preschool_id (multi-tenant)', async () => {
    mockAuthContext({ preschool_id: 'school-123' });
    
    render(<PendingParentLinkRequests />);
    
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('guardian_requests');
      expect(mockSupabase.eq).toHaveBeenCalledWith('preschool_id', 'school-123');
    });
  });
  
  it('auto-refreshes count every 60 seconds', async () => {
    jest.useFakeTimers();
    
    render(<PendingParentLinkRequests />);
    
    // Initial fetch
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    
    // Advance 60 seconds
    jest.advanceTimersByTime(60000);
    
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
    
    jest.useRealTimers();
  });
});
```

#### 8.3 Manual Testing Checklist

**Android Device** (Primary Platform):
- [ ] All designated widgets show badges when counts > 0
- [ ] Badges hide when count = 0
- [ ] Colors match variant semantics (red/orange/blue/green)
- [ ] Exact counts displayed (e.g., "23" not "20+")
- [ ] Touch targets minimum 44x44 (test with accessibility tools)
- [ ] Auto-refresh intervals work (observe badge updates without manual refresh)
- [ ] Dark mode colors readable and accessible
- [ ] Animations smooth (entrance, pulse, color transitions)
- [ ] Screen reader announces badge text
- [ ] Multi-tenant isolation (no cross-school data leakage)
- [ ] Performance acceptable (dashboard load < 1.5s)

#### 8.4 Documentation

**File**: `docs/components/NOTIFICATION_BADGES.md`

**Contents**:
```markdown
# Notification Badge System

## Overview
Unified notification badge system for EduDash Pro dashboards.

## Usage

### Basic Badge
\`\`\`typescript
import { NotificationBadge } from '@/components/ui/NotificationBadge';

<NotificationBadge count={5} variant="info" position="inline" />
\`\`\`

### With Count Hook
\`\`\`typescript
import { useParentLinkRequestCount } from '@/hooks/useNotificationCounts';

const { data: count = 0 } = useParentLinkRequestCount(preschoolId);

<NotificationBadge count={count} variant="urgent" onPress={handleNavigate} />
\`\`\`

## API Reference

### NotificationBadge Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| count | number | required | Exact count to display |
| variant | NotificationVariant | 'info' | Color theme: urgent, pending, info, success |
| position | NotificationPosition | 'inline' | Layout: inline or corner |
| size | NotificationSize | 'medium' | Visual size: small, medium, large |
| onPress | () => void | undefined | Optional tap handler |
| testID | string | undefined | Test identifier |

## Available Hooks
- \`useParentLinkRequestCount(preschoolId)\` - Pending link requests (urgent)
- \`useRegistrationRequestCount(preschoolId)\` - Pending registrations (pending)
- \`useUnreadMessageCount(userId, preschoolId)\` - Unread messages (info)
- \`useAnnouncementCount(userId, preschoolId)\` - New announcements (info)
- \`useRecentActivityCount(userId, preschoolId)\` - New activities (info)
- \`useOverduePaymentCount(preschoolId)\` - Overdue invoices (urgent)
- \`usePendingReportCount(userId, preschoolId, role)\` - Reports to review (pending)

## Database Schema
See \`supabase/migrations/20250127000000_create_notification_views_table.sql\`

## Troubleshooting
- **Counts not updating**: Check TanStack Query DevTools; verify RLS policies
- **Cross-tenant data**: Ensure \`preschool_id\` in query filters and keys
- **Performance issues**: Check indexes with \`EXPLAIN ANALYZE\`
\`\`\`

---

### Phase 9: Performance Optimization (Week 3-4, Days 1-2)

#### 9.1 Database Indexes

**File**: `supabase/migrations/20250128000000_add_notification_indexes.sql`

```sql
BEGIN;

-- Partial indexes for common notification queries
CREATE INDEX CONCURRENTLY idx_guardian_requests_pending 
ON guardian_requests (preschool_id, status, created_at DESC) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY idx_child_registration_requests_pending 
ON child_registration_requests (preschool_id, status, created_at DESC) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY idx_invoices_overdue 
ON invoices (preschool_id, status, due_date) 
WHERE status = 'overdue';

CREATE INDEX CONCURRENTLY idx_announcements_recent 
ON announcements (preschool_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_student_progress_reports_pending 
ON student_progress_reports (preschool_id, status, teacher_id) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY idx_messages_unread 
ON messages (thread_id, created_at DESC, sender_id) 
WHERE deleted_at IS NULL;

-- Analyze tables for query planner
ANALYZE guardian_requests;
ANALYZE child_registration_requests;
ANALYZE invoices;
ANALYZE announcements;
ANALYZE student_progress_reports;
ANALYZE messages;

COMMIT;
```

#### 9.2 Batch Count Queries

**File**: `hooks/useAllNotificationCounts.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { assertSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AllNotificationCounts {
  parentLinkRequests: number;
  registrationRequests: number;
  unreadMessages: number;
  announcements: number;
  recentActivity: number;
  overduePayments: number;
  pendingReports: number;
}

/**
 * Fetch all notification counts in parallel
 * More efficient than individual hooks when dashboard loads
 */
export const useAllNotificationCounts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['all-notification-counts', user?.id, user?.preschool_id],
    queryFn: async (): Promise<AllNotificationCounts> => {
      if (!user?.id || !user?.preschool_id) {
        return {
          parentLinkRequests: 0,
          registrationRequests: 0,
          unreadMessages: 0,
          announcements: 0,
          recentActivity: 0,
          overduePayments: 0,
          pendingReports: 0,
        };
      }
      
      const supabase = assertSupabase();
      
      // Execute all count queries in parallel
      const [
        parentLinkRes,
        registrationRes,
        // ... other queries
      ] = await Promise.all([
        supabase
          .from('guardian_requests')
          .select('*', { count: 'exact', head: true })
          .eq('preschool_id', user.preschool_id)
          .eq('status', 'pending'),
        
        supabase
          .from('child_registration_requests')
          .select('*', { count: 'exact', head: true })
          .eq('preschool_id', user.preschool_id)
          .eq('status', 'pending'),
        
        // ... other count queries
      ]);
      
      return {
        parentLinkRequests: parentLinkRes.count || 0,
        registrationRequests: registrationRes.count || 0,
        // ... other counts
      };
    },
    enabled: !!user?.id && !!user?.preschool_id,
    staleTime: 60 * 1000,      // 60 seconds
    refetchInterval: 90 * 1000, // 90 seconds
    gcTime: 10 * 60 * 1000,
  });
};
```

**Usage** (Dashboard Component):
```typescript
const { data: allCounts } = useAllNotificationCounts();

// Individual fallback hooks still available for granular control
const { data: parentLinkCount = allCounts?.parentLinkRequests || 0 } = 
  useParentLinkRequestCount(user?.preschool_id);
```

#### 9.3 AsyncStorage Persistence

**Leverage existing TanStack Query persistence** (if configured):

```typescript
// In app root or QueryClient setup
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'EDUDASH_NOTIFICATION_COUNTS',
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 10, // 10 minutes (counts are time-sensitive)
});
```

---

### Phase 10: Rollout & Monitoring (Week 4, Days 1-3)

#### 10.1 Feature Flag

**Environment Variable**:
```bash
# .env
EXPO_PUBLIC_ENABLE_NOTIFICATION_BADGES=true
```

**Usage**:
```typescript
// In NotificationBadge.tsx
export const NotificationBadge: React.FC<NotificationBadgeProps> = (props) => {
  const enabled = process.env.EXPO_PUBLIC_ENABLE_NOTIFICATION_BADGES === 'true';
  
  if (!enabled || props.count === 0) return null;
  
  // ... render badge
};
```

#### 10.2 Analytics (PostHog - Production Only)

**Events to Track**:

```typescript
import { usePostHog } from 'posthog-react-native';

// Badge viewed
posthog?.capture('notification_badge_viewed', {
  widget_type: 'parent_link_requests',
  count: 3,
  variant: 'urgent',
  role: 'principal',
});

// Badge clicked
posthog?.capture('notification_badge_clicked', {
  widget_type: 'announcements',
  count: 5,
  variant: 'info',
  navigation_target: '/screens/announcements',
});

// Count cleared (went to 0)
posthog?.capture('notification_cleared', {
  widget_type: 'parent_link_requests',
  previous_count: 3,
  action: 'approved_all',
});
```

#### 10.3 Monitoring (Sentry)

**Performance Tracking**:
```typescript
import * as Sentry from 'sentry-expo';

// Badge render span
const transaction = Sentry.startTransaction({
  name: 'notification_badge_render',
  op: 'ui.render',
});

const span = transaction.startChild({
  op: 'query',
  description: 'fetch_notification_counts',
});

// ... fetch counts

span.finish();
transaction.finish();
```

**Alerts**:
- P95 count query latency > 200ms
- Dashboard load time > 2 seconds
- Error rate > 1% on notification hooks

#### 10.4 User Feedback

**In-app Prompt** (after 5 interactions with badges):
```typescript
// Simple modal or toast
<Modal visible={showFeedback}>
  <View>
    <Text>How useful are the notification badges?</Text>
    <View style={styles.ratingButtons}>
      <Button title="👍 Very" onPress={() => submitFeedback(5)} />
      <Button title="😐 Okay" onPress={() => submitFeedback(3)} />
      <Button title="👎 Not" onPress={() => submitFeedback(1)} />
    </View>
  </View>
</Modal>
```

---

## Security & Multi-Tenancy

### Row-Level Security (RLS) Policies

**Critical Rules**:
1. ✅ All count queries **MUST** include `.eq('preschool_id', currentPreschoolId)`
2. ✅ RLS policies enforce tenant isolation at database level
3. ✅ Query keys **MUST** include `preschoolId` to prevent cache cross-contamination
4. ✅ Only authorized roles can view counts (e.g., principals see all, teachers see their classes)

**Example RLS Policy** (guardian_requests):
```sql
CREATE POLICY guardian_requests_staff_count
ON guardian_requests FOR SELECT
USING (
  preschool_id IN (
    SELECT preschool_id FROM users WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('principal', 'teacher', 'admin')
  )
);
```

**Audit Logging**:
- All approval/rejection actions logged with `approved_by` user ID
- `user_notification_views` tracks when users viewed widgets
- Sentry captures unauthorized access attempts

---

## Testing Strategy

### Coverage Targets

- **Unit Tests**: 80%+ coverage for `NotificationBadge.tsx` and hooks
- **Integration Tests**: All widget badge integrations + multi-tenant isolation
- **E2E Tests**: Critical user flows (approve request → badge count drops)

### Test Scenarios

**Functional Tests**:
- ✅ Badge renders with correct count and color
- ✅ Badge hides when count = 0
- ✅ onPress navigation works
- ✅ Auto-refresh intervals trigger correctly
- ✅ Dark mode colors readable

**Security Tests**:
- ✅ RLS prevents cross-tenant data access
- ✅ Query keys include preschoolId
- ✅ Unauthorized roles cannot view counts

**Performance Tests**:
- ✅ Count queries < 200ms (p95)
- ✅ Badge render < 16ms
- ✅ Dashboard load < 1.5s with all badges

**Accessibility Tests**:
- ✅ Screen reader announces badge text
- ✅ Touch targets ≥ 44x44
- ✅ Color contrast meets WCAG AA

---

## Rollout & Monitoring

### Phased Rollout

**Week 1**: Internal Testing
- Enable for development and staging environments
- Team dogfooding and feedback

**Week 2**: Beta Release
- Enable for 10% of production users (feature flag)
- Monitor performance and error rates

**Week 3**: General Availability
- Enable for 50% of users
- Collect analytics and feedback

**Week 4**: Full Rollout
- Enable for 100% of users
- Monitor success metrics

### Success Metrics

**KPIs**:
- **Badge Visibility**: 100% of designated widgets show badges when count > 0
- **Accuracy**: Counts match database within 2 minutes of changes
- **Performance**: P95 dashboard load time < 1.5 seconds
- **Adoption**: 70%+ of users interact with badges within first week
- **Engagement**: 30% increase in action completion (approvals, message reads)

**Monitoring Dashboard** (PostHog/Sentry):
- Badge view/click rates by widget type
- Average time to action after badge viewed
- Error rates and query latencies
- User feedback ratings

---

## Rollback Plan

### Instant Disable

**Step 1**: Set feature flag to `false`
```bash
EXPO_PUBLIC_ENABLE_NOTIFICATION_BADGES=false
```

**Step 2**: Push OTA update via EAS
```bash
eas update --branch production --message "Disable notification badges"
```

**Result**: All badges hidden; existing UI intact

### Database Rollback

**If migration issues occur**:
```sql
-- Revert notification_views table
DROP TABLE IF EXISTS user_notification_views CASCADE;

-- Revert indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_guardian_requests_pending;
-- ... other indexes
```

**Note**: Database additions are **additive only**; no destructive changes.

---

## File Structure & Deliverables

### New Files

```
components/
  ui/
    NotificationBadge.tsx             # Reusable badge component
    NotificationBadge.stories.tsx     # Storybook examples (optional)

hooks/
  useNotificationCounts.ts            # Individual count hooks
  useNotificationViews.ts             # Last viewed tracking
  useAllNotificationCounts.ts         # Batch queries

types/
  notifications.ts                    # Type definitions

supabase/
  migrations/
    20250127000000_create_notification_views_table.sql
    20250128000000_add_notification_indexes.sql

__tests__/
  components/
    ui/
      NotificationBadge.test.tsx      # Unit tests
  integration/
    notificationBadges.test.tsx       # Integration tests

docs/
  components/
    NOTIFICATION_BADGES.md            # Complete documentation
```

### Updated Files

```
components/
  dashboard/
    PendingParentLinkRequests.tsx     # Use NotificationBadge
    PendingLinkRequests.tsx           # Use NotificationBadge
    PendingRegistrationRequests.tsx   # Add badge
    cards/
      AnnouncementsCard.tsx           # Add corner badge
      DashboardCard.tsx               # Support corner badges
    NewEnhancedPrincipalDashboard.tsx # Wire section badges
    NewEnhancedTeacherDashboard.tsx   # Wire section badges
    NewEnhancedParentDashboard.tsx    # Wire section badges
```

---

## Quality & Acceptance Criteria

### Version Compliance

- ✅ **React Native 0.79.5**: Functional components with hooks only
- ✅ **Expo SDK 53**: Use Expo Router v5 navigation patterns
- ✅ **TanStack Query v5**: Import from `@tanstack/react-query` (not `react-query`)
- ✅ **Supabase JS v2**: Use v2 syntax (`.select()`, `.eq()`, etc.)
- ✅ **TypeScript 5.8**: Strict-safe code (even if project strict mode is off)

### Security Checklist

- ✅ All queries filtered by `preschool_id`
- ✅ RLS policies enforce tenant isolation
- ✅ No client-side count manipulation
- ✅ Only owners can update `user_notification_views`
- ✅ Query keys include `preschoolId` to prevent cache leaks

### Performance Targets

- ✅ Badge render time < 16ms (60fps)
- ✅ Count queries p95 < 200ms
- ✅ Dashboard load with badges < 1.5s (Android mid-range device)
- ✅ No memory leaks or re-render loops

### Accessibility Standards

- ✅ Screen reader labels and hints provided
- ✅ `accessibilityLiveRegion` announces count changes
- ✅ Touch targets minimum 44x44 pixels
- ✅ Color contrast meets WCAG AA (4.5:1)
- ✅ Keyboard navigation support (future web/desktop)

### Testing Requirements

- ✅ 80%+ unit test coverage for `NotificationBadge`
- ✅ Integration tests for all widget integrations
- ✅ Multi-tenant isolation verified (no data leakage)
- ✅ Manual Android device testing checklist completed
- ✅ Accessibility audit passed

---

## Timeline Summary

**Total Duration**: 3-4 weeks (20-25 working days)

| Week | Phase | Days | Deliverables |
|------|-------|------|--------------|
| **Week 1** | Foundation | 1-2 | NotificationBadge component + types |
|  |  | 3-4 | Notification count hooks |
|  |  | 5-7 | Widget integration (start) |
| **Week 2** | Integration | 1-3 | SectionHeader + dashboard sections |
|  |  | 4-5 | Collapsible UX + performance |
|  | Persistence | 1-3 | Last viewed tracking (parallel) |
| **Week 3** | Polish | 1-2 | Animations + accessibility |
|  | Testing | 3-5 | Unit/integration tests + docs |
| **Week 3-4** | Optimization | 1-2 | Performance + batch queries |
|  | Rollout | 1-3 | Analytics + monitoring + feedback |

---

## Common Pitfalls & Solutions

### Pitfall 1: Missing `preschool_id` in Queries

**Problem**: Cross-tenant data leakage  
**Solution**: Always include `.eq('preschool_id', preschoolId)` and add to query keys

### Pitfall 2: Wrong TanStack Query Import

**Problem**: Import from `react-query` (v4) instead of `@tanstack/react-query` (v5)  
**Solution**: Use v5 imports; check via ESLint rule

### Pitfall 3: FlashList Without `estimatedItemSize`

**Problem**: Janky scrolling in badge lists  
**Solution**: Always set `estimatedItemSize` prop

### Pitfall 4: DOM APIs in TypeScript

**Problem**: `tsconfig.json` includes `"dom"` in `lib` array  
**Solution**: Keep only `"esnext"` for React Native

### Pitfall 5: Badge Re-render Loops

**Problem**: Non-memoized props cause infinite re-renders  
**Solution**: Use `useMemo` and `useCallback` for badge props

### Pitfall 6: Count Queries Fetching Full Rows

**Problem**: Slow queries fetching data instead of just counts  
**Solution**: Always use `.select('*', { count: 'exact', head: true })`

---

## Implementation Notes

### Dependencies (No New Ones)

All features use **existing dependencies**:
- ✅ `@tanstack/react-query` (already in project)
- ✅ `react-native-reanimated` (already in project)
- ✅ `expo-haptics` (optional, if already available)
- ✅ `@react-native-async-storage/async-storage` (already in project)

### File Size Constraints

- `NotificationBadge.tsx`: **< 200 lines** (extract helpers if needed)
- `useNotificationCounts.ts`: **< 500 lines** (split if hooks grow)
- `useNotificationViews.ts`: **< 200 lines**

### Code Quality Gates

**Pre-commit**:
```bash
npm run typecheck  # TypeScript errors
npm run lint       # ESLint (max 200 warnings)
npm run test       # Unit tests pass
```

**Pre-merge**:
```bash
npm run lint:sql   # SQL migration validation
npm run test:integration  # Integration tests pass
```

---

## Related Documentation

- **Parent-Child Linking**: `docs/features/PARENT_CHILD_LINKING_PLAN.md`
- **RLS Security Model**: `docs/security/RLS_POLICIES.md`
- **Multi-Tenant Architecture**: `docs/security/tenant_model.md`
- **TanStack Query Patterns**: `docs/patterns/TANSTACK_QUERY_BEST_PRACTICES.md`
- **Dashboard Component Guide**: `docs/components/DASHBOARD_COMPONENTS.md`

---

## Questions & Support

**Slack Channel**: `#edudash-notifications`  
**Tech Lead**: Review required for RLS policy changes  
**Design Review**: Required for new badge variants/positions

---

**Status**: ✅ **Implementation Plan Complete**  
**Next Action**: Begin Phase 1 (NotificationBadge component)  
**Approval Required**: Tech Lead + Product Manager

---

*Last Updated: 2025-01-27*  
*Version: 1.0*  
*Author: AI Assistant (Warp)*
