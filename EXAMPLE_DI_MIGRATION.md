# Example: Complete DI Migration for DashAIAssistant

This shows the **exact changes** needed to migrate from singleton to proper DI.

---

## 📋 Current State (Hybrid)

```typescript
// services/DashAIAssistant.ts

export class DashAIAssistant {
  // ❌ Singleton pattern
  private static instance: DashAIAssistant;
  
  private currentConversationId: string | null = null;
  private memory: Map<string, DashMemoryItem> = new Map();
  // ... other fields
  
  // ❌ Singleton method
  public static getInstance(): DashAIAssistant {
    if (!DashAIAssistant.instance) {
      DashAIAssistant.instance = new DashAIAssistant();
    }
    return DashAIAssistant.instance;
  }
  
  private constructor() {
    // Private constructor prevents external instantiation
  }
  
  // ... methods
}

// ✅ Already registered in DI container
// lib/di/providers/default.ts
container.registerFactory(TOKENS.dashAI, () => new DashAIAssistant(), { singleton: true });
```

**Problem**: Has BOTH singleton pattern AND DI registration!

---

## ✅ Target State (Pure DI)

### Step 1: Remove Singleton Pattern

```typescript
// services/DashAIAssistant.ts

export class DashAIAssistant {
  // ❌ REMOVE THIS
  // private static instance: DashAIAssistant;
  
  private currentConversationId: string | null = null;
  private memory: Map<string, DashMemoryItem> = new Map();
  // ... other fields
  
  // ❌ REMOVE THIS
  // public static getInstance(): DashAIAssistant { ... }
  
  // ✅ Make constructor public (or keep private if using factory)
  constructor() {
    // Initialize
  }
  
  // ... methods stay the same
}
```

### Step 2: Add Backward-Compatible Helper

```typescript
// services/DashAIAssistant.ts

// At the END of the file, AFTER class definition

import { container } from '@/lib/di/container';
import { TOKENS } from '@/lib/di/types';

// ✅ Helper function for backward compatibility
export function getDashInstance(): DashAIAssistant {
  return container.resolve(TOKENS.dashAI);
}

// ✅ For React hooks
export function useDashAI(): DashAIAssistant {
  return getDashInstance();
}

// ✅ Default export for convenience
export default getDashInstance();
```

### Step 3: Update DI Registration (Already Done)

```typescript
// lib/di/providers/default.ts

// Already registered - no changes needed
container.registerFactory(TOKENS.dashAI, () => new DashAIAssistant(), { singleton: true });
```

### Step 4: Create Migration Guide for Call Sites

```typescript
// ========================================
// BEFORE (Singleton Pattern)
// ========================================

import { DashAIAssistant } from '@/services/DashAIAssistant';

const dash = DashAIAssistant.getInstance();
await dash.sendMessage('Hello');


// ========================================
// AFTER - Option 1: Helper Function (Easiest)
// ========================================

import { getDashInstance } from '@/services/DashAIAssistant';

const dash = getDashInstance();
await dash.sendMessage('Hello');


// ========================================
// AFTER - Option 2: DI Container (Purest)
// ========================================

import { container, TOKENS } from '@/lib/di';

const dash = container.resolve(TOKENS.dashAI);
await dash.sendMessage('Hello');


// ========================================
// AFTER - Option 3: React Hook (Best for Components)
// ========================================

import { useDashAI } from '@/services/DashAIAssistant';

function MyComponent() {
  const dash = useDashAI();
  
  const handleSend = async () => {
    await dash.sendMessage('Hello');
  };
}


// ========================================
// AFTER - Option 4: Constructor Injection (Best for Services)
// ========================================

import type { DashAI } from '@/lib/di/types';

class MyService {
  constructor(private dash: DashAI) {}
  
  async doSomething() {
    await this.dash.sendMessage('Hello');
  }
}

// Register MyService with DI
container.registerFactory(TOKENS.myService, (c) => 
  new MyService(c.resolve(TOKENS.dashAI))
);
```

---

## 🧪 Testing Benefits

### Before (Singleton - Hard to Test)

```typescript
// ❌ Can't easily mock DashAIAssistant
test('should send message', async () => {
  // DashAIAssistant.getInstance() returns real instance
  // Hard to mock or inject test doubles
  const result = await someFunction();
  expect(result).toBe('...');
});
```

### After (DI - Easy to Test)

```typescript
// ✅ Easy to mock with DI
test('should send message', async () => {
  // Create mock
  const mockDash = {
    sendMessage: jest.fn().mockResolvedValue({ id: '123', content: 'response' })
  };
  
  // Inject mock into container
  container.registerValue(TOKENS.dashAI, mockDash as any);
  
  // Test code that uses container.resolve()
  const result = await someFunction();
  
  expect(mockDash.sendMessage).toHaveBeenCalledWith('Hello');
  expect(result).toBe('...');
});
```

