# Dash Agent Activation Plan

## Problem Statement
The agentic engines (DashContextAnalyzer, DashProactiveEngine, DashDecisionEngine, etc.) are implemented but **NOT activated** in the main message flow. Users are getting basic AI responses instead of the full agentic capabilities.

## Current State
✅ **Implemented but NOT Active:**
- DashContextAnalyzer - Context understanding (not called)
- DashProactiveEngine - Proactive behaviors (not called)
- DashDecisionEngine - Decision making (not called)
- DashAgenticEngine - Task execution (partially called)
- SemanticMemoryEngine - Semantic search (not initialized)

❌ **Current Message Flow:**
```
User Message → generateResponse() → callAIServiceLegacy() → Basic AI Response
```

## Target State
✅ **Fully Agentic Message Flow:**
```
User Message
  ↓
DashContextAnalyzer.analyze(message, context)
  ↓
DashProactiveEngine.identifyOpportunities(analysis)
  ↓
DashDecisionEngine.evaluateActions(opportunities, context)
  ↓
generateEnhancedResponse() with all context
  ↓
DashAgenticEngine.createTasks(for actionable items)
  ↓
Response with smart actions, proactive suggestions, and auto-execution
```

## Required Changes

### 1. Activate Context Analyzer in Message Flow
**File:** `services/DashAIAssistant.ts`
**Method:** `generateResponse()` or `sendMessage()`

**Change:**
```typescript
// BEFORE (Current):
private async generateResponse(userInput: string, conversationId: string): Promise<DashMessage> {
  const context = { userInput, conversationHistory, userProfile, ... };
  const response = await this.callAIServiceLegacy(context);
  // ...
}

// AFTER (Enhanced):
private async generateResponse(userInput: string, conversationId: string): Promise<DashMessage> {
  // 1. Analyze context with DashContextAnalyzer
  const { DashContextAnalyzer } = await import('./DashContextAnalyzer');
  const analyzer = new DashContextAnalyzer();
  const analysis = await analyzer.analyzeMessage(userInput, this.getFullContext());
  
  // 2. Identify proactive opportunities
  const { DashProactiveEngine } = await import('./DashProactiveEngine');
  const proactiveEngine = DashProactiveEngine.getInstance();
  const opportunities = await proactiveEngine.identifyOpportunities(analysis, this.userProfile);
  
  // 3. Generate enhanced response with all context
  const response = await this.generateEnhancedResponse(userInput, conversationId, analysis);
  
  // 4. Handle proactive opportunities
  await this.handleProactiveOpportunities(opportunities, response);
  
  // 5. Handle action intents
  await this.handleActionIntent(analysis.intent, response);
  
  return response;
}
```

### 2. Initialize Semantic Memory Engine
**File:** `services/DashAIAssistant.ts`
**Method:** `initialize()`

**Add:**
```typescript
public async initialize(): Promise<void> {
  // ... existing init code ...
  
  // Initialize Semantic Memory Engine
  try {
    const { SemanticMemoryEngine } = await import('./SemanticMemoryEngine');
    this.semanticMemory = SemanticMemoryEngine.getInstance();
    await this.semanticMemory.initialize();
    console.log('[Dash] Semantic memory initialized');
  } catch (error) {
    console.warn('[Dash] Semantic memory initialization failed:', error);
  }
}
```

### 3. Activate Proactive Loop
**File:** `services/DashAIAssistant.ts`

**Change:**
```typescript
// Currently: proactive behaviors timer exists but doesn't do much
// Enhance to actually use DashProactiveEngine

private async executeProactiveBehaviors(): Promise<void> {
  if (!this.userProfile) return;
  
  try {
    const { DashProactiveEngine } = await import('./DashProactiveEngine');
    const proactiveEngine = DashProactiveEngine.getInstance();
    
    // Get current context
    const context = await this.getCurrentContext();
    
    // Identify opportunities
    const opportunities = await proactiveEngine.identifyOpportunities(
      { context },
      this.userProfile
    );
    
    // Execute high-priority opportunities
    for (const opp of opportunities.filter(o => o.priority === 'high')) {
      await this.executeProactiveOpportunity(opp);
    }
  } catch (error) {
    console.error('[Dash] Proactive behaviors failed:', error);
  }
}
```

### 4. Enable Decision Making for Actions
**File:** `services/DashAIAssistant.ts`

**Add:**
```typescript
private async evaluateAndExecuteAction(
  action: DashAction,
  context: any
): Promise<{ approved: boolean; decision: DecisionRecord }> {
  const { DashDecisionEngine } = await import('./DashDecisionEngine');
  const decisionEngine = new DashDecisionEngine();
  
  // Evaluate action risk and get decision
  const decision = await decisionEngine.evaluateAction(
    action,
    context,
    this.userProfile?.preferences?.ai_autonomy_level || 'assistant'
  );
  
  if (decision.requiresApproval) {
    // Store decision for user approval
    await this.storeDecisionForApproval(decision);
    return { approved: false, decision };
  }
  
  // Auto-approve and execute if within autonomy level
  return { approved: true, decision };
}
```

