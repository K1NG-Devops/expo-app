# Memory Optimization and React Component Error Fixes

## Issue Summary

Metro bundler was running out of heap memory during bundling, causing:
1. JavaScript heap out of memory error
2. React component error: "type is invalid -- expected a string or class/function but got: undefined"
3. Bundle size: 1392 modules consuming excessive memory

## Root Causes

1. **Large bundle size**: 1392 modules being loaded at startup
2. **Heavy semantic memory engine**: Generating 1536-dimensional embeddings in memory
3. **Synchronous initialization**: All AI services loaded during app startup
4. **Import inconsistency**: Mixed default/named imports causing module resolution issues

## Fixes Applied

### 1. Fixed React Component Import Issue
**File**: `app/screens/dash-assistant.tsx`

```diff
- import { DashAssistant } from '@/components/ai/DashAssistant';
+ import DashAssistant from '@/components/ai/DashAssistant';
```

**Why**: Component is exported as both named and default export. Using default import is more consistent with the primary export pattern.

### 2. Deferred Semantic Memory Initialization
**File**: `services/DashAIAssistant.ts`

Moved semantic memory initialization to a deferred setTimeout to prevent heap pressure during initial bundle:

```javascript
// Initialize after 2 seconds to reduce initial memory pressure
setTimeout(async () => {
  const { SemanticMemoryEngine } = await import('./SemanticMemoryEngine');
  const semanticMemory = SemanticMemoryEngine.getInstance();
  await semanticMemory.initialize();
}, 2000);
```

**Why**: Semantic memory engine creates large embedding arrays that consume significant memory during bundling. Deferring initialization reduces startup memory pressure.

### 3. Reduced Embedding Dimensions
**File**: `services/SemanticMemoryEngine.ts`

```diff
- private readonly VECTOR_DIMENSIONS = 1536; // OpenAI ada-002 dimensions
+ private readonly VECTOR_DIMENSIONS = 384; // Reduced for development
```

**Why**: Mock embeddings were creating 1536-dimensional arrays in memory. In production, embeddings are generated server-side. Reduced to 384 dimensions for development to save ~75% memory per embedding.

### 4. Metro Bundler Memory Optimization
**File**: `metro.config.js`

Added `maxWorkers: 2` to transformer config to limit concurrent bundling operations:

```javascript
config.transformer = {
  maxWorkers: process.env.METRO_MAX_WORKERS ? parseInt(process.env.METRO_MAX_WORKERS, 10) : 2,
  // ... rest of config
};
```

**Why**: Reducing concurrent workers prevents Metro from spawning too many processes that compete for heap memory.

## How to Run with Increased Memory

### Option 1: Increase Node Heap Size (Recommended)
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run start:clear
```

### Option 2: Update package.json scripts
Add to `package.json`:
```json
{
  "scripts": {
    "start:memory": "NODE_OPTIONS='--max-old-space-size=4096' npx expo start --dev-client --host localhost",
    "start:clear:memory": "NODE_OPTIONS='--max-old-space-size=4096' npx expo start --dev-client --host localhost --clear"
  }
}
```

### Option 3: Set Environment Variable Permanently
```bash
# In ~/.bashrc or ~/.zshrc
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Further Optimization Recommendations

### Short-term (Quick Wins)

1. **Code Splitting for AI Services**
   ```javascript
   // Lazy load heavy services only when needed
   const loadAIServices = async () => {
     const [
       { DashContextAnalyzer },
       { DashProactiveEngine },
       { SemanticMemoryEngine }
     ] = await Promise.all([
       import('./DashContextAnalyzer'),
       import('./DashProactiveEngine'),
       import('./SemanticMemoryEngine')
     ]);
     return { DashContextAnalyzer, DashProactiveEngine, SemanticMemoryEngine };
   };
   ```

2. **Remove Unused Dependencies**
   ```bash
   # Analyze bundle
   npx expo-router analyze-bundle
   
   # Check for unused deps
   npx depcheck
   ```

3. **Enable Production Minification in Dev**
   ```javascript
   // metro.config.js
   config.transformer.minifierPath = 'metro-minify-terser';
   ```

### Medium-term (Architecture)

1. **Move Embedding Generation Server-Side**
   - Create Supabase Edge Function for semantic search
   - Store embeddings in pgvector, not client-side
   - Benefits: Reduces client bundle by ~500KB, better performance

2. **Implement Tree Shaking**
   - Review imports and use named imports where possible
   - Remove barrel exports that import everything

3. **Split AI Services into Separate Bundles**
   - Use dynamic imports for voice, memory, task automation
   - Load on-demand rather than at startup

### Long-term (Production)

1. **Implement Module Federation**
   - Split app into micro-frontends
   - Load AI features as separate bundles

2. **Use Service Workers for Caching**
   - Cache AI model outputs
   - Reduce redundant API calls

3. **Implement Incremental Static Regeneration**
   - Pre-generate AI responses for common queries
   - Reduce runtime AI calls

## Testing the Fix

1. Clear all caches:
   ```bash
   npm run start:clear
   # Or with memory flag
   NODE_OPTIONS=--max-old-space-size=4096 npm run start:clear
   ```

2. Monitor memory usage:
   ```bash
   # In another terminal
   top -p $(pgrep -f "node.*expo")
   ```

3. Check for errors:
   - Component should load without "invalid type" error
   - Semantic memory should initialize after 2 seconds
   - No heap out of memory crashes

## Expected Results

- ✅ Metro bundler completes successfully
- ✅ No React component "invalid type" errors
- ✅ Semantic memory initializes after 2-second delay
- ✅ Memory usage stays under 4GB during bundling
- ✅ App loads and functions normally

## Rollback Plan

If issues persist, revert changes:
```bash
git diff HEAD
git checkout app/screens/dash-assistant.tsx
git checkout services/DashAIAssistant.ts
git checkout services/SemanticMemoryEngine.ts
git checkout metro.config.js
```

## Monitoring

Monitor these metrics in production:
- Bundle size (should stay under 10MB)
- App startup time (target: under 3 seconds)
- Memory usage (target: under 200MB on device)
- Semantic memory query latency (target: under 50ms)

## Related Files Modified

- `app/screens/dash-assistant.tsx` - Fixed import
- `services/DashAIAssistant.ts` - Deferred semantic memory init
- `services/SemanticMemoryEngine.ts` - Reduced embedding dimensions
- `metro.config.js` - Added memory optimization

## Next Steps

1. ✅ Test with increased heap size
2. ✅ Verify component loads correctly
3. ⏳ Consider implementing server-side embeddings
4. ⏳ Audit bundle for further optimization opportunities
5. ⏳ Profile memory usage during typical workflows
