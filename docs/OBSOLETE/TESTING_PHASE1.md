# Phase 1 Testing Guide

## What You're Testing

Phase 1 has two parts:
1. ✅ **Agentic Intelligence** - Already active in production (test now)
2. 🔨 **Real-Time ASR** - Component created but NOT YET integrated into UI (can't test yet)

---

## Test 1: Agentic Intelligence (Active Now)

The agentic engines are **already working** in your Dash AI. Test them now!

### How to Test

1. **Start the app:**
   ```bash
   npm run dev:android
   ```

2. **Open Dash AI Assistant** in the app

3. **Test Context Retention:**
   ```
   You: "My name is Precious and I teach Grade R"
   [Wait for Dash response]
   You: "What grade do I teach?"
   
   Expected: Dash should remember "Grade R"
   ```

4. **Test Intent Detection:**
   ```
   You: "Create a lesson plan for teaching shapes to 4-year-olds"
   
   Expected: Dash should:
   - Recognize this is a "create_lesson" intent
   - Offer to create a task or open lesson generator
   - Extract: subject=shapes, age=4, activity=lesson planning
   ```

5. **Test Proactive Suggestions:**
   ```
   You: "I need to schedule a parent meeting tomorrow"
   
   Expected: Dash should:
   - Detect "schedule" intent
   - Suggest calendar integration
   - Offer to create a reminder
   ```

6. **Test Multi-Turn Conversation:**
   ```
   You: "Tell me about phonics teaching"
   Dash: [response]
   You: "How do I teach that to beginners?"
   Dash: [response]
   You: "What activities work best?"
   
   Expected: Dash should maintain context across all 3 messages
   ```

### What You'll See (Logs)

In your terminal/logcat, look for:
```
[Dash Agent] Processing message with agentic engines...
[Dash Agent] Phase 1: Analyzing context...
[Dash Agent] Context analysis complete. Intent: create_lesson
[Dash Agent] Phase 2: Identifying proactive opportunities...
[Dash Agent] Found 2 proactive opportunities
[Dash Agent] Phase 3: Generating enhanced response...
[Dash Agent] Phase 4: Handling proactive opportunities...
[Dash Agent] Phase 5: Handling action intent...
[Dash Agent] Response generation complete!
```

### Success Criteria

- ✅ Context retained across 3+ messages
- ✅ Intent detected correctly
- ✅ Proactive suggestions appear
- ✅ Response quality improved vs before

---

## Test 2: Real-Time ASR (Not Yet Integrated)

The `DashVoiceInput` component is **created but not integrated** into the UI yet.

### Current Status

- ✅ Component created: `/components/ai/DashVoiceInput.tsx`
- ✅ Package installed: `@react-native-voice/voice`
- ❌ Not yet added to Dash UI
- ❌ Cannot test until integrated

### To Test This Feature

**Option A: Quick Integration Test** (5 minutes)

Add this to `app/screens/dash-assistant.tsx` temporarily for testing:

```typescript
import { DashVoiceInput } from '@/components/ai/DashVoiceInput';

// Inside the component, add state:
const [testASR, setTestASR] = useState(false);

// Add a test button:
<TouchableOpacity 
  onPress={() => setTestASR(!testASR)}
  style={{ position: 'absolute', top: 100, right: 20, zIndex: 999 }}
>
  <Text style={{ backgroundColor: 'blue', color: 'white', padding: 10 }}>
    Test ASR
  </Text>
</TouchableOpacity>

// Show ASR component when testing:
{testASR && (
  <View style={{ position: 'absolute', bottom: 200, alignSelf: 'center', zIndex: 999 }}>
    <DashVoiceInput
      onTextRecognized={(text) => {
        console.log('ASR recognized:', text);
        setInputText(text);
      }}
      language="en-ZA"
      onListeningChange={(listening) => console.log('Listening:', listening)}
    />
  </View>
)}
```

Then test:
1. Tap "Test ASR" button
2. Tap microphone icon
3. Speak: "Hello Dash, how are you?"
4. Watch text appear in real-time
5. Verify accuracy

**Option B: Wait for Full Integration** (recommended)

Wait until we properly integrate the ASR into the input area (2-4 hours of work).

---

## Test 3: Verify No Breaking Changes

Make sure existing features still work:

1. **Regular Text Messages:**
   - Type and send a message
   - Should work as before

2. **Voice Notes (existing feature):**
   - Record a voice note
   - Should transcribe as before

3. **Lesson Generation:**
   - Ask Dash to create a lesson
   - Should work as before

4. **Other Features:**
   - Check dashboard navigation
   - Check other Dash features

---

## Troubleshooting

### Issue: App won't start
**Error:** `Identifier 'isWeb' has already been declared`
**Fix:** ✅ Already fixed! Run `npm run dev:android` again

### Issue: "Dash is not responding intelligently"
**Check:**
- Look for agentic logs in console
- Verify you have internet connection (AI requires API)
- Check your subscription tier (some features tier-gated)

### Issue: "Context not retained"
**Check:**
- Have at least 2 messages in conversation
- Wait for full response before next message
- Check logs for `DashContextAnalyzer` activity

### Issue: "Can't test ASR"
**Reason:** Not integrated yet. See "Test 2" above for options.

---

## What Happens Next?

### After Testing Phase 1.1 (Agentic Intelligence)
- Gather feedback on response quality
- Check if context retention works as expected
- Verify intent detection accuracy

### Before Testing Phase 1.2 (Real-Time ASR)
- Need to integrate `DashVoiceInput` into UI
- Add voice mode toggle
- Connect to message input

### Then Move to Phase 2
- Multimodal capabilities (images/video)
- Third-party integrations (calendar, email)
- Performance optimizations

---

## Quick Test Commands

```bash
# Start the app
npm run dev:android

# Watch logs (in another terminal)
npx react-native log-android

# Type check (should pass)
npm run typecheck

# Lint check
npm run lint
```

---

## Summary

**Ready to Test Now:**
- ✅ Agentic Intelligence (fully active)
- ✅ Context retention
- ✅ Intent detection  
- ✅ Proactive suggestions

**Not Ready Yet:**
- ❌ Real-Time ASR (component exists, needs UI integration)

**Start Testing:** Open Dash and have a conversation! 🚀
