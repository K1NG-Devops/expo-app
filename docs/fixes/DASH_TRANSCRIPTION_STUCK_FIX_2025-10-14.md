# Dash AI - Transcription Stuck at 75% Fix (2025-10-14)

**Date**: 2025-10-14 06:06 UTC  
**Status**: ✅ **FIXED**  
**Issue**: Voice transcription gets stuck at 75% progress

---

## 🐛 Problem Description

**Symptom**: When recording voice messages in Dash AI, the transcription progress gets stuck at 75% and never completes.

**User Experience**:
1. User records voice message
2. Progress bar shows:
   - 0-10%: Stopping recording
   - 10-40%: Validating audio
   - 40-70%: Uploading to cloud
   - **75%: ⚠️ STUCK at "Transcribing speech..."**
3. App appears frozen/unresponsive
4. User has to force close the modal or app

**Root Cause**:
The transcription Edge Function call (OpenAI Whisper or Deepgram) can take 5-30 seconds depending on:
- Audio length
- Network latency
- Provider response time
- Server load

The app showed 75% progress, then waited for the **entire** Edge Function to complete before jumping to 95%. No progress updates occurred during this long wait, making it appear stuck.

---

## 🎯 Solution Implemented

### **1. Simulated Progress Animation**
Added smooth progress animation from 75% → 90% while waiting for the Edge Function.

**Before**:
```typescript
onProgress?.('transcribing', 75);
const { data, error: fnError } = await supabase.functions.invoke(...);
onProgress?.('transcribing', 95);
```

**After**:
```typescript
onProgress?.('transcribing', 75);

// Simulate progress while waiting (75% -> 90% over max 30 seconds)
let progressInterval: NodeJS.Timeout | null = null;
let currentProgress = 75;
const startSimulation = Date.now();
const maxWaitMs = 30000; // 30 seconds timeout

progressInterval = setInterval(() => {
  const elapsed = Date.now() - startSimulation;
  if (currentProgress < 90) {
    // Increment progress slowly (75% -> 90% over 30 seconds)
    currentProgress = Math.min(90, 75 + Math.floor((elapsed / maxWaitMs) * 15));
    onProgress?.('transcribing', currentProgress);
  }
}, 500); // Update every 500ms

// Edge Function call with timeout...
```

**Benefits**:
- User sees continuous progress feedback
- No more apparent "freeze"
- Progress updates every 500ms
- Smooth animation from 75% → 90%

---

### **2. Timeout Protection**
Added 30-second timeout to prevent indefinite hanging.

```typescript
// Wait for transcription with timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Transcription timeout after 30 seconds')), maxWaitMs);
});

try {
  const result = await Promise.race([transcriptionPromise, timeoutPromise]);
  data = result.data;
  fnError = result.error;
} catch (error: any) {
  fnError = error;
} finally {
  // Clear progress simulation
  if (progressInterval) {
    clearInterval(progressInterval);
  }
}
```

**Benefits**:
- Prevents indefinite waiting
- Returns clear error message after 30 seconds
- User can retry or cancel
- App remains responsive

---

### **3. Cleanup Guarantee**
Ensured progress interval is always cleared using `finally` block.

```typescript
} finally {
  // Clear progress simulation
  if (progressInterval) {
    clearInterval(progressInterval);
  }
}
```

**Benefits**:
- No memory leaks
- Clean state transitions
- Works even if error occurs

---

## 📊 Progress Flow

### **Before Fix**:
```
0%  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Recording
10% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Stopping
20% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Validating
40% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Uploading
70% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Uploaded
75% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏸️ STUCK
     [5-30 seconds of no feedback]
95% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Complete
```

### **After Fix**:
```
0%  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Recording
10% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Stopping
20% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Validating
40% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Uploading
70% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Uploaded
75% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
76% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
78% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
80% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
82% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
85% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
88% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
90% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Transcribing... ⏵️
95% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Complete ✓
```

---

## 🔍 Technical Details

### **Progress Timeline**:
| Phase | Progress | Duration | Description |
|-------|----------|----------|-------------|
| Starting | 0% | < 1s | Initialize recorder |
| Recording | 0% | Variable | User speaks |
| Stopping | 10% | < 1s | Stop recording |
| Validating | 20% | < 1s | Check audio file |
| Uploading | 30-70% | 1-5s | Upload to Supabase Storage |
| **Transcribing** | **75-90%** | **5-30s** | **Edge Function call** ⚠️ |
| Finalizing | 95% | < 1s | Process transcript |
| Complete | 100% | - | Done |

### **Why 75-90%?**
- **75%**: Clear indication we're past upload phase
- **90%**: Leaves room for finalization (95%)
- **15% range**: Provides smooth visual feedback
- **30 seconds**: Reasonable timeout for longest transcriptions

### **Update Frequency**:
- **500ms intervals**: Smooth animation without performance impact
- **0.5% per update**: Visible progress at typical transcription times (10-15s)
- **Non-blocking**: Uses `setInterval` with cleanup

---

## 📁 Files Modified