---

## 📝 Migration Checklist

For each service:

- [ ] **1. Remove Singleton Pattern**
  - [ ] Delete `private static instance`
  - [ ] Delete `getInstance()` method
  - [ ] Make constructor public

- [ ] **2. Add Backward-Compatible Helpers**
  - [ ] Add `getXInstance()` function
  - [ ] Add React hook `useX()`
  - [ ] Add default export

- [ ] **3. Update Call Sites (Gradual)**
  - [ ] Find all `X.getInstance()` calls
  - [ ] Replace with `getXInstance()` or `container.resolve()`
  - [ ] Update imports

- [ ] **4. Add Tests**
  - [ ] Write unit tests using DI mocking
  - [ ] Test lifecycle (initialization, disposal)
  - [ ] Test with real and mock dependencies

- [ ] **5. Update Documentation**
  - [ ] Update JSDoc comments
  - [ ] Remove singleton references
  - [ ] Add DI usage examples

---

## 🚨 Common Pitfalls

### Pitfall 1: Forgetting to Update Imports

```typescript
// ❌ Old import still expects getInstance()
import { DashAIAssistant } from '@/services/DashAIAssistant';
const dash = DashAIAssistant.getInstance();  // TypeScript error!

// ✅ Update import to use helper
import { getDashInstance } from '@/services/DashAIAssistant';
const dash = getDashInstance();
```

### Pitfall 2: Creating Multiple Instances

```typescript
// ❌ Without singleton flag, creates new instance each time
container.registerFactory(TOKENS.dashAI, () => new DashAIAssistant());

// ✅ Use singleton flag for services that should be shared
container.registerFactory(TOKENS.dashAI, () => new DashAIAssistant(), { singleton: true });
```

### Pitfall 3: Circular Dependencies

```typescript
// ❌ Circular dependency
class DashAIAssistant {
  constructor() {
    this.agentic = container.resolve(TOKENS.dashAgenticEngine);  // Agentic needs Dash!
  }
}

// ✅ Use lazy resolution
class DashAIAssistant {
  private _agentic?: DashAgenticEngine;
  
  get agentic() {
    if (!this._agentic) {
      this._agentic = container.resolve(TOKENS.dashAgenticEngine);
    }
    return this._agentic;
  }
}
```

### Pitfall 4: Disposing Services

```typescript
// ❌ Forgetting to dispose
class DashAIAssistant {
  // No dispose method = memory leak
}

// ✅ Add dispose for cleanup
class DashAIAssistant {
  dispose() {
    this.memory.clear();
    this.conversations.clear();
    // Clean up subscriptions, timers, etc.
  }
}
```

---

## 📊 Comparison Table

| Aspect | Singleton Pattern | Dependency Injection |
|--------|------------------|---------------------|
| **Instantiation** | `X.getInstance()` | `container.resolve(TOKENS.x)` |
| **Testing** | ❌ Hard | ✅ Easy |
| **Mocking** | ❌ Difficult | ✅ Simple |
| **Circular Deps** | ⚠️ Common | ✅ Preventable |
| **Memory Leaks** | ⚠️ Risk | ✅ Controlled |
| **Lifecycle** | ❌ Hard to control | ✅ Full control |
| **Constructor Injection** | ❌ Not possible | ✅ Standard |
| **Code Coupling** | ❌ Tight | ✅ Loose |

---

## ⏱️ Estimated Time Per Service

| Task | Time |
|------|------|
| Remove singleton pattern | 5 min |
| Add helper functions | 5 min |
| Update 5-10 call sites | 10 min |
| Write basic tests | 15 min |
| Review & test | 10 min |
| **Total per service** | **45 min** |

**For 13 services**: ~10 hours (1.5 days)

---

## 🎯 Quick Win: Start with DashAIAssistant

**Why Start Here?**:
- Most critical service
- 36 call sites to update
- Sets pattern for other services
- High impact on testability

**Steps**:
1. Remove singleton pattern (5 min)
2. Add helper functions (5 min)
3. Update call sites gradually (can be done over time)
4. Test thoroughly

**Result**: Improved architecture with backward compatibility!

---

## 📚 Resources

- `SINGLETON_VS_DI_ANALYSIS.md` - Full analysis
- `lib/di/container.ts` - DI container implementation
- `lib/di/types.ts` - Service tokens and interfaces
- `services/EventBus.ts` - Example of completed migration
- `docs/summaries/PHASE_5_DEPENDENCY_INJECTION.md` - Original plan