### 5. Enhanced Task Creation from Conversations
**File:** `services/DashAIAssistant.ts`

**Change:**
```typescript
private async handleActionIntent(intent: any, response: DashMessage): Promise<void> {
  try {
    const { DashAgenticEngine } = await import('./DashAgenticEngine');
    const agenticEngine = DashAgenticEngine.getInstance();
    
    // Map common intents to tasks
    const taskMapping = {
      create_lesson: {
        title: 'Create Lesson Plan',
        steps: [
          { title: 'Research curriculum', type: 'automated' },
          { title: 'Design activities', type: 'automated' },
          { title: 'Review & finalize', type: 'manual' }
        ]
      },
      schedule_meeting: {
        title: 'Schedule Meeting',
        steps: [
          { title: 'Check availability', type: 'automated' },
          { title: 'Send invitations', type: 'approval_required' },
          { title: 'Create calendar event', type: 'automated' }
        ]
      },
      send_report: {
        title: 'Generate & Send Report',
        steps: [
          { title: 'Gather data', type: 'automated' },
          { title: 'Generate report', type: 'automated' },
          { title: 'Review & send', type: 'approval_required' }
        ]
      }
    };
    
    const taskConfig = taskMapping[intent.primary_intent];
    if (taskConfig) {
      const task = await agenticEngine.createTask(
        taskConfig.title,
        `Auto-created from user request: "${intent.original_text}"`,
        'workflow',
        this.userProfile?.role || 'user',
        taskConfig.steps
      );
      
      // Add task reference to response
      if (response.metadata) {
        response.metadata.dashboard_action = {
          type: 'execute_task',
          taskId: task.id,
          task: task
        };
      }
      
      // Optionally auto-execute if autonomy level allows
      if (this.userProfile?.preferences?.ai_autonomy_level === 'autonomous') {
        await agenticEngine.executeTask(task.id);
      }
    }
  } catch (error) {
    console.error('[Dash] Failed to handle action intent:', error);
  }
}
```

## Implementation Priority

### Phase 1: Core Agent Activation (HIGH PRIORITY)
1. ✅ Integrate DashContextAnalyzer into `generateResponse()`
2. ✅ Activate DashProactiveEngine in message flow
3. ✅ Enable task creation from intents

### Phase 2: Decision Making (MEDIUM PRIORITY)
4. ✅ Integrate DashDecisionEngine
5. ✅ Add approval workflows for high-risk actions
6. ✅ Implement autonomy levels

### Phase 3: Memory & Learning (MEDIUM PRIORITY)
7. ✅ Initialize SemanticMemoryEngine
8. ✅ Connect memory to context analysis
9. ✅ Enable learning from user feedback

### Phase 4: Advanced Features (LOW PRIORITY)
10. ✅ Multi-step workflow execution
11. ✅ Scheduled task execution
12. ✅ Cross-session memory consolidation

## Testing Strategy

### Unit Tests (for each enhancement):
```bash
# Test context analyzer
npm test -- DashContextAnalyzer

# Test proactive engine  
npm test -- DashProactiveEngine

# Test decision engine
npm test -- DashDecisionEngine
```

### Integration Test:
```
User: "Create a lesson plan for teaching shapes to 4-year-olds for tomorrow morning"

Expected Flow:
1. DashContextAnalyzer detects:
   - Intent: create_lesson
   - Subject: shapes
   - Audience: 4-year-olds
   - Timeline: tomorrow morning

2. DashProactiveEngine suggests:
   - Schedule reminder for tomorrow 8am
   - Auto-generate worksheet
   - Add to weekly plan

3. DashDecisionEngine evaluates:
   - Risk: low (standard lesson planning)
   - Autonomy: Can proceed with 'assistant' level
   - Approval: Not required

4. DashAgenticEngine creates:
   - Multi-step task
   - Auto-executes first 2 steps
   - Waits for user review on step 3

5. Response includes:
   - Detailed lesson plan
   - Task progress indicator
   - Quick actions: "View Plan", "Customize", "Schedule"
```

## Success Metrics

✅ **Agent is Active When:**
- Context analyzer is called on every message
- Proactive suggestions appear in >50% of responses
- Tasks are auto-created from actionable intents
- Response time < 3s for simple queries, < 8s for complex
- User satisfaction with suggestions > 80%

## Rollout Plan

### Step 1: Local Testing
```bash
# Test locally first
npm run dev:android
```

### Step 2: Preview Deployment
```bash
# Deploy to preview channel
eas update --branch preview --message "Dash Agent Activation - Full Agentic Capabilities"
```

### Step 3: Monitor & Iterate
- Watch Sentry for errors
- Monitor response times
- Collect user feedback
- Iterate based on usage patterns

## Next Steps

1. **Implement Phase 1 changes** (Context Analyzer + Proactive Engine)
2. **Test locally** with comprehensive test cases
3. **Deploy to preview** and gather feedback
4. **Iterate** based on results
5. **Proceed to Phase 2** (Decision Making)

Would you like me to start implementing Phase 1 now?
