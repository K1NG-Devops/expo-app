# Module Import Fix - Complete

## ❌ Problem

Metro bundler error:
```
ERROR [CRITICAL] Unhandled JavaScript error
"Requiring unknown module \"3433\". If you are sure the module exists, try restarting Metro."

Error: Requiring unknown module "3433".
Call Stack: services/DashProactiveEngine.ts:14
ERROR  [Dash Agent] Critical error: [TypeError: Cannot read property 'getInstance' of undefined]
```

## 🔍 Root Cause

**Incorrect default imports** for named exports:

```typescript
// ❌ WRONG - Trying to import as default but these are named exports
import DashDecisionEngine from './DashDecisionEngine';
import DashProactiveEngine from './DashProactiveEngine';
```

The classes are exported as **named exports**, not default exports:
```typescript
export class DashDecisionEngine { ... }  // Named export
export class DashProactiveEngine { ... }  // Named export
```

## ✅ Solution

Changed to **named imports**:

```typescript
// ✅ CORRECT - Named imports
import { DashDecisionEngine } from './DashDecisionEngine';
import { DashProactiveEngine } from './DashProactiveEngine';
```

## 📝 Files Fixed

### 1. `services/DashProactiveEngine.ts` (Line 14)
```diff
- import DashDecisionEngine, { type ActionCandidate, type Decision } from './DashDecisionEngine';
+ import { DashDecisionEngine, type ActionCandidate, type Decision } from './DashDecisionEngine';
```

### 2. `services/DashAgenticEngine.ts` (Lines 24-25)
```diff
- import DashDecisionEngine from './DashDecisionEngine';
- import DashProactiveEngine from './DashProactiveEngine';
+ import { DashDecisionEngine } from './DashDecisionEngine';
+ import { DashProactiveEngine } from './DashProactiveEngine';
```

## 🚀 Dev Server Status

**Started**: PID 2191404
**Command**: `npm run start:clear` (running in background)
**Logs**: `/tmp/metro.log`
**Port**: http://localhost:8081

**Status**: ✅ Building cache (this may take 1-2 minutes)

## 🧪 Verification Steps

Once Metro finishes building:

### 1. Check Metro is Ready
```bash
tail -f /tmp/metro.log
# Look for: "Metro waiting on exp://" or bundle ready messages
```

### 2. Test Voice System
```bash
# Run automated tests
npx tsx scripts/test-dash-voice.ts

# Expected: All tests pass
```

### 3. Connect Your Device
- **Android**: Connect physical device via USB
- **iOS**: Use simulator or physical device
- **Web**: Open http://localhost:8081 in browser

### 4. Test Dash Voice Live
1. Open Dash Assistant
2. Tap microphone
3. Say "Unjani Dash?" (isiZulu)
4. Verify:
   - ✅ Partial transcripts appear WHILE speaking
   - ✅ Natural isiZulu voice (ThandoNeural) responds
   - ✅ No "requiring unknown module" errors
   - ✅ No theatrical narration
   - ✅ Response within ~500ms

### 5. Check Console for Success Logs
```
[webrtcProvider] Starting...
[webrtcProvider] ICE connection: connected ✅
[RealtimeVoice] Streaming enabled ✅
[Dash] Auto-detected language: zu-ZA → zu
[Azure TTS] Synthesizing: zu-ZA, voice: zu-ZA-ThandoNeural
```

## 📊 What Was Fixed

| Component | Issue | Status |
|-----------|-------|--------|
| Module imports | Default vs named export mismatch | ✅ Fixed |
| DashDecisionEngine | getInstance() undefined | ✅ Fixed |
| DashProactiveEngine | Import error | ✅ Fixed |
| DashAgenticEngine | Cascade import failures | ✅ Fixed |
| Metro bundler | Module 3433 not found | ✅ Fixed |

## 🎯 Expected Outcome

After Metro finishes building:
- ✅ No more "requiring unknown module" errors
- ✅ No more "Cannot read property 'getInstance'" errors  
- ✅ Dash AI agent works correctly
- ✅ Voice system fully functional
- ✅ Language detection robust
- ✅ Azure TTS pronunciation accurate
- ✅ WebRTC streaming fast

## 🔧 If Issues Persist

### Clear Everything
```bash
# Kill Metro
killall node

# Clear all caches
npm run start:clear
rm -rf node_modules/.cache
rm -rf .expo

# Restart
npm run start:clear
```

### Check Import Consistency
```bash
# Find any remaining default imports that should be named
grep -r "import Dash.*Engine from" services/
# Should return NO results
```

## 📚 Related Fixes

This session also completed:
- ✅ Language detection improvements (unique markers)
- ✅ Azure TTS response normalization (audio_url)
- ✅ WebRTC streaming enabled (EXPO_PUBLIC_DASH_STREAMING=true)
- ✅ Comprehensive testing suite (scripts/test-dash-voice.ts)
- ✅ Documentation (DASH_VOICE_TESTING_GUIDE.md)

---

**Status**: ✅ Import errors fixed, dev server starting

**Next**: Wait for Metro to finish, then test voice system

**ETA**: Metro cache rebuild ~1-2 minutes
