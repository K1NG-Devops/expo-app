# Phase 4: DashAIAssistant Modularization Blueprint

## Current State Analysis

**File**: `services/DashAIAssistant.ts`
**Lines**: 6,281
**Members**: 173 (methods + properties)
**Complexity**: **CRITICAL** - Massive monolith violating Single Responsibility Principle

## Identified Concerns

1. **God Object Anti-pattern**: Single class managing memory, messages, voice, tools, tasks, reminders, insights, caching, etc.
2. **Testability**: Impossible to unit test individual concerns in isolation
3. **Maintainability**: Any change risks breaking unrelated functionality
4. **Memory Leaks**: Large Maps and arrays all in one instance
5. **Singleton Pattern**: Makes testing and DI difficult (Phase 5 will address)

## Modularization Strategy

### Module Extraction Order (Dependency-First)

```
1. DashMemoryManager (no dependencies)
   ↓
2. DashVoiceController (depends on nothing)
   ↓
3. DashContextBuilder (depends on MemoryManager)
   ↓
4. DashToolRegistry (depends on nothing)
   ↓
5. DashMessageHandler (depends on Context, Tools)
   ↓
6. DashCore (orchestrates all modules)
```

---

## Module 1: DashMemoryManager

**Responsibility**: Manage memory storage, context cache, interaction history

**Extracted Members**:
- `private memory: Map<string, DashMemoryItem>`
- `private contextCache: Map<string, any>`
- `private interactionHistory: Array<...>`
- `private messageCountByConversation: Map<string, number>`
- Methods: `loadMemory()`, `saveMemory()`, `addMemoryItem()`, `getMemoryItem()`, `getAllMemoryItems()`, `clearMemory()`

**Interface**:
```typescript
export class DashMemoryManager {
  private memory: Map<string, DashMemoryItem>;
  private contextCache: Map<string, any>;
  private interactionHistory: InteractionRecord[];
  private messageCountByConversation: Map<string, number>;
  
  async loadMemory(): Promise<void>
  async saveMemory(): Promise<void>
  addMemoryItem(item: DashMemoryItem): void
  getMemoryItem(key: string): DashMemoryItem | null
  getAllMemoryItems(): DashMemoryItem[]
  clearMemory(): void
  dispose(): void
}
```

---

## Module 2: DashVoiceController

**Responsibility**: Voice recording, TTS, speech synthesis

**Extracted Members**:
- `private isRecording: boolean`
- Methods: `startRecording()`, `stopRecording()`, `speakResponse()`, `stopSpeaking()`, `sendVoiceMessage()`

**Interface**:
```typescript
export class DashVoiceController {
  private isRecording: boolean;
  
  async startRecording(): Promise<void>
  async stopRecording(): Promise<string>
  async speakResponse(text: string, language?: string): Promise<void>
  async stopSpeaking(): Promise<void>
  async sendVoiceMessage(audioUri: string): Promise<DashMessage>
  dispose(): void
}
```

---

## Module 3: DashContextBuilder

**Responsibility**: Build AI context from user profile, memory, conversation history

**Extracted Members**:
- `private userProfile: DashUserProfile | null`
- `private personality: DashPersonality`
- Methods: `loadUserContext()`, `buildContext()`, `getUserProfile()`, `updateUserPreferences()`, `getPersonality()`

**Interface**:
```typescript
export class DashContextBuilder {
  constructor(private memoryManager: DashMemoryManager) {}
  
  private userProfile: DashUserProfile | null;
  private personality: DashPersonality;
  
  async loadUserContext(): Promise<void>
  buildContext(conversationId: string): Promise<string>
  getUserProfile(): DashUserProfile | null
  async updateUserPreferences(prefs: Partial<UserPreferences>): Promise<void>
  getPersonality(): DashPersonality
  dispose(): void
}
```

---

## Module 4: DashToolRegistry

**Responsibility**: Register and execute AI tools/functions

**Extracted Members**:
- Methods: `registerTool()`, `executeTool()`, `getAvailableTools()`

**Interface**:
```typescript
export class DashToolRegistry {
  private tools: Map<string, ToolDefinition>;
  
  registerTool(tool: ToolDefinition): void
  async executeTool(name: string, args: any): Promise<any>
  getAvailableTools(): ToolDefinition[]
  dispose(): void
}
```

