# Dash Voice System - Comprehensive Fix Plan

## Issues Identified

### 1. Batch Transcription Used Despite Streaming Flag
**Symptom**: Logs show `[VoiceController] Transcription transcribing: 76%` (batch) instead of WebRTC streaming
**Root Cause**: Voice controller not checking `EXPO_PUBLIC_DASH_STREAMING` environment variable
**Impact**: Slow transcription, no real-time feedback

### 2. Language Detection Not Reaching AI Prompt
**Symptom**: 
- Logs show `[Dash] Building AI prompt with language: en` 
- But voice was in isiZulu/Afrikaans
**Root Cause**: 
- Async race condition between saving preferences and building prompt
- Language parameter gets lost in the call chain
**Impact**: AI responds in wrong language

### 3. AI Giving Educational Explanations Instead of Conversational Responses
**Symptom**: User says "Unjani?" → AI explains shapes and addition
**Root Cause**: 
- Multiple system prompts being concatenated
- Client-side prompt conflicts with server-side prompt
**Impact**: Unnatural, overly-explanatory responses

## The Fix Strategy

### Fix 1: Force Streaming Path
**File**: `lib/voice/controller.ts` or wherever voice controller checks streaming
**Action**: Explicitly check and log the streaming flag early

### Fix 2: Synchronous Language Flow
**Files**: `services/DashAIAssistant.ts`
**Action**: 
1. Pass detected language IMMEDIATELY to AI (don't rely on async preferences)
2. Add explicit logging at each step
3. Ensure language reaches DashAgenticIntegration.buildEnhancedSystemPrompt

### Fix 3: Simplify System Prompt
**File**: `services/DashAgenticIntegration.ts`
**Action**: 
1. Let ai-proxy's multilingual prompt be the primary instruction
2. Client-side prompt should only add context, NOT override behavior
3. Remove duplicate/conflicting instructions

## Implementation Order
1. Fix language flow first (most critical for user experience)
2. Simplify AI prompt (prevents educational responses)
3. Enable streaming (performance improvement)
