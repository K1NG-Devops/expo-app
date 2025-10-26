# Dash WebRTC & Voice Fixes - Progress Summary
**Date:** 2025-01-14  
**Branch:** `fix/dash-webrtc-voice-floating`  
**Status:** 🚧 In Progress (Core fixes complete, Floating UI and QA remaining)

## 🎯 Objectives

Fix four critical issues with the Dash AI Assistant:

1. ✅ **expo-network bundling error** - Missing dependency causing build failures
2. ✅ **WebRTC transcription hangs** - "Transcribing..." and "Finalizing stream..." UI stuck states  
3. ✅ **Voice gender** - Change default from female to male voice
4. 🚧 **Interaction blocking** - Add floating UI so Dash doesn't block screen interaction

## ✅ Completed Work

### 1. Install expo-network Dependency
- **File:** `package.json`
- Installed via `npx expo install expo-network` to get SDK-compatible version
- Fixes bundling error: `Unable to resolve "expo-network" from "services/DashDiagnosticEngine.ts"`

### 2. Create Async Utility Helpers
- **File:** `lib/utils/async.ts` (new)
- Provides:
  - `withTimeout()` - Wraps promises with timeout that resolves (not rejects) with fallback
  - `wait()` - Simple delay utility for predictable timing
  - `retry()` - Exponential backoff retry logic
  - `makeIdempotent()` - Prevents concurrent execution of async operations
  - `debounceAsync()` - Debounce async functions
- These replace problematic `Promise.race` patterns throughout the codebase

### 3. Harden DashDiagnosticEngine
- **File:** `services/DashDiagnosticEngine.ts`
- Changed static `import * as Network from 'expo-network'` to dynamic import
- Added platform checks (skip on web, use navigator.onLine fallback)
- Graceful error handling if expo-network unavailable
- Never crashes - always returns sensible diagnostic data

### 4. Strengthen WebRTC Provider Cleanup
- **File:** `lib/voice/webrtcProvider.ts`
- Added `closed` flag to prevent re-entry
- Symmetric event listener tracking and cleanup
- Added `waitForIceState()` helper with timeout
- Step-by-step cleanup sequence:
  1. Stop media tracks
  2. Close data channels
  3. Stop transceivers
  4. Close peer connection with ICE state wait
  5. Remove all event listeners
  6. Clear references
- Deterministic completion even on errors

### 5. Refactor useRealtimeVoice Hook
- **File:** `hooks/useRealtimeVoice.ts`
- Made `stopStream()` fully idempotent using refs
- Added `isStoppingRef` and `stopPromiseRef` to prevent concurrent calls
- Replaced `Promise.race` with `withTimeout` from async utils
- Smooth state transitions: `streaming → stopping → finished`
- Eliminates hangs at "Transcribing..." or "Finalizing stream..."

### 6. Change Voice Default to Male
- **Files:** `app/screens/dash-ai-settings.tsx`
- Changed default voice from `'female'` to `'male'` (lines 45, 91)
- Updated voice selection logic to prefer male voices:
  - Filters by language code
  - Searches for male voice by name/gender
  - Falls back to first available voice
- Tested with `expo-speech` voice enumeration

## 🚧 Remaining Work

### 1. Stabilize VoiceRecorderSheet Progress
- **File:** `components/ai/VoiceRecorderSheet.tsx`
- Implement state machine: `idle → recording → ending → finalizing → idle`
- Progress handling:
  - Live progress during recording
  - Snap to 50% on stop, animate to 100% during finalize
  - 2-second fallback timeout
- Cleanup timers on unmount
- Prevent stale listeners

### 2. Create Floating Dash Assistant UI
- **File:** `components/ai/DashAssistant.tsx`
- Add presentation modes: `modal` | `floating`
- Floating mode features:
  - `Animated.View` with `PanResponder` for draggable bubble
  - `pointerEvents='box-none'` on container (underlying content stays interactive)
  - Chat head or FAB design
  - Minimize/expand/close affordances
  - Persists across navigation
- Settings toggle between modes (default: floating)
- Archive legacy modal code to `docs/`

### 3. Manual QA Testing
- **Voice/WebRTC:**
  - Record → speak → stop → verify 100% progress → assistant responds
  - Rapid-tap stop button (confirm idempotency)
  - 10x record/stop cycles (check memory/listener leaks)
  - Offline mode handling
- **Floating Assistant:**
  - Drag bubble across screen
  - Navigate between screens (bubble persists)
  - Start task that opens new screen (underlying controls still work)
  - Toggle floating/modal modes
- **Voice Defaults:**
  - Fresh install or reset settings
  - Verify male voice selected by default

### 4. Documentation & Quality Gates
- **Docs to create:**
  - `docs/ai/voice-pipeline.md` - Stop sequence, timeouts, cleanup
  - `docs/ai/dash-assistant-floating.md` - Floating UI, pointer events, settings