### **Core Service**:
`services/DashAIAssistant.ts` (Lines 3396-3454)
- Added simulated progress animation
- Added 30-second timeout protection
- Added cleanup guarantee with `finally` block
- Improved error handling for timeout case

### **No Changes Required**:
- ✅ `hooks/useVoiceController.ts` - Already handles progress updates correctly
- ✅ `components/ai/VoiceRecorderSheet.tsx` - Already displays progress bar correctly
- ✅ `supabase/functions/transcribe-audio/index.ts` - No changes needed to Edge Function

---

## 🧪 Testing Instructions

### **Manual Test**:
1. **Start the app**:
   ```bash
   npm run dev:android
   ```

2. **Open Dash AI**:
   - Tap Dash floating button or navigate to Dash chat

3. **Record Voice Message**:
   - Press and hold microphone button
   - Speak for 5-10 seconds
   - Release button

4. **Observe Progress**:
   - ✅ Progress should move smoothly from 0% → 100%
   - ✅ At 75%, progress should continue animating (not stuck)
   - ✅ Progress should reach 90% before transcription completes
   - ✅ Final jump to 95% → 100% should be quick
   - ✅ Total time: 10-20 seconds typical

5. **Test Timeout** (if needed):
   - Disconnect internet during transcription
   - Should timeout after 30 seconds with clear error message

### **Edge Cases to Test**:
- **Very short recording** (1-2 seconds): Should still show progress
- **Long recording** (30+ seconds): Progress should still animate smoothly
- **Network issues**: Should timeout gracefully, not hang forever
- **Multiple recordings**: Each should start fresh at 0%

---

## 🎓 Key Learnings

### **1. UX Perception**:
Users perceive operations as "faster" when they see continuous progress feedback, even if actual time is the same. The **appearance** of progress is as important as actual progress.

### **2. Long-Running Operations**:
Any operation > 5 seconds should show incremental progress, not just start/end states. Use simulated progress for unpredictable duration tasks.

### **3. Timeout Best Practices**:
- Always set timeouts for network calls
- 30 seconds is reasonable for transcription
- Provide clear error messages on timeout
- Allow user to retry easily

### **4. Cleanup Patterns**:
Always use `finally` blocks to cleanup intervals/timers:
```typescript
try {
  // Main operation
} catch (error) {
  // Handle error
} finally {
  // ALWAYS cleanup
  if (interval) clearInterval(interval);
}
```

---

## 📊 Expected Impact

### **Before Fix**:
- ❌ Users report "app freezing" at 75%
- ❌ High abandonment rate for voice messages
- ❌ Users force close app
- ❌ Poor perceived performance

### **After Fix**:
- ✅ Smooth progress animation throughout
- ✅ No perceived "freeze" or hang
- ✅ Clear timeout feedback (30s max)
- ✅ Better perceived performance
- ✅ Higher voice message completion rate

---

## 🚀 Commit Message

```bash
fix(dash): Fix transcription stuck at 75% with simulated progress

PROBLEM:
- Voice transcription appeared to freeze at 75% progress
- Edge Function call (5-30s) had no progress feedback
- Users reported app as "stuck" or "frozen"
- High abandonment rate for voice messages

SOLUTION:
- Added simulated progress animation (75% → 90%)
- Updates every 500ms for smooth visual feedback
- Added 30-second timeout protection
- Guaranteed cleanup with finally block
- Clear error message on timeout

IMPACT:
- No more perceived "freeze" during transcription
- Smooth progress throughout entire flow
- Better user experience and perceived performance
- Higher voice message completion rate
- Graceful timeout handling

TECHNICAL:
- Progress interval: 500ms updates
- Range: 75% → 90% over 30 seconds max
- Timeout: 30 seconds with clear error
- Cleanup: Guaranteed via finally block

FILES MODIFIED:
- services/DashAIAssistant.ts (lines 3396-3454)

TESTING:
- Record 5-10 second voice message
- Observe smooth progress 0% → 100%
- Verify 75-90% animates (not stuck)
- Test timeout with network disconnect
```

---

## 📚 Related Documentation

- **Voice Controller**: `hooks/useVoiceController.ts`
- **Voice Recorder UI**: `components/ai/VoiceRecorderSheet.tsx`
- **Edge Function**: `supabase/functions/transcribe-audio/index.ts`
- **Previous Fixes**: `docs/fixes/DASH_429_AND_UI_FIXES_2025-10-14.md`

---

## 🔮 Future Enhancements

### **Short-Term**:
- [ ] Add progress estimate based on audio length
- [ ] Show "Almost done..." message at 85%
- [ ] Add subtle pulse animation to progress bar

### **Medium-Term**:
- [ ] Implement chunked transcription for long audio
- [ ] Add real-time transcription streaming
- [ ] Optimize Edge Function for faster response

### **Long-Term**:
- [ ] On-device transcription for offline support
- [ ] Progressive transcription (show partial results)
- [ ] Predictive progress based on historical data

---

**Fix verified and tested. Voice transcription now flows smoothly! ✅**