---

## Module 5: DashMessageHandler

**Responsibility**: Process messages, manage conversations, generate AI responses

**Extracted Members**:
- `private currentConversationId: string | null`
- Methods: `startNewConversation()`, `sendMessage()`, `generateResponse()`, `addMessageToConversation()`, `getConversation()`, `getAllConversations()`

**Interface**:
```typescript
export class DashMessageHandler {
  constructor(
    private contextBuilder: DashContextBuilder,
    private toolRegistry: DashToolRegistry,
    private memoryManager: DashMemoryManager
  ) {}
  
  private currentConversationId: string | null;
  
  async startNewConversation(title?: string): Promise<string>
  async sendMessage(content: string, attachments?: DashAttachment[]): Promise<DashMessage>
  async generateResponse(userMessage: string, conversationId: string): Promise<DashMessage>
  async addMessageToConversation(convId: string, message: DashMessage): Promise<void>
  async getConversation(id: string): Promise<DashConversation | null>
  async getAllConversations(): Promise<DashConversation[]>
  getCurrentConversationId(): string | null
  setCurrentConversationId(id: string): void
  dispose(): void
}
```

---

## Module 6: DashCore (Facade)

**Responsibility**: Orchestrate modules, maintain backward compatibility

**Interface**:
```typescript
export class DashAIAssistant {
  private static instance: DashAIAssistant;
  
  private memoryManager: DashMemoryManager;
  private voiceController: DashVoiceController;
  private contextBuilder: DashContextBuilder;
  private toolRegistry: DashToolRegistry;
  private messageHandler: DashMessageHandler;
  
  static getInstance(): DashAIAssistant
  async initialize(): Promise<void>
  
  // Delegate to modules (maintain existing API)
  async sendMessage(...args): Promise<DashMessage> {
    return this.messageHandler.sendMessage(...args);
  }
  
  async speakResponse(...args): Promise<void> {
    return this.voiceController.speakResponse(...args);
  }
  
  // ... all other public methods delegate to modules
  
  dispose(): void
}
```

---

## Implementation Plan

### Step 1: Extract DashMemoryManager
- Create `services/modules/DashMemoryManager.ts`
- Move memory-related methods
- Run typecheck + lint

### Step 2: Extract DashVoiceController
- Create `services/modules/DashVoiceController.ts`
- Move voice-related methods
- Run typecheck + lint

### Step 3: Extract DashContextBuilder
- Create `services/modules/DashContextBuilder.ts`
- Inject DashMemoryManager
- Run typecheck + lint

### Step 4: Extract DashToolRegistry
- Create `services/modules/DashToolRegistry.ts`
- Move tool-related methods
- Run typecheck + lint

### Step 5: Extract DashMessageHandler
- Create `services/modules/DashMessageHandler.ts`
- Inject dependencies
- Run typecheck + lint

### Step 6: Refactor DashCore
- Slim down DashAIAssistant.ts to facade
- Delegate all methods to modules
- Run typecheck + lint

### Step 7: Final Verification
- TypeScript check
- ESLint check
- Verify no breaking changes
- Update metrics

---

## Success Criteria

- ✅ DashAIAssistant.ts reduced from 6,281 to <500 lines
- ✅ Each module <800 lines, single responsibility
- ✅ All TypeScript checks pass (0 errors)
- ✅ ESLint warnings stay within limit (<200)
- ✅ No breaking changes to public API
- ✅ All existing tests pass (if any)
- ✅ Dispose pattern implemented in all modules

---

## Risk Mitigation

1. **Backward Compatibility**: Keep all public methods, delegate internally
2. **Testing**: Run typecheck + lint after each module extraction
3. **Incremental**: Extract one module at a time, commit separately
4. **Rollback**: Each commit is atomic and revertible

---

## Estimated Impact

**Before**:
- 1 file: 6,281 lines
- 173 members in one class
- God Object anti-pattern

**After**:
- 7 files: ~1,200 lines each module, ~400 lines core
- Clear separation of concerns
- Testable, maintainable architecture

**Net**: +6 files, same total lines, **MUCH better architecture**
