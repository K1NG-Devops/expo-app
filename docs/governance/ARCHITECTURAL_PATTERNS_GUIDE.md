# 🏛️ Architectural Patterns & Refactoring Guide

**Living Document**: Updated during the DashAIAssistant refactoring journey

**Purpose**: Master React Native/TypeScript architecture through real-world refactoring examples

**Status**: 🚧 In Progress - Building as we refactor

---

## 📚 Table of Contents

- [Introduction](#introduction)
- [The DashAI Refactoring Journey](#the-dashai-refactoring-journey)
  - [Before: The 4,985-Line Monster](#before-the-4985-line-monster)
  - [After: Modular Services](#after-modular-services)
- [Core Architectural Principles](#core-architectural-principles)
- [Design Patterns Used](#design-patterns-used)
- [Code Organization Best Practices](#code-organization-best-practices)
- [Debugging Strategies](#debugging-strategies)
- [Testing Approaches](#testing-approaches)
- [Common Anti-Patterns to Avoid](#common-anti-patterns-to-avoid)
- [Appendix: Complete Code Examples](#appendix-complete-code-examples)

---

## 🎯 Introduction

This document is a **living guide** created during the refactoring of EduDash Pro's monolithic files into modular, maintainable architecture. As we refactor, we'll document:

- **Why** we make each architectural decision
- **How** to structure code for scalability
- **What** patterns solve common problems
- **When** to extract/split files
- **Where** different concerns belong

### Learning Goals

By the end of this document, you'll understand:
1. ✅ How to design modular, testable TypeScript services
2. ✅ React Native component composition patterns
3. ✅ Separation of concerns (UI vs Logic vs Data)
4. ✅ Dependency injection for flexible architecture
5. ✅ Debugging strategies for large codebases
6. ✅ Testing isolated modules

---

## 🔨 The DashAI Refactoring Journey

### Before: The 4,985-Line Monster

**File**: `services/DashAIAssistant.ts`

**Problems**:
```typescript
// ❌ God Class Anti-Pattern
export class DashAIAssistant {
  // Responsibility 1: Voice Recording (300 lines)
  private recordingObject: Audio.Recording | null = null;
  async startRecording() { /* ... */ }
  async stopRecording() { /* ... */ }
  async transcribeAudio() { /* ... */ }
  
  // Responsibility 2: Memory Management (500 lines)
  private memory: Map<string, DashMemoryItem> = new Map();
  async loadMemory() { /* ... */ }
  async saveMemory() { /* ... */ }
  async addMemoryItem() { /* ... */ }
  
  // Responsibility 3: Task Automation (600 lines)
  private activeTasks: Map<string, DashTask> = new Map();
  async createTask() { /* ... */ }
  async executeTask() { /* ... */ }
  
  // Responsibility 4: Conversation (800 lines)
  async sendMessage() { /* ... */ }
  async generateResponse() { /* ... */ }
  
  // Responsibility 5: Navigation (200 lines)
  async navigateToScreen() { /* ... */ }
  
  // Responsibility 6: User Profile (400 lines)
  async loadUserContext() { /* ... */ }
  
  // Responsibility 7: AI Tool Integration (1,000+ lines)
  async callAIService() { /* ... */ }
  
  // ... 4,985 lines total
}
```

**Why This Is Bad**:
- ❌ **Violates Single Responsibility Principle**: 7+ responsibilities in one class
- ❌ **Untestable**: Can't test voice without loading AI/memory/tasks
- ❌ **Merge Conflicts**: Multiple developers editing same huge file
- ❌ **Hard to Understand**: 5,000 lines overwhelms new developers
- ❌ **Tight Coupling**: Changing voice logic risks breaking memory logic
- ❌ **No Reusability**: Can't use just memory service elsewhere

---

### After: Modular Services

**New Structure**:
```
services/dash-ai/
├── types.ts                      (300 lines) - Shared type definitions
├── DashAICore.ts                (400 lines) - Orchestration facade
├── DashVoiceService.ts          (250 lines) - Voice recording & transcription
├── DashMemoryService.ts         (300 lines) - Memory persistence & context
├── DashTaskManager.ts           (200 lines) - Task creation & execution
├── DashConversationManager.ts   (300 lines) - Message history & responses
├── DashAINavigator.ts           (150 lines) - Screen navigation & deep links
├── DashUserProfileManager.ts    (200 lines) - User preferences & profiles
└── utils.ts                     (100 lines) - Shared helper functions
```

**Benefits**:
- ✅ **Single Responsibility**: Each service does ONE thing
- ✅ **Testable**: Mock dependencies, test in isolation
- ✅ **No Merge Conflicts**: Developers work on separate files
- ✅ **Easy to Understand**: Read 250 lines vs 5,000 lines
- ✅ **Loose Coupling**: Services communicate via interfaces
- ✅ **Reusable**: Use DashMemoryService in other features

---

## 🏗️ Core Architectural Principles

### 1. Single Responsibility Principle (SRP)

**Definition**: A class/module should have ONE reason to change.

**Bad Example** (Before):
```typescript
// ❌ DashAIAssistant has 7 reasons to change:
// 1. Voice API changes
// 2. Memory storage changes
// 3. Task automation changes
// 4. AI provider changes
// 5. Navigation system changes
// 6. User profile schema changes
// 7. Business logic changes

class DashAIAssistant {
  // Handles ALL concerns in one class
}
```

**Good Example** (After):
```typescript
// ✅ Each service has ONE reason to change

// Only changes if voice API changes
class DashVoiceService {
  async startRecording() { /* ... */ }
  async stopRecording() { /* ... */ }
}

// Only changes if memory storage changes
class DashMemoryService {
  async loadMemory() { /* ... */ }
  async saveMemory() { /* ... */ }
}

// Only changes if task logic changes
class DashTaskManager {
  async createTask() { /* ... */ }
}
```

**Key Insight**: If you can describe a class with "AND", it violates SRP.
- ❌ "DashAIAssistant handles voice AND memory AND tasks"
- ✅ "DashVoiceService handles voice recording"

---

### 2. Dependency Injection (DI)

**Definition**: Provide dependencies from outside rather than creating them inside.

**Bad Example** (Tight Coupling):
```typescript
// ❌ Creates dependencies internally
class DashAICore {
  private voiceService = new DashVoiceService(); // Hard-coded!
  private memoryService = new DashMemoryService(); // Can't mock!
  
  async processVoiceInput(audioUri: string) {
    // Can't test this without real voice service
    const transcript = await this.voiceService.transcribe(audioUri);
    return transcript;
  }
}
```

**Good Example** (Loose Coupling):
```typescript
// ✅ Injects dependencies via constructor
class DashAICore {
  constructor(
    private voiceService: DashVoiceService,
    private memoryService: DashMemoryService
  ) {}
  
  async processVoiceInput(audioUri: string) {
    // Easy to test with mock voiceService
    const transcript = await this.voiceService.transcribe(audioUri);
    return transcript;
  }
}

// Usage in production
const voiceService = new DashVoiceService();
const memoryService = new DashMemoryService();
const dashAI = new DashAICore(voiceService, memoryService);

// Usage in tests
const mockVoiceService = { transcribe: jest.fn() };
const testDashAI = new DashAICore(mockVoiceService as any, mockMemoryService);
```

**Benefits**:
- ✅ **Testable**: Inject mocks during tests
- ✅ **Flexible**: Swap implementations without changing code
- ✅ **Clear Dependencies**: Constructor shows what class needs

---

### 3. Interface Segregation

**Definition**: Depend on abstractions (interfaces), not concrete implementations.

**Example**:
```typescript
// ✅ Define interface for what DashAICore needs
interface IVoiceService {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  transcribe(audioUri: string): Promise<string>;
}

// DashAICore depends on interface, not concrete class
class DashAICore {
  constructor(private voiceService: IVoiceService) {}
  
  async recordAndTranscribe() {
    await this.voiceService.startRecording();
    const audioUri = await this.voiceService.stopRecording();
    return this.voiceService.transcribe(audioUri);
  }
}

// Can swap implementations
class DashVoiceService implements IVoiceService { /* Azure Speech SDK */ }
class MockVoiceService implements IVoiceService { /* Test mocks */ }
class GoogleVoiceService implements IVoiceService { /* Google STT */ }
```

---

### 4. Composition Over Inheritance

**Definition**: Build complex objects by combining simpler objects, not inheritance.

**Bad Example** (Inheritance):
```typescript
// ❌ Deep inheritance hierarchy
class BaseAI {
  async sendMessage() { /* ... */ }
}

class VoiceAI extends BaseAI {
  async startRecording() { /* ... */ }
}

class MemoryAI extends VoiceAI {
  async loadMemory() { /* ... */ }
}

class TaskAI extends MemoryAI {
  async createTask() { /* ... */ }
}

// Fragile! Change BaseAI breaks everyone
```

**Good Example** (Composition):
```typescript
// ✅ Compose services
class DashAICore {
  constructor(
    private voice: DashVoiceService,
    private memory: DashMemoryService,
    private tasks: DashTaskManager
  ) {}
  
  // Delegate to composed services
  async recordVoice() {
    return this.voice.startRecording();
  }
  
  async getMemory(key: string) {
    return this.memory.getItem(key);
  }
  
  async addTask(task: DashTask) {
    return this.tasks.createTask(task);
  }
}
```

**Key Insight**: "Has-a" (composition) is more flexible than "Is-a" (inheritance).

---

## 📐 Design Patterns Used

### Pattern #1: Facade Pattern

**Purpose**: Provide a simple interface to a complex subsystem.

**Application**: `DashAICore` is a facade over 6 services.

```typescript
// ✅ Facade hides complexity
class DashAICore {
  constructor(
    private voice: DashVoiceService,
    private memory: DashMemoryService,
    private conversation: DashConversationManager,
    private tasks: DashTaskManager,
    private navigator: DashAINavigator,
    private profile: DashUserProfileManager
  ) {}
  
  // Simple public API
  async sendTextMessage(text: string): Promise<DashMessage> {
    // Internally coordinates multiple services
    const context = await this.memory.buildContext();
    const profile = await this.profile.getUserProfile();
    const response = await this.conversation.generateResponse(text, context, profile);
    await this.memory.updateMemory(response);
    return response;
  }
  
  async sendVoiceMessage(audioUri: string): Promise<DashMessage> {
    // Coordinates voice + conversation
    const transcript = await this.voice.transcribe(audioUri);
    return this.sendTextMessage(transcript);
  }
}

// Usage: Simple API hides 6 services
const dashAI = DashAICore.getInstance();
const response = await dashAI.sendTextMessage("Hello Dash");
```

**Benefits**:
- ✅ UI code doesn't need to know about 6 services
- ✅ Complex orchestration hidden
- ✅ Easy to change internal implementation

---

### Pattern #2: Singleton Pattern

**Purpose**: Ensure only one instance exists globally.

**Application**: `DashAICore.getInstance()`

```typescript
// ✅ Singleton ensures one global instance
class DashAICore {
  private static instance: DashAICore | null = null;
  
  private constructor(/* ... */) {
    // Private constructor prevents `new DashAICore()`
  }
  
  public static getInstance(): DashAICore {
    if (!DashAICore.instance) {
      // Lazy initialization
      const voice = new DashVoiceService();
      const memory = new DashMemoryService();
      // ... initialize all services
      DashAICore.instance = new DashAICore(voice, memory, /* ... */);
    }
    return DashAICore.instance;
  }
  
  public static resetInstance(): void {
    // Useful for tests
    DashAICore.instance = null;
  }
}

// Usage
const dashAI = DashAICore.getInstance(); // Always same instance
```

**When to Use**:
- ✅ Global state (audio recorder, memory cache)
- ✅ Expensive initialization (AI models)
- ❌ **Not** for services that can have multiple instances

---

### Pattern #3: Strategy Pattern

**Purpose**: Switch algorithms/behaviors at runtime.

**Application**: Different AI models based on subscription.

```typescript
// ✅ Strategy for model selection
interface AIModelStrategy {
  generateResponse(prompt: string): Promise<string>;
}

class HaikuStrategy implements AIModelStrategy {
  async generateResponse(prompt: string) {
    return callAI({ model: 'claude-3-haiku', prompt });
  }
}

class SonnetStrategy implements AIModelStrategy {
  async generateResponse(prompt: string) {
    return callAI({ model: 'claude-3-sonnet', prompt });
  }
}

class OpusStrategy implements AIModelStrategy {
  async generateResponse(prompt: string) {
    return callAI({ model: 'claude-3-opus', prompt });
  }
}

class DashConversationManager {
  private strategy: AIModelStrategy;
  
  setStrategy(tier: 'free' | 'premium' | 'pro') {
    // Switch strategy based on subscription
    switch (tier) {
      case 'free': this.strategy = new HaikuStrategy(); break;
      case 'premium': this.strategy = new SonnetStrategy(); break;
      case 'pro': this.strategy = new OpusStrategy(); break;
    }
  }
  
  async generateResponse(prompt: string) {
    return this.strategy.generateResponse(prompt);
  }
}
```

---

## 📁 Code Organization Best Practices

### Directory Structure Philosophy

```
services/dash-ai/           # Feature-based grouping
├── types.ts               # Shared types for ALL services
├── DashAICore.ts         # Public facade (entry point)
├── DashVoiceService.ts   # Voice-specific logic
├── DashMemoryService.ts  # Memory-specific logic
├── ...                    # One file per responsibility
└── utils.ts              # Shared helpers (no logic)
```

**Rules**:
1. **One Feature, One Directory**: All related files together
2. **Types First**: `types.ts` has no imports, only exports
3. **Core Last**: Facade depends on services, not vice versa
4. **Utils Last**: Helpers never import services (avoid circular deps)

---

### Import Order Standards

```typescript
// ✅ Correct import order
// 1. External libraries (React, React Native, etc.)
import React from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 2. Internal types (no side effects)
import type { DashMessage, DashTask, DashMemoryItem } from './types';

// 3. Internal services (with side effects)
import { DashVoiceService } from './DashVoiceService';
import { DashMemoryService } from './DashMemoryService';

// 4. Utilities (pure functions)
import { generateId, formatTimestamp } from './utils';
```

---

## 🔍 Debugging Strategies

### Strategy #1: Modular Debugging

**Before** (Monolithic):
```typescript
// ❌ Hard to debug: 5,000-line file
class DashAIAssistant {
  async sendMessage(text: string) {
    // Bug could be in ANY of these 500 lines
    const memory = this.loadMemory(); // Line 1234
    const context = this.buildContext(memory); // Line 2456
    const response = this.callAI(text, context); // Line 3678
    this.saveMemory(response); // Line 4890
    return response;
  }
}

// Debugging: Where's the bug? 😰
// - Voice recording? Lines 100-300
// - Memory loading? Lines 1200-1400
// - AI call? Lines 3600-3800
// - Conversation? Lines 4500-4700
```

**After** (Modular):
```typescript
// ✅ Easy to debug: Small, focused files
class DashAICore {
  async sendMessage(text: string) {
    const context = await this.memory.buildContext(); // ← Memory bug? Check DashMemoryService.ts
    const response = await this.conversation.generateResponse(text, context); // ← AI bug? Check DashConversationManager.ts
    await this.memory.updateMemory(response); // ← Storage bug? Check DashMemoryService.ts
    return response;
  }
}

// Debugging: Narrow down quickly! 🎯
// Bug in memory? → Open DashMemoryService.ts (300 lines)
// Bug in AI call? → Open DashConversationManager.ts (300 lines)
// Bug in voice? → Open DashVoiceService.ts (250 lines)
```

---

### Strategy #2: Layered Logging

```typescript
// ✅ Add debug logs at service boundaries
class DashAICore {
  async sendMessage(text: string) {
    console.log('[DashAI] Sending message:', { text });
    
    try {
      const context = await this.memory.buildContext();
      console.log('[DashAI] Context built:', { contextSize: context.length });
      
      const response = await this.conversation.generateResponse(text, context);
      console.log('[DashAI] Response generated:', { responseLength: response.content.length });
      
      await this.memory.updateMemory(response);
      console.log('[DashAI] Memory updated');
      
      return response;
    } catch (error) {
      console.error('[DashAI] Error in sendMessage:', error);
      throw error;
    }
  }
}

// Each service logs internally too
class DashMemoryService {
  async buildContext() {
    console.log('[Memory] Building context...');
    const items = await this.loadMemory();
    console.log('[Memory] Loaded', items.length, 'memory items');
    return this.formatContext(items);
  }
}
```

**Debug Output**:
```
[DashAI] Sending message: { text: "Hello" }
[Memory] Building context...
[Memory] Loaded 15 memory items
[DashAI] Context built: { contextSize: 15 }
[Conversation] Generating response...
[Conversation] Model: claude-3-sonnet
[DashAI] Response generated: { responseLength: 120 }
[Memory] Updating memory...
[DashAI] Memory updated
```

Now you can trace exactly where the issue is!

---

### Strategy #3: Type-Safe Debugging

```typescript
// ✅ Use TypeScript to catch bugs at compile time
interface DashMessage {
  id: string;
  content: string;
  timestamp: number;
}

// ❌ Runtime error (hard to debug)
const message = { id: '123', text: 'Hello' }; // Typo: 'text' instead of 'content'
console.log(message.content); // undefined

// ✅ Compile-time error (caught immediately)
const message: DashMessage = { 
  id: '123', 
  text: 'Hello' // Error: Property 'text' does not exist on type 'DashMessage'
};
```

---

## 🧪 Testing Approaches

### Unit Testing Isolated Services

```typescript
// ✅ Test DashMemoryService in isolation
describe('DashMemoryService', () => {
  let memoryService: DashMemoryService;
  
  beforeEach(() => {
    // Fresh instance for each test
    memoryService = new DashMemoryService();
  });
  
  it('should save and load memory', async () => {
    const item: DashMemoryItem = {
      id: 'test-1',
      type: 'preference',
      key: 'language',
      value: 'en',
      confidence: 1.0,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    await memoryService.addItem(item);
    const loaded = await memoryService.getItem('language');
    
    expect(loaded).toEqual(item);
  });
});
```

---

### Integration Testing with Mocks

```typescript
// ✅ Test DashAICore with mocked services
describe('DashAICore', () => {
  let dashAI: DashAICore;
  let mockVoice: jest.Mocked<DashVoiceService>;
  let mockMemory: jest.Mocked<DashMemoryService>;
  
  beforeEach(() => {
    mockVoice = {
      transcribe: jest.fn().mockResolvedValue('Hello Dash')
    } as any;
    
    mockMemory = {
      buildContext: jest.fn().mockResolvedValue([]),
      updateMemory: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    dashAI = new DashAICore(mockVoice, mockMemory, /* ... */);
  });
  
  it('should process voice message', async () => {
    const response = await dashAI.sendVoiceMessage('audio://test.m4a');
    
    expect(mockVoice.transcribe).toHaveBeenCalledWith('audio://test.m4a');
    expect(mockMemory.buildContext).toHaveBeenCalled();
    expect(response.content).toBeDefined();
  });
});
```

---

## ❌ Common Anti-Patterns to Avoid

### Anti-Pattern #1: God Class

```typescript
// ❌ One class does everything
class GodClass {
  doEverything() {
    this.handleUI();
    this.callAPI();
    this.processData();
    this.updateDB();
    this.sendNotification();
  }
}

// ✅ Split responsibilities
class UIController { handleUI() {} }
class APIService { callAPI() {} }
class DataProcessor { processData() {} }
class DatabaseService { updateDB() {} }
class NotificationService { sendNotification() {} }
```

---

### Anti-Pattern #2: Circular Dependencies

```typescript
// ❌ Circular dependency
// ServiceA.ts
import { ServiceB } from './ServiceB';
class ServiceA {
  constructor(private b: ServiceB) {}
}

// ServiceB.ts
import { ServiceA } from './ServiceA';
class ServiceB {
  constructor(private a: ServiceA) {}
}

// ✅ Fix with interface
// IServiceA.ts
export interface IServiceA { /* ... */ }

// ServiceB.ts
import type { IServiceA } from './IServiceA';
class ServiceB {
  constructor(private a: IServiceA) {} // No circular import!
}
```

---

## 📊 Flow Diagrams

### DashAI Message Flow

```
User Input (Voice or Text)
         ↓
    DashAICore (Facade)
         ↓
    ┌────┴────┐
    ↓         ↓
DashVoice  DashMemory
(if voice) (load context)
    ↓         ↓
    └────┬────┘
         ↓
DashConversationManager
         ↓
  AI Service (Edge Function)
         ↓
DashConversationManager
         ↓
    DashMemory (save)
         ↓
    User receives response
```

---

## 🎓 Key Takeaways

1. **Start Small, Extract Early**: Don't wait until 5,000 lines
2. **Single Responsibility**: One file, one purpose
3. **Dependency Injection**: Pass dependencies, don't create them
4. **Composition > Inheritance**: Combine small pieces
5. **Test in Isolation**: Mock dependencies
6. **Debug by Layer**: Logs at service boundaries
7. **Types Catch Bugs**: Use TypeScript strictly

---

## 📝 Refactoring Progress

### Completed
- [x] Phase 0: Documentation & branch setup
- [x] Phase 1: Directory scaffolding
- [x] Phase 2: Type extraction ✅

### In Progress
- [ ] Phase 3: DashAIAssistant split (voice, memory, conversation services)

### Phase 2 Learnings: Type Extraction

**What We Did**: Extracted 733 lines of type definitions from `DashAIAssistant.ts` into `services/dash-ai/types.ts`

**Why This Matters**:
1. **Zero Dependencies**: Types file has NO imports, only exports
2. **Prevents Circular Deps**: Services can import types without creating cycles
3. **Single Source of Truth**: One place for all Dash AI type definitions
4. **Comprehensive Documentation**: Each type explains purpose, storage, usage

**Key Decision: Why One File Instead of Multiple?**
```
Option A: Split by domain
- types.messages.ts
- types.tasks.ts  
- types.memory.ts

Option B: One types.ts file ✅ (We chose this)
```

**Why Option B Won**:
- Total: 733 lines (under 1,000-line guideline for types)
- Logically organized into 6 clear sections
- Easy to find ALL types in one place
- No confusion about where types live

**Rule**: Split types when >1,000 lines OR types belong to different features

**Documentation Pattern**:
```typescript
/**
 * DashMessage represents a single message
 * 
 * **Usage**: Both user input and AI responses
 * **Storage**: AsyncStorage (local) + Supabase (cloud)
 * 
 * **Key Fields**:
 * - `voiceNote`: Optional voice recording
 * - `attachments`: File attachments
 * - `metadata`: Rich context
 */
export interface DashMessage {
  // ...
}
```

**Key Insight**: Good documentation IN the code is better than external docs.
- Developers see it while coding
- IDE shows it in autocomplete
- Never gets out of sync with code

**Next Step**: Extract DashVoiceService (voice recording + transcription logic)

### Next Steps
- [ ] Extract remaining services
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Update UI components to use new API

---

## 🔗 References

- [WARP.md File Size Standards](../../WARP.md#file-size--code-organization-standards)
- [Comprehensive Audit Roadmap Phase 4](../COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

**Last Updated**: 2025-10-19  
**Next Update**: After Phase 3 completion
