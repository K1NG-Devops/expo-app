# Dash Voice UI/UX Improvements & RLS Fix

**Date:** 2025-10-19  
**Status:** ✅ Implemented  
**Related Issues:** Voice recording modal UX, RLS policy upload errors

## Overview

Comprehensive improvements to Dash AI Assistant voice recording interface and resolution of voice note upload failures due to RLS policy mismatch.

## Changes Implemented

### 1. **Fixed Voice Notes RLS Upload Issue** ✅

**Problem:** Voice note uploads failing with "new row violates row-level security policy"

**Root Cause:** Storage path format mismatch between app code and RLS policy
- Code was using: `{platform}/{user_id}/{filename}` (e.g., `android/uuid/file.m4a`)
- RLS policy expected: `{user_id}/{filename}` (e.g., `uuid/file.m4a`)

**Fix:**
```typescript
// services/DashAIAssistant.ts line ~3547
// Before:
const prefix = Platform.OS === 'web' ? 'web' : Platform.OS;
storagePath = `${prefix}/${userId}/${fileName}`;

// After:
storagePath = `${userId}/${fileName}`;
```

**Migration:** `supabase/migrations/20251008060200_voice_notes_rls_policies_only.sql`  
RLS policies expect first folder to match `auth.uid()`

---

### 2. **Adopted VoiceUIController for Input Recording** ✅

**Before:**
- Input mic button used legacy `startRecording/stopRecording` 
- Showed basic "Recording... Release to send" text indicator
- No transcript editing capability

**After:**
- Input mic button opens `VoiceRecordingModalAzure` via `VoiceUIController`
- Beautiful HolographicOrb animation during recording
- Live transcript with editing capability
- Transcript placed in input field for review before sending

**Code Changes:**
```typescript
// New handler in DashAssistant.tsx
const handleInputMicPress = async () => {
  await voiceUI.open({
    language: activeLang,
    tier: String(tier || 'free'),
    forceMode: 'recording',
    onTranscriptReady: (transcript) => {
      setInputText(transcript);
      setTimeout(() => inputRef.current?.focus(), 300);
    },
  });
};
```

**Removed:**
- `isRecording` state
- `startRecording` and `stopRecording` functions
- Pulse animation useEffect
- Recording indicator UI
- `recordingAnimation` and `pulseAnimation` refs

---

### 3. **Reorganized Input Area Layout** ✅

**Camera Button (Outside Input):**
- Positioned to the left of input wrapper
- Opens photo picker directly
- Icon: `camera-outline`

**Paperclip Icon (Inside Input):**
- Positioned as left accessory inside input border
- Opens attachment action sheet (Photos/Documents)
- Shows badge count when attachments selected
- Icon: `attach`

**TextInput:**
- Wrapped in `inputWrapper` with border
- `paddingLeft: 36` to make room for paperclip
- Removed individual border (wrapper has border)

**Mic Button:**
- Opens animated recording modal (not streaming orb)
- Simple `onPress` (no hold gestures)

**Layout Order:**
```
[Camera] [InputWrapper: [Paperclip] TextInput] [Send/Mic]
```

**Styles Added:**
```typescript
cameraButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, position: 'relative', minHeight: 40 },
inputLeftIcon: { position: 'absolute', left: 10, zIndex: 1, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
attachBadgeSmall: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
attachBadgeSmallText: { fontSize: 8, fontWeight: '600' },
```

---

### 4. **Header Improvements** ✅

**Removed:**
- Command Palette icon (compass button)

**Added:**
- `TierBadge` component next to Dash title
- Shows subscription tier with emoji and color coding
- Size: `small`, showIcon: `true`

**Header Structure:**
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Text style={[styles.headerTitle, { color: theme.text }]}>Dash</Text>
  {subReady && tier && (
    <TierBadge tier={tier as any} size="small" showIcon={true} />
  )}
