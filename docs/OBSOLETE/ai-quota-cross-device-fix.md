# AI Quota Management Cross-Device Fix

## Problem Summary

The previous quota management system had a fundamental flaw: it relied on local storage for usage tracking, which caused quota inconsistencies when users switched devices. Here's what was happening:

1. **Device A**: User uses 3/10 quotas → stored locally + synced to server
2. **Device B**: User switches devices → local storage is empty (0/10) → quota appears reset
3. **Result**: User could exceed their actual quota limits by switching devices

## Root Cause Analysis

The issue was in the `getCombinedUsage()` function in `lib/ai/usage.ts`:

```typescript
// PROBLEMATIC OLD CODE
if (serverTotal === 0 && localTotal > 0) {
  return local  // This caused quota resets on new devices!
}

// Prefer per-feature max to handle partial lag  
return {
  lesson_generation: Math.max(server.lesson_generation, local.lesson_generation),
  // ... more max logic that was unreliable
}
```

## Solution Architecture

### 1. Server-Authoritative Usage Tracking

**Changed**: `getCombinedUsage()` now treats server as the single source of truth:

```typescript
// NEW SERVER-AUTHORITATIVE APPROACH
export async function getCombinedUsage(): Promise<AIUsageRecord> {
  const server = await getServerUsage()
  if (server) {
    return server  // Always prefer server data
  }
  
  // Fallback to local only when server is completely unavailable
  const local = await getUsage()
  console.warn('Using local usage as fallback - server unavailable:', local)
  return local
}
```

### 2. Write-Through Cache Pattern

**Changed**: `incrementUsage()` now immediately syncs to server:

```typescript
// NEW WRITE-THROUGH APPROACH
export async function incrementUsage(feature: AIUsageFeature, count = 1, model = 'unknown'): Promise<void> {
  try {
    // 1. Immediately sync to server (write-through)
    await logUsageEvent(event)
    
    // 2. Clear local cache since server is now authoritative
    await storage.removeItem(key)
    
  } catch (serverError) {
    // 3. Fallback: update local storage for offline scenarios
    const next = { ...current, [feature]: (current[feature] || 0) + count }
    await storage.setItem(key, JSON.stringify(next))
    
    // 4. Queue for retry when connectivity is restored
    await enqueueUsageLog(event)
  }
}
```

### 3. App Startup Synchronization

**Added**: `syncLocalUsageToServer()` function that runs on app startup:

```typescript
// NEW STARTUP SYNC
export async function syncLocalUsageToServer(): Promise<void> {
  const local = await getUsage()
  const localTotal = local.lesson_generation + local.grading_assistance + local.homework_help
  
  if (localTotal > 0) {
    // Sync accumulated local usage to server
    for (const [feature, count] of Object.entries(local)) {
      if (count > 0) {
        await assertSupabase().functions.invoke('ai-usage', { 
          body: { action: 'bulk_increment', feature, count }
        })
      }
    }
    
    // Clear local storage after successful sync
    await storage.removeItem(key)
  }
}
```

### 4. Enhanced Retry Mechanism

**Improved**: `flushUsageLogQueue()` with exponential backoff:

- Batch processing to avoid overwhelming server
- Exponential backoff: 1s, 2s, 4s, 8s, etc.
- Maximum retry attempts with graceful failure
- Metadata tracking for retry state

### 5. Teacher Allocation Consistency

**Fixed**: `getTeacherSpecificQuota()` now prioritizes server data:

```typescript
// OLD PROBLEMATIC CODE
const effectiveUsed = Math.max(usedAmount, localUsed)  // Could cause inconsistencies

// NEW SERVER-AUTHORITATIVE CODE  
let effectiveUsed = usedAmount  // Server is authoritative
if (usedAmount === 0 && localUsed > 0) {
  effectiveUsed = localUsed  // Only fallback when server shows no usage
}
```

## Implementation Guide

### Step 1: Add Usage Sync to Your App

Import and use the sync hook in your main app component:

```tsx
import { useUsageSync } from '@/lib/ai/hooks/useUsageSync'

export default function App() {
  useUsageSync()  // Add this line
  
  return (
    <YourAppContent />
  )
}
```

### Step 2: Update Usage Increment Calls

Update existing `incrementUsage` calls to include model information:

```typescript
// OLD
await incrementUsage('lesson_generation')

// NEW (with model info for better tracking)
await incrementUsage('lesson_generation', 1, 'claude-3-sonnet')
```

### Step 3: Edge Function Updates (Required)

Your `ai-usage` edge function needs to support the new `bulk_increment` action:

```typescript
// Add to your edge function
if (body.action === 'bulk_increment') {
  const { feature, count } = body
  // Increment usage by count for the given feature
  // Update your database accordingly
}
```

### Step 4: Verify Server-Side Storage

Ensure your server-side usage tracking properly stores data in the database tables:
- `ai_usage_logs` for detailed event tracking
- `teacher_ai_allocations.used_quotas` for quota enforcement

## Benefits

1. **Cross-Device Consistency**: Users see accurate quota usage regardless of device
2. **Reliable Offline Support**: Local caching still works when offline
3. **Better Performance**: Reduced server requests through write-through caching
4. **Audit Trail**: Enhanced logging for debugging and compliance
5. **Graceful Degradation**: Falls back appropriately when server is unavailable

## Testing Scenarios

Test these scenarios to verify the fix:

1. **Cross-Device Sync**:
   - Use quotas on Device A
   - Switch to Device B
   - Verify quota usage is consistent

2. **Offline Usage**:
   - Disconnect from internet
   - Use quotas (should cache locally)
   - Reconnect to internet
   - Verify local usage syncs to server

3. **Server Failure Recovery**:
   - Simulate server downtime during usage
   - Verify usage queues for retry
   - Restore server
   - Verify queued usage eventually syncs

## Migration Notes

This is a backward-compatible change. The system will:

1. Continue to work with existing local storage data
2. Gradually sync local data to server on app starts
3. Clear local caches as server becomes authoritative
4. Maintain fallback behavior for offline scenarios

## Monitoring

Watch for these log messages to monitor the system:

- `[Usage Sync] Syncing local usage to server` - Startup sync working
- `[Usage] Successfully synced [feature] usage to server` - Real-time sync working  
- `[Usage Queue] All X events synced successfully` - Retry system working
- `[Usage] Using local usage as fallback` - Server unavailable (investigate if frequent)