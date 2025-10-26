# Voice Input Test Verification (Single-Use Mode)

**Feature:** Mic button in DashAssistant chat input  
**Date Fixed:** 2025-10-20  
**Issue:** Transcript was lost when `onFinal` triggered without `dashInstance`  
**Fix:** Prioritize `onTranscriptReady` callback before AI processing

---

## Test Checklist

### 1. Basic Flow (Happy Path)
- [ ] Open DashAssistant chat screen
- [ ] Click the mic button (bottom right, next to send button)
- [ ] Voice modal opens with holographic orb
- [ ] Speak a test phrase: "This is a test message"
- [ ] Wait for recording to auto-stop (silence detection)
- [ ] **Expected:** Transcript appears in the chat input field
- [ ] **Expected:** Modal closes automatically
- [ ] **Expected:** Input field is focused and ready to edit
- [ ] **Expected:** NO AI response is generated (just transcript)

**Log Markers:**
```
[VoiceModalAzure] 📝 Input mode: returning transcript to callback
[DashAssistant] (no AI call logs)
```

---

### 2. Manual Send (User clicks checkmark)
- [ ] Click mic button in chat
- [ ] Speak: "Manual send test"
- [ ] While modal is open, click the checkmark/send button
- [ ] **Expected:** Transcript appears in input field
- [ ] **Expected:** Modal closes
- [ ] **Expected:** No AI call

---

### 3. Editable Transcript
- [ ] Click mic button
- [ ] Speak: "Hello world"
- [ ] **Expected:** Transcript appears as editable TextInput in modal
- [ ] Edit the transcript to: "Hello beautiful world"
- [ ] Click send/checkmark button
- [ ] **Expected:** Edited version appears in input field
- [ ] Type more text in input: "How are you?"
- [ ] Send the message
- [ ] **Expected:** Full message sent to AI: "Hello beautiful world How are you?"

---

### 4. Cancel/Close Flow
- [ ] Click mic button
- [ ] Speak something
- [ ] Click X (close button) in top-right of modal
- [ ] **Expected:** Modal closes without placing transcript in input
- [ ] **Expected:** Input field remains unchanged

---

### 5. Error Handling
- [ ] Disable microphone permission in Android settings
- [ ] Click mic button in chat
- [ ] **Expected:** Error message: "Voice recognition unavailable"
- [ ] **Expected:** Can still close modal
- [ ] Re-enable microphone permission
- [ ] Try again
- [ ] **Expected:** Works normally

---

### 6. Multiple Uses (Sequential)
- [ ] Click mic button → speak "First message" → transcript appears in input
- [ ] Don't send yet, click mic button again
- [ ] Speak "Second message" → transcript appears in input (replaces previous)
- [ ] Send the message
- [ ] **Expected:** AI receives "Second message" only

---

### 7. Long-Press FAB vs Mic Button (Different Modes)
- [ ] Long-press FAB (floating button) → **Streaming conversational mode**
  - **Expected:** Speak and get AI response automatically
  - **Expected:** Response is spoken back via TTS
  - **Expected:** No transcript in input field
- [ ] Click mic button in chat → **Single-use recording mode**
  - **Expected:** Speak and get transcript in input field
  - **Expected:** No AI response
  - **Expected:** No TTS playback
- [ ] **Verify:** These two modes are independent and work differently

---

### 8. Language Support
- [ ] Change language to Afrikaans in settings
- [ ] Click mic button in chat
- [ ] Speak in Afrikaans: "Hallo wêreld"
- [ ] **Expected:** Transcript in Afrikaans appears in input
- [ ] Change back to English
- [ ] Test again in English
- [ ] **Expected:** Works correctly

---

### 9. Performance (Android Physical Device)
- [ ] Test on physical Android device (not emulator)
- [ ] Click mic button → speak immediately
- [ ] **Expected:** Haptic feedback on mic press
- [ ] **Expected:** Orb animation is smooth (60fps)
- [ ] **Expected:** Transcript appears within 1-2 seconds after speaking
- [ ] **Expected:** No lag when modal opens/closes

---

### 10. Edge Cases
- [ ] Click mic button → don't speak anything → wait 5 seconds
  - **Expected:** Modal stays open (no auto-close on silence at start)
- [ ] Click mic button → speak very long text (2 minutes)
  - **Expected:** Transcript accumulates correctly
  - **Expected:** Can edit long transcript
- [ ] Click mic button → speak with background noise
  - **Expected:** Transcript may have errors but still appears in input
  - **Expected:** User can edit to correct
- [ ] Click mic button while already typing in input
  - **Expected:** Modal opens, existing text is preserved
  - **Expected:** Transcript replaces typed text when returned

---

## Regression Tests (Ensure we didn't break other modes)

### FAB Long-Press (Streaming Mode)
- [ ] Long-press FAB → speak "What's the weather today?"
- [ ] **Expected:** AI responds conversationally
- [ ] **Expected:** Response is spoken via TTS
- [ ] **Expected:** Modal closes after response
- [ ] **Expected:** Nothing appears in chat input

### Voice Button in Header (if exists)
- [ ] Check if there's a voice button in DashAssistant header
- [ ] Test it has same behavior as mic button in input
- [ ] **Expected:** Transcript appears in input, no AI call

---

## Known Limitations (Document for Phase 2)
- ❌ No streaming transcription (shows final only)
- ❌ No live waveform during recording (static orb)
- ❌ No mid-recording edits (only after final)
- ❌ No voice commands (e.g., "send message", "cancel")
- ❌ No speaker identification (multi-speaker)

**Note:** These are planned for Phase 2 WebSocket streaming upgrade.

---

## Success Criteria

✅ **PASS:** All 10 basic tests pass  
✅ **PASS:** Regression tests confirm no breakage  
✅ **PASS:** No console errors during normal flow  
✅ **PASS:** Haptic feedback works on physical device  
✅ **PASS:** Transcript appears in input field consistently  

---

## Debugging Logs to Watch

**Good Flow (Expected):**
```
[VoiceModalAzure] 🎙️ Initializing voice session...
[VoiceModalAzure] Provider selected: azure
[VoiceModalAzure] ✅ Voice session ready
[VoiceModalAzure] ✅ Final transcript: This is a test
[VoiceModalAzure] 📝 Input mode: returning transcript to callback
[DashAssistant] (no further logs - no AI call)
```

**Bad Flow (Bug):**
```
[VoiceModalAzure] ✅ Final transcript: This is a test
[VoiceModalAzure] ⚠️ No dashInstance for AI processing
(transcript never reaches input field)
```

---

## Related Files
- `components/ai/DashAssistant.tsx::handleInputMicPress()` - Mic button handler
- `components/voice/VoiceUIController.tsx` - Mode routing logic
- `components/ai/VoiceRecordingModalAzure.tsx::handleTranscript()` - Fixed priority logic
- `lib/voice/unifiedProvider.ts` - Voice provider abstraction

---

**Last Updated:** 2025-10-20  
**Tested By:** [Your Name]  
**Test Device:** [Device Model + Android Version]  
**Test Status:** ⏳ Pending Verification
