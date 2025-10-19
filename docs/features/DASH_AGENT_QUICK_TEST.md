# Dash Agent Quick Testing Guide

## What Changed
✅ **Dash is now fully agentic!** Every message goes through:
1. **Context Analyzer** - Understands intent and context
2. **Proactive Engine** - Identifies opportunities
3. **Enhanced Response** - Generates intelligent responses
4. **Action Handler** - Auto-creates tasks and workflows
5. **Memory** - Learns from interactions

## Quick Test Cases

### Test 1: Basic Greeting
```
You: "Hello Dash"
Expected: Friendly greeting + role-specific suggestions
Console: Should see "[Dash Agent] Processing message with agentic engines..."
```

### Test 2: Lesson Planning Intent
```
You: "I need to create a lesson plan for teaching shapes to 4-year-olds"
Expected:
- Detailed lesson plan
- Suggested actions: "Create Lesson", "Generate Worksheet", "Schedule"
- Console shows: Intent detected as "create_lesson"
- May auto-create a task workflow
```

### Test 3: Proactive Suggestions
```
You: "I have a busy week ahead"
Expected:
- Asks about specific tasks
- Suggests workflow automation
- Offers to create schedule
- Console shows: "Found X proactive opportunities"
```

### Test 4: Multi-Intent Query
```
You: "Create a math worksheet and schedule it for tomorrow morning"
Expected:
- Detects multiple intents: worksheet generation + scheduling
- Provides combined response
- Creates tasks for both actions
- Suggests next steps
```

## Console Logs to Watch For

✅ **Success Indicators:**
```
[Dash Agent] Processing message with agentic engines...
[Dash Agent] Phase 1: Analyzing context...
[Dash Agent] Context analysis complete. Intent: <detected_intent>
[Dash Agent] Phase 2: Identifying proactive opportunities...
[Dash Agent] Found X proactive opportunities
[Dash Agent] Phase 3: Generating enhanced response...
[Dash Agent] Phase 4: Handling proactive opportunities...
[Dash Agent] Phase 5: Handling action intent...
[Dash Agent] Response generation complete!
```

❌ **Error Indicators:**
```
[Dash Agent] Agentic processing failed, falling back to legacy:
```
If you see this, check the error details and report.

## Features to Test

### Context Understanding
- [x] Multi-turn conversations (remembers context)
- [x] Role-specific responses
- [x] Intent detection accuracy
- [x] Sentiment analysis

### Proactive Behaviors  
- [x] Workflow suggestions
- [x] Automation opportunities
- [x] Reminder creation
- [x] Task recommendations

### Task Automation
- [x] Auto-creates tasks from requests
- [x] Multi-step workflows
- [x] Progress tracking
- [x] Approval workflows (for high-risk actions)

### Intelligence
- [x] Learns from interactions
- [x] Contextual memory
- [x] Personalized suggestions
- [x] Adaptive responses

## Performance Expectations

- **Response Time:** 2-4 seconds (agentic processing adds ~1s)
- **Context Analysis:** <500ms
- **Proactive Detection:** <300ms
- **Task Creation:** <200ms

## Troubleshooting

### Issue: Slow Responses
**Check:** Network connection, AI service availability
**Console:** Look for slow phase timings

### Issue: No Proactive Suggestions
**Check:** User profile loaded, context analyzer running
**Console:** Should see "Found X proactive opportunities"

### Issue: Tasks Not Created
**Check:** Intent detection working, task creation not blocked
**Console:** Look for Phase 5 execution

### Issue: Falls Back to Legacy
**Check:** Error logs in console
**Action:** Report the error, legacy is a safe fallback

## How to Test Locally

```bash
# Clear any cached data
rm -rf node_modules/.cache

# Run on Android
npm run dev:android

# Watch console output
# Open Dash AI and start testing
```

## Expected Behavior Changes

### Before (Legacy)
- Basic pattern matching
- Generic responses
- Manual task creation
- No proactive suggestions

### After (Agentic)
- Deep context understanding
- Intelligent, personalized responses
- Automatic task creation
- Rich proactive suggestions
- Learning from interactions

## Success Criteria

✅ **Dash is agentic when:**
- Every message shows agentic phases in console
- Proactive suggestions appear regularly
- Tasks are auto-created from requests
- Responses feel more intelligent and contextual
- System learns from your interactions

## Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Check console for errors
3. ✅ Test with different user roles
4. ✅ Validate performance
5. ✅ Report any issues
6. ✅ Commit and deploy if successful
