# Dash Agentic Enhancements - Test Plan

## Current Status
- Branch: `fix/ai-progress-analysis-schema-and-theme`
- Commit: `c38237d` - "fix: TypeScript errors in agentic services + Phase 2.1 Semantic Memory"
- Deployment: Ready for preview testing

## What's NEW in This Version

### Phase 1: Elite Agentic AI System (Commit 80a88bc)
✅ **DashAgenticEngine** - Task execution & workflow automation
✅ **DashDecisionEngine** - Autonomous decision making with risk assessment
✅ **DashProactiveEngine** - Proactive behaviors and opportunity detection
✅ **DashContextAnalyzer** - Multi-dimensional context understanding
✅ **DashNavigationHandler** - Smart navigation and routing
✅ **DashTaskAutomation** - Automated task workflows

### Phase 2.1: Semantic Memory (Commit c38237d)
✅ **SemanticMemoryEngine** - Vector-powered semantic search
  - pgvector integration with cosine similarity
  - Relevance scoring (similarity + recency + importance + access frequency)
  - Memory consolidation (85% similarity threshold)
  - Smart pruning (90+ day old, low importance)
  - Access tracking for LRU optimization

## Testing Focus Areas

### 1. Enhanced Context Understanding
**What to Test:**
- Ask Dash complex questions with implied context
- Test multi-intent recognition (e.g., "I need to create a lesson plan for math and schedule it for tomorrow")
- Verify Dash understands role-specific needs

**Test Cases:**
```
As Teacher:
- "I need help planning a lesson about shapes for 4-year-olds"
- "Create a weekly schedule for my class activities"
- "Track attendance for this week and notify parents of absences"

As Parent:
- "How is my child doing this month?"
- "Show me my child's recent activities"
- "I need to update my payment information"

As Principal:
- "Give me a report on school performance"
- "Schedule a meeting with all teachers"
- "Show me budget utilization"
```

### 2. Proactive Behaviors
**What to Test:**
- Dash should suggest actions based on context
- Look for "suggested_actions" in responses
- Test if Dash notices patterns and makes recommendations

**Expected Behaviors:**
- Suggests creating tasks when discussing future work
- Offers to schedule reminders automatically
- Identifies automation opportunities
- Provides role-specific proactive suggestions

### 3. Task Automation
**What to Test:**
- Ask Dash to create automated workflows
- Test task creation, execution, and tracking
- Verify step-by-step automation

**Test Cases:**
```
- "Create a lesson plan for me" (should create multi-step task)
- "Remind me to check attendance tomorrow at 9am"
- "Set up a recurring task to send weekly reports"
```

### 4. Decision Making
**What to Test:**
- Ask Dash to make decisions or provide recommendations
- Verify risk assessment in decisions
- Test autonomy levels (observer/assistant/partner/autonomous)

**Test Cases:**
```
- "Should I schedule the parent meeting this week or next week?"
- "What's the best time to send the newsletter?"
- "Help me decide which lesson plan to use"
```

### 5. Semantic Memory
**What to Test:**
- Have conversations referencing past interactions
- Test if Dash remembers user preferences
- Verify contextual recall across sessions

**Test Cases:**
```
Session 1:
- "I prefer teaching in the mornings"
- "My favorite subject is math"

Session 2 (later):
- "When should I schedule my lessons?" 
  (should remember morning preference)
- "Suggest activities for my class"
  (should consider math preference)
```

### 6. Role-Specific Intelligence
**What to Test:**
- Verify Dash adapts responses based on user role
- Test role-specific capabilities and workflows
- Check if suggestions are contextually appropriate

**Expected Behavior:**
- Teachers get lesson planning, grading assistance
- Parents get child progress, communication tools
- Principals get reports, admin tools, oversight features

## How to Test

### Step 1: Deploy Current Changes
```bash
# Already done - we're on clean c38237d commit
# Preview channel should be on this version now
```

### Step 2: Open Dash AI Assistant
```
1. Launch app
2. Navigate to Dash AI (message icon or direct access)
3. Start a conversation
```

### Step 3: Test Enhanced Features

#### Test 1: Context Understanding
```
User: "I need to create a lesson plan for teaching colors to my preschoolers tomorrow morning"

Expected Response:
- Understands: lesson planning + subject (colors) + audience (preschoolers) + timing (tomorrow morning)
- Provides: detailed lesson structure
- Suggests: creating a task, scheduling reminder
- Metadata should show high confidence
```

#### Test 2: Proactive Suggestions
```
User: "I have a lot of work this week"

Expected Response:
- Asks what specific tasks need attention
- Suggests creating a workflow or schedule
- Offers to break down work into manageable tasks
- Provides productivity tips based on role
```

#### Test 3: Task Automation
```
User: "Create a weekly report automation"

Expected Response:
- Creates a task workflow
- Shows step-by-step breakdown
- Offers to schedule recurring execution
- Provides task ID and status tracking
```

#### Test 4: Memory & Continuity
```
Session 1:
User: "I teach 4-year-olds in the morning class"

Session 2 (next day):
User: "Suggest activities for my class"

Expected Response:
- References the 4-year-old age group
- Considers morning schedule
- Tailors suggestions to preschool level
```

### Step 4: Check for Regressions
Verify existing functionality still works:
- ✅ Basic Q&A responses
- ✅ Voice input/output
- ✅ Message history
- ✅ Conversation management
- ✅ Attachments (if applicable)

## Success Criteria

### Critical (Must Pass):
- [ ] Dash responds to all messages (no crashes)
- [ ] Responses are contextually relevant
- [ ] Voice input works (separate microphone issue)
- [ ] Conversation history persists
- [ ] Role-specific features are appropriate

### Enhanced Features (New):
- [ ] Context analyzer detects intent accurately
- [ ] Proactive suggestions appear in responses
- [ ] Task creation workflows function
- [ ] Semantic memory recalls past interactions
- [ ] Decision making provides reasoned recommendations
- [ ] Suggested actions are actionable and relevant

### Performance:
- [ ] Response time < 3 seconds for simple queries
- [ ] Response time < 8 seconds for complex queries
- [ ] No memory leaks during extended use
- [ ] App remains responsive while Dash is thinking

## Known Issues to Watch For

1. **TypeScript/Build Issues** - All fixed in c38237d
2. **Import Errors** - All fixed in c38237d  
3. **Database Schema** - Verify pgvector extension exists (for semantic memory)
4. **Microphone** - Separate issue, not part of this test

## Rollback Plan

If issues are found:
```bash
# Already have clean rollback mechanism
# Currently ON the target version (c38237d)
# Previous rollback was successful
```

## Deployment Steps

### Option 1: Test Locally First
```bash
# Run on local device/emulator
npm run android
# or
npm run dev:android
```

### Option 2: Deploy to Preview
```bash
# Push OTA update to preview channel
eas update --branch preview --message "Dash Agentic Enhancements - Phase 1 & 2.1"
```

## Notes
- Focus ONLY on Dash functionality
- Ignore biometric login (already working after rollback)
- Microphone issue is separate (existing issue, not related to agentic enhancements)
- Test on Android only (no iOS focus)