</View>
```

**Kept:**
- Blue mic button (opens streaming orb for conversational voice mode)
- Stop speaking button (when TTS active)
- Conversations history button
- Settings button
- Close button

---

### 5. **Enhanced Accessibility & Haptics** ✅

**Accessibility Labels:**
- Camera button: "Open camera or pick photo"
- Paperclip button: "Attach files"
- Mic button: "Record voice message"
- Send button: "Send message"
- Header mic: "Interactive Voice Assistant"

**Haptic Feedback:**
- Camera press: `Haptics.selectionAsync()`
- Paperclip press: `Haptics.selectionAsync()`
- Mic press: `Haptics.impactAsync(Light)`
- Send press: `Haptics.impactAsync(Medium)`
- Header mic press: `Haptics.impactAsync(Light)`

**Accessibility Roles:**
- All interactive buttons: `accessibilityRole="button"`

---

## Voice Modal Behavior Comparison

| Context | Modal Type | Behavior |
|---------|-----------|----------|
| **Input Area Mic** | VoiceRecordingModalAzure (recording) | - Animated orb<br>- Live transcript with editing<br>- Send button or auto-complete<br>- Transcript → input field |
| **Header Mic** | DashVoiceMode (streaming) | - Full-screen orb<br>- Real-time conversation<br>- No editing<br>- Auto-speak responses |

---

## Testing Checklist

### Voice Recording ✅
- [ ] Input mic opens animated modal with HolographicOrb
- [ ] Live transcript appears during recording
- [ ] Transcript is editable in modal
- [ ] Pressing Send in modal places transcript in input field
- [ ] Voice upload succeeds without RLS errors
- [ ] Logs show path format: `user_uuid/filename.m4a`

### Input Area Layout ✅
- [ ] Camera button positioned outside input (left)
- [ ] Paperclip icon inside input (left accessory)
- [ ] TextInput has proper padding for paperclip
- [ ] Camera opens photo picker
- [ ] Paperclip opens action sheet (Photos/Documents)
- [ ] Attachment badge appears on paperclip when files selected
- [ ] Mic button shows when input empty
- [ ] Send button shows when input has text or attachments

### Header ✅
- [ ] Tier badge displays next to "Dash" title
- [ ] Tier badge shows correct subscription tier
- [ ] Compass icon removed
- [ ] Header mic still opens streaming orb
- [ ] All buttons have haptic feedback

### Accessibility ✅
- [ ] All buttons have descriptive labels
- [ ] Screen reader announces button purposes
- [ ] Touch targets minimum 40x40 (44x44 recommended)

### Edge Cases
- [ ] Loading states disable appropriate buttons
- [ ] No double-submission possible
- [ ] Handles network errors gracefully
- [ ] Works on web (mic may be disabled by capabilities)
- [ ] Works on Android physical device
- [ ] Works on iOS simulator/device

---

## Database Verification

**Run these commands to verify RLS policies:**

```bash
# Lint SQL migrations
npm run lint:sql

# Push migrations to Supabase (NO --local flag)
supabase db push

# Verify no schema drift
supabase db diff

# Inspect RLS policies
npm run inspect-db
```

**Expected RLS Policies:**
```sql
-- storage.objects policies for voice-notes bucket
voice_notes_insert_policy: bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text
voice_notes_select_policy: bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text
voice_notes_update_policy: bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text
voice_notes_delete_policy: bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text
```

---

## Known Limitations

1. **Command Palette Removed:** Users must use conversation history or settings to access advanced features
2. **No Hold-to-Record:** Input mic is tap-only (opens modal). Long-press functionality removed.
3. **Streaming Orb:** Still accessible via header mic for premium users with capabilities

---

## Follow-Up Tasks

- [ ] Audit other storage paths for similar RLS violations (attachments, profile photos)
- [ ] Add tier upgrade prompt when free users tap streaming mic
- [ ] Consider re-adding command palette as settings submenu
- [ ] Monitor voice upload success rates via PostHog/Sentry
- [ ] Document voice modal UX patterns in design system

---

## References

- **Files Modified:**
  - `services/DashAIAssistant.ts` (RLS path fix)
  - `components/ai/DashAssistant.tsx` (UI/UX improvements)
  
- **Components Used:**
  - `VoiceUIController` (unified voice modal routing)
  - `VoiceRecordingModalAzure` (animated recording with editing)
  - `DashVoiceMode` (streaming conversation orb)
  - `TierBadge` (subscription tier display)

- **Migrations:**
  - `supabase/migrations/20251008060200_voice_notes_rls_policies_only.sql`

- **Related Docs:**
  - `docs/features/voice-system-setup.md`
  - `docs/security/RLS_POLICIES.md`
  - `WARP.md` (project rules)