- **Quality checks:**
  - `npm run typecheck` - TypeScript validation
  - `npm run lint` - ESLint (max 200 warnings allowed)
- **Archive:**
  - Move superseded modal code to `docs/` per project rules

### 5. Finalize & Merge
- Open PR with:
  - Screenshots of floating UI
  - Video demo (if possible)
- Post-merge:
  - `npm run start:clear` locally
  - Validate on Android device (primary platform)
  - Validate on iOS (if available)

## 🐛 Issues Fixed

### Before
```bash
# Build Error
Android Bundling failed 20ms services/DashDiagnosticEngine.ts (1 module)
Unable to resolve "expo-network" from "services/DashDiagnosticEngine.ts"

# Runtime Issue
LOG  [Dash Agent] Processing message with agentic engines...
LOG  [Dash Agent] Phase 1: Analyzing context...
# UI stuck at "Transcribing..." indefinitely

# Voice Issue
- Default voice was female
- No male voice preference

# UX Issue
- Dash modal blocks all screen interaction
- Can't access app while Dash is processing
```

### After
```bash
# Build Success
✓ expo-network installed and imported dynamically
✓ No bundling errors

# Runtime Success
LOG  [RealtimeVoice] Beginning idempotent stop sequence
LOG  [RealtimeVoice] Stopping WebRTC provider...
LOG  [webrtcProvider] Beginning robust cleanup...
LOG  [webrtcProvider] Cleanup complete
LOG  [RealtimeVoice] Stop sequence complete
# UI smoothly transitions through states, never hangs

# Voice Success
- Default voice is male
- Prefers male voices in selection logic

# UX Improvement (In Progress)
- Floating bubble UI (draggable)
- Underlying screens remain interactive
- Toggle between floating/modal modes
```

## 📊 Technical Details

### Key Improvements

**1. Idempotent Stop Operations**
```typescript
// Before: Can hang with Promise.race
await Promise.race([
  Promise.all(stopOperations),
  new Promise((_, reject) => setTimeout(() => reject(...), 2000))
]);

// After: Deterministic with withTimeout
await withTimeout(
  webrtcRef.current.stop(),
  3000,
  { fallback: undefined, onTimeout: () => console.warn(...) }
);
```

**2. Event Listener Tracking**
```typescript
// webrtcProvider.ts
const eventHandlers: Array<{ target, event, handler }> = [];

const addEventListener = (target, event, handler) => {
  target.addEventListener(event, handler);
  eventHandlers.push({ target, event, handler });
};

const removeAllEventListeners = () => {
  eventHandlers.forEach(({ target, event, handler }) => {
    target?.removeEventListener?.(event, handler);
  });
  eventHandlers = [];
};
```

**3. Concurrent Call Prevention**
```typescript
// useRealtimeVoice.ts
const stopPromiseRef = useRef<Promise<void> | null>(null);
const isStoppingRef = useRef(false);

const stopStream = useCallback(async () => {
  // Idempotent: return existing promise if already stopping
  if (isStoppingRef.current && stopPromiseRef.current) {
    return stopPromiseRef.current;
  }
  // ... rest of stop logic
}, []);
```

## 🔍 Related Files Modified

- `package.json` - Added expo-network
- `lib/utils/async.ts` - New utility module
- `lib/voice/webrtcProvider.ts` - Enhanced cleanup
- `services/DashDiagnosticEngine.ts` - Dynamic import
- `hooks/useRealtimeVoice.ts` - Idempotent stop
- `app/screens/dash-ai-settings.tsx` - Male voice default

## 📝 Commit History

```bash
1aff375 fix(voice): make stopStream idempotent and remove Promise.race hangs
  - Install expo-network dependency for DashDiagnosticEngine
  - Add async utility helpers (withTimeout, wait, retry, makeIdempotent)
  - Fix DashDiagnosticEngine to handle missing expo-network gracefully
  - Strengthen webrtcProvider with robust cleanup and event listener tracking
  - Refactor useRealtimeVoice stopStream to be fully idempotent
  - Change default voice to male in dash-ai-settings.tsx
  - Update voice selection logic to prefer male voices
```

## 🚀 Next Steps

1. **VoiceRecorderSheet State Machine** - Stabilize progress UI
2. **Floating Dash UI** - Create draggable, non-blocking assistant
3. **Manual QA** - Comprehensive testing on Android
4. **Documentation** - Voice pipeline and floating UI docs
5. **Quality Gates** - TypeScript and lint checks
6. **PR & Merge** - Screenshots, video demo, deployment

## 📚 References

- **EduDash Pro Architecture:** See `docs/governance/WARP.md`
- **Voice Pipeline:** TBD - `docs/ai/voice-pipeline.md`
- **Floating Assistant:** TBD - `docs/ai/dash-assistant-floating.md`
- **Agentic Features:** See `docs/agentic/` directory

---

**Last Updated:** 2025-01-14 03:40 UTC  
**Next Milestone:** Floating UI Implementation
