# AI Gateway 429 Rate Limit Error - Concise Fix

## Problem

```
ERROR [Dash] AI Gateway Error: {..., "status": 429, "message": "Edge Function returned a non-2xx status code"}
ERROR [Dash] AI service call failed: {..., "status": 429}
```

**Root Cause:** Your Supabase Edge Function `ai-gateway` is hitting rate limits from Anthropic's API (Claude). The error occurs when:
1. Too many AI requests in short time window
2. Anthropic API rate limits exceeded
3. Edge Function timeout/throttling

---

## Quick Fix Options

### Option 1: Increase Retry Backoff (Immediate - Client Side)

**File:** Search for AI Gateway retry logic (likely in `services/DashAIAssistant.ts` or `lib/ai-gateway/`)

**Change:**
```typescript
// Current (likely)
const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

// Change to exponential backoff with longer delays
const delays = [2000, 5000, 15000]; // 2s, 5s, 15s
```

**OR better - Add jitter:**
```typescript
const getRetryDelay = (attempt: number) => {
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential up to 30s
  const jitter = Math.random() * 1000; // Add 0-1s random jitter
  return baseDelay + jitter;
};
```

---

### Option 2: Add Request Queue (Recommended - Client Side)

**Create:** `lib/ai-gateway/request-queue.ts`

```typescript
class AIRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private minDelay = 1000; // 1 second between requests

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      await request();
      await new Promise(resolve => setTimeout(resolve, this.minDelay));
    }
    
    this.processing = false;
  }
}

export const aiRequestQueue = new AIRequestQueue();
```

**Usage in AI service:**
```typescript
// Wrap AI calls
const response = await aiRequestQueue.enqueue(() => 
  fetch('https://...supabase.co/functions/v1/ai-gateway', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
);
```

---

### Option 3: Add Caching (Best - Client Side)

**File:** `lib/ai-gateway/cache.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'ai_response_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedResponse(requestHash: string) {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${requestHash}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${requestHash}`);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

export async function setCachedResponse(requestHash: string, data: any) {
  try {
    await AsyncStorage.setItem(
      `${CACHE_KEY_PREFIX}${requestHash}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

// Generate hash from request
export function hashRequest(messages: any[], model: string): string {
  const str = JSON.stringify({ messages, model });
  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
```

**Usage:**
```typescript
// Before making AI request
const requestHash = hashRequest(messages, model);
const cached = await getCachedResponse(requestHash);
if (cached) return cached;

// After successful request
await setCachedResponse(requestHash, response);
```

---

### Option 4: Server-Side Fix (Supabase Edge Function)

**File:** `supabase/functions/ai-gateway/index.ts`

**Add Rate Limiting with Redis (if available):**
```typescript
// At the top of the function
const RATE_LIMIT_KEY = `rate_limit:${userId}`;
const MAX_REQUESTS_PER_MINUTE = 10;

// Check rate limit
const currentCount = await redis.incr(RATE_LIMIT_KEY);
if (currentCount === 1) {
  await redis.expire(RATE_LIMIT_KEY, 60); // 60 seconds
}

if (currentCount > MAX_REQUESTS_PER_MINUTE) {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded. Please wait a moment.',
      retryAfter: 60 
    }),
    { status: 429, headers: { 'Retry-After': '60' } }
  );
}
```

**OR Add Anthropic-specific Rate Limit Handling:**
```typescript
// Wrap Anthropic API call
try {
  const response = await anthropic.messages.create(payload);
  return response;
} catch (error: any) {
  if (error.status === 429) {
    // Return specific retry-after from Anthropic
    const retryAfter = error.headers?.['retry-after'] || 60;
    return new Response(
      JSON.stringify({ 
        error: 'AI service rate limit. Please try again in a moment.',
        retryAfter: parseInt(retryAfter)
      }),
      { 
        status: 429, 
        headers: { 
          'Retry-After': retryAfter.toString(),
          'X-Rate-Limit-Reset': error.headers?.['x-ratelimit-reset'] || ''
        } 
      }
    );
  }
  throw error;
}
```

---

## Recommended Implementation (Quickest Impact)

### Step 1: Add Request Queue (5 minutes)

Create `lib/ai-gateway/request-queue.ts` with the code from Option 2.

### Step 2: Update AI Service (2 minutes)

Find where you call the AI gateway (search for `'/functions/v1/ai-gateway'`):

```typescript
// Before
const response = await fetch(url, options);

// After
import { aiRequestQueue } from '@/lib/ai-gateway/request-queue';
const response = await aiRequestQueue.enqueue(() => fetch(url, options));
```

### Step 3: Improve Error Messaging (3 minutes)

When 429 occurs, show user-friendly message:

```typescript
if (error.status === 429) {
  Alert.alert(
    'AI Assistant Busy',
    'Too many requests. Please wait a moment and try again.',
    [{ text: 'OK' }]
  );
  return; // Don't retry automatically
}
```

---

## Long-Term Solutions

1. **Upgrade Anthropic Tier:** Check if you're on free tier - upgrade for higher limits
2. **Implement User-Level Rate Limiting:** Track requests per user in database
3. **Add Request Prioritization:** VIP users or critical requests get higher priority
4. **Use Anthropic Prompt Caching:** Cache system prompts to reduce tokens
5. **Batch Similar Requests:** Group multiple user queries into one API call
6. **Monitor Usage:** Set up alerts when approaching rate limits

---

## Quick Diagnostics

Check your current usage:

1. **Anthropic Console:** https://console.anthropic.com/settings/usage
   - View API usage and rate limit tiers
   
2. **Supabase Logs:** 
   ```bash
   supabase functions logs ai-gateway --limit 100
   ```
   - Look for 429 responses from Anthropic

3. **Check Rate Limit Headers:**
   ```typescript
   console.log('Rate Limit:', response.headers.get('x-ratelimit-limit'));
   console.log('Remaining:', response.headers.get('x-ratelimit-remaining'));
   console.log('Reset:', response.headers.get('x-ratelimit-reset'));
   ```

---

## Implementation Priority

**Do This Now (< 10 minutes):**
1. ✅ Add request queue (Option 2)
2. ✅ Improve error messages
3. ✅ Increase retry delays

**Do This Week:**
1. Add caching for duplicate requests (Option 3)
2. Check Anthropic tier and upgrade if needed
3. Monitor usage patterns

**Do This Month:**
1. Implement server-side rate limiting
2. Add request prioritization
3. Optimize prompts to reduce token usage

---

## Testing the Fix

1. **Before:** Multiple rapid AI requests → 429 errors
2. **After:** Requests queued → 1 second between calls → no 429 errors

**Verify:**
```typescript
// Make 10 rapid requests
for (let i = 0; i < 10; i++) {
  console.log(`Request ${i} started at ${Date.now()}`);
  await sendAIRequest();
}
// Should see ~1000ms gaps between requests
```

---

## Summary

**Immediate Fix (Client Side):**
- Add request queue to prevent burst requests
- Increase retry delays
- Better error messages

**Root Cause:**
- Too many concurrent AI requests
- Anthropic API rate limits
- Need request throttling

**Time to Fix:** ~10 minutes
**Impact:** Eliminates 429 errors for normal usage patterns

---

*Last Updated: January 13, 2025*  
*EduDash Pro v1.0.2*
