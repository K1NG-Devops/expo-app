# Dash AI Conversation Tenant Isolation

**Date**: 2025-10-22  
**Status**: ✅ Implemented  
**Phase**: Phase 6 (Production Readiness) - Database Guardrails

## Problem Statement

Dash AI conversations were stored exclusively in AsyncStorage without any `preschool_id` filtering, creating a critical multi-tenant security vulnerability:

- ❌ Conversations persisted across preschool switches
- ❌ No server-side enforcement of tenant isolation
- ❌ Shared device scenarios could leak conversation history
- ❌ No RLS policies protecting conversation data

## Solution Overview

Migrated Dash AI conversations from AsyncStorage-only storage to Supabase with proper Row-Level Security (RLS) tenant isolation.

### Architecture Changes

**Before**:
```
AsyncStorage (client-side only)
└── dash_conversations_{conversationId}
    └── No preschool_id filtering
```

**After**:
```
Supabase Table: public.ai_conversations
├── RLS policies enforcing preschool_id isolation
├── Server-side tenant validation
└── AsyncStorage used only for current conversation pointer
```

## Implementation Details

### 1. Database Migration

**File**: `supabase/migrations/20251022161523_ai_conversations_with_tenant_isolation.sql`

**Schema**:
```sql
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preschool_id uuid NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  conversation_id text NOT NULL UNIQUE,
  title text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS Policies**:
- ✅ SELECT: Users can only view conversations for their current `preschool_id`
- ✅ INSERT: Users can only create conversations with their current `preschool_id`
- ✅ UPDATE: Users can only modify conversations in their current `preschool_id`
- ✅ DELETE: Users can only delete conversations in their current `preschool_id`

All policies verify `preschool_id` via:
```sql
preschool_id IN (
  SELECT preschool_id FROM public.profiles WHERE id = auth.uid()
)
```

### 2. Supabase Service Layer

**File**: `services/dash-ai/DashConversationService.ts`

**Key Features**:
- Constructor requires `userId` and `preschoolId` (enforces tenant context)
- All queries filter by `preschool_id`:
  ```typescript
  .eq('user_id', this.userId)
  .eq('preschool_id', this.preschoolId) // REQUIRED for tenant isolation
  ```
- CRUD operations: create, read, update, delete conversations
- Message management: add messages, get recent messages
- Storage optimization: trim old messages

### 3. DashConversationManager Refactor

**File**: `services/dash-ai/DashConversationManager.ts`

**Changes**:
- Now delegates all storage operations to `DashConversationService`
- Requires `userId` and `preschoolId` in constructor config
- Maintains same public API for backward compatibility
- AsyncStorage used only for current conversation pointer (non-sensitive)

### 4. DashAICore Integration

**File**: `services/dash-ai/DashAICore.ts`

**Updates**:
- Added `preschoolId` to `DashAICoreConfig.currentUser`
- Passes `userId` and `preschoolId` to `DashConversationManager`
- Warns if tenant context is missing

### 5. DashAICompat Session Fetch

**File**: `services/dash-ai/DashAICompat.ts`

**Enhancement**:
- Fetches `preschool_id` from `profiles` table during initialization
- Passes `preschoolId` to `DashAICore.currentUser`
- Ensures tenant context available for all conversation operations

### 6. Migration Utility

**File**: `services/dash-ai/migrateConversationsToSupabase.ts`

**Purpose**: One-time migration of existing AsyncStorage conversations to Supabase

**Features**:
- Fetches user's `preschool_id` from profile
- Validates conversation structure
- Idempotent (tracks completion via flag)
- Handles partial failures gracefully
- Optional: Delete local AsyncStorage conversations after migration

**Usage**:
```typescript
import { migrateConversationsToSupabase } from '@/services/dash-ai/migrateConversationsToSupabase';

// Run once per user during app initialization
const result = await migrateConversationsToSupabase(userId, {
  deleteLocal: true, // Optional: clean up AsyncStorage after migration
});

console.log(`Migrated: ${result.migratedCount}, Errors: ${result.errorCount}`);
```

## Security Guarantees

✅ **Server-side enforcement**: RLS policies prevent unauthorized access  
✅ **Tenant isolation**: All queries filtered by `preschool_id`  
✅ **Cross-device sync**: Conversations stored server-side  
✅ **User switching**: Old preschool conversations no longer accessible  
✅ **Shared devices**: No conversation leakage across tenants

## Testing Checklist

### Functional Testing
- [ ] Create new conversation → Verify `preschool_id` assigned correctly
- [ ] Switch preschools → Verify old conversations not visible
- [ ] Add message to conversation → Verify `preschool_id` filter applied
- [ ] Delete conversation → Verify only affects current preschool
- [ ] Get all conversations → Verify RLS filters by preschool

### Security Testing
- [ ] Attempt to access another preschool's conversation → Should fail
- [ ] Modify `preschool_id` in client request → Should be rejected by RLS
- [ ] User without `preschool_id` → Graceful degradation with warning

### Migration Testing
- [ ] Run migration with existing AsyncStorage conversations → Success
- [ ] Run migration twice → Idempotent (no duplicates)
- [ ] Migration with invalid conversations → Skipped, no crash

## Performance Considerations

- **Query Efficiency**: Indexed on `(user_id, preschool_id, updated_at)`
- **Message Storage**: JSONB for efficient message array storage
- **Caching**: TanStack Query caching recommended for frequent reads
- **Trimming**: Built-in message limit enforcement to prevent bloat

## Rollout Plan

1. **Deploy migration**: `supabase db push` to production
2. **Deploy code**: Update app with new conversation service
3. **Trigger migration**: Call `migrateConversationsToSupabase()` on app initialization
4. **Monitor**: Check Sentry for migration errors
5. **Verify**: Query `ai_conversations` table to confirm data migration

## Rollback Plan

If issues arise:
1. RLS policies can be temporarily disabled (not recommended)
2. Code can fall back to AsyncStorage-only mode (requires code rollback)
3. Migration can be re-run with `force: true` option

## Documentation References

- **WARP.md**: Multi-tenant security model (lines 33-40, RLS requirements)
- **Supabase v2 API**: https://supabase.com/docs/reference/javascript/select
- **RLS Best Practices**: `docs/security/` directory

## Related Issues

- Fixes: Dash AI conversations not isolated by preschool
- Aligns with: Phase 6 (Production Readiness) from `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md`

## Next Steps

- [ ] Add automated tests for RLS policies
- [ ] Implement conversation export/import for preschool transfer
- [ ] Add admin tools to view/manage conversations per preschool
- [ ] Monitor query performance and optimize indexes if needed

---

**Implementation Complete**: All conversations now properly isolated by `preschool_id` with server-side RLS enforcement.
