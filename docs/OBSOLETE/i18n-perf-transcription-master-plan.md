# EduDash Pro: Comprehensive i18n, Performance & Streaming Transcription Master Plan

**Status**: In Progress  
**Created**: 2025-10-14  
**Branch**: `feat/i18n-perf-transcription`  
**Scope**: Entire application (344+ files)

---

## 🎯 Mission & Objectives

Transform EduDash Pro to be fully internationalized, highly performant, and feature real-time streaming transcription:

### Primary Goals

1. **Complete i18n Coverage**: Eliminate all 9,420 hardcoded strings across 344 files
2. **Fix Dashboard Double-Loading**: Reduce initial load from 2x to 1x with optimized data fetching
3. **Implement Streaming Transcription**: Replace batch processing with real-time streaming (<500ms first chunk)
4. **Performance Optimization**: Achieve 60 FPS scrolling, <2s dashboard load, <3s TTI

### Success Metrics

- ✅ i18n audit returns 0 hardcoded strings
- ✅ All 8 languages (en, es, fr, pt, de, af, zu, st) fully translated
- ✅ Dashboard loads exactly once (confirmed via logs)
- ✅ Live transcription shows chunks within 500ms
- ✅ 60 FPS scrolling on lists >20 items
- ✅ Dashboard load <2s, TTI <3s
- ✅ Memory usage <150MB typical
- ✅ Zero TypeScript/ESLint errors

---

## 📋 High-Level Phase Overview

| Phase | Title | Files Affected | Est. Time |
|-------|-------|----------------|-----------|
| **0** | Preflight & Setup | 3 | 1 hour |
| **1** | Analysis & Documentation | 10+ | 3 hours |
| **2** | Translation Infrastructure | 8 | 2 hours |
| **3** | Core Fixes (Dashboard & Transcription) | 15 | 8 hours |
| **4** | Systematic i18n Conversion | 344+ | 40 hours |
| **5** | Translation Completion | 8 | 4 hours |
| **6** | Performance Optimization | 200+ | 12 hours |
| **7** | Verification & Validation | All | 6 hours |
| **8** | Documentation & Cleanup | 10 | 3 hours |
| **9** | Final Validation & Deployment | All | 4 hours |

**Total Estimated Time**: 83 hours (~2 weeks full-time)

---

## 🚀 Detailed Phase Breakdown

### Phase 0: Preflight, Branching, and Guardrails (1 hour)

**Purpose**: Set up isolated work environment with proper safeguards

**Tasks**:
1. Create feature branch: `git checkout -b feat/i18n-perf-transcription`
2. Install dependencies: `npm ci`
3. Verify dev environment:
   ```bash
   npm run start
   npm run typecheck
   npm run lint
   ```
4. Add ESLint i18n enforcement:
   ```bash
   npm install --save-dev eslint-plugin-i18next
   ```
5. Configure ESLint rule in config:
   ```json
   "i18next/no-literal-string": ["warn", { 
     "markupOnly": true, 
     "ignoreAttribute": ["testID", "name", "type"] 
   }]
   ```

**Deliverables**:
- ✅ Clean feature branch
- ✅ Dev environment validated
- ✅ ESLint protection enabled

---

### Phase 1: Analysis & Documentation (3 hours)

#### Phase 1.1: i18n Audit Baseline

**Command**:
```bash
cd /home/king/Desktop/edudashpro
node scripts/i18n-audit.js > i18n-audit-report.txt 2>&1
```

**Expected Output**: Report showing 9,420 hardcoded strings across 344 files

**Deliverable**: `i18n-audit-report.txt`

#### Phase 1.2: Dashboard Double-Loading Analysis

**Files to Review**:
- `app/screens/principal-dashboard.tsx`
- `app/screens/parent-dashboard.tsx`
- `components/dashboard/PrincipalDashboardWrapper.tsx`
- `components/dashboard/ParentDashboardWrapper.tsx`

**Analysis Points**:
1. Count `useEffect([])` hooks per file
2. Identify duplicate data fetches
3. Document auth/navigation decision logic
4. Note StrictMode double-invoke patterns

**Root Causes to Document**:
- Multiple `useEffect([])` hooks causing duplicate renders
- Auth context checks in both screen and wrapper
- Navigation redirects triggering remounts
- Duplicate TanStack Query calls

**Deliverable**: `debug/dashboard-loading-analysis.md`

**Example Finding**:
```markdown
## principal-dashboard.tsx

**Issue**: Two useEffect hooks with navigation logic
- Lines 22-28: Auth guard (redirects to sign-in)
- Lines 30-47: Org check guard (redirects to onboarding)

**Problem**: Both effects run on every mount, causing double navigation evaluation

**Solution**: Consolidate into single effect with early returns
```

#### Phase 1.3: Transcription Pipeline Analysis

**Files to Review**:
- `components/ai/UltraVoiceRecorder.tsx`
- `lib/voice-pipeline.ts`
- `lib/voice/realtimeToken.ts`
- `lib/voice/webrtcProvider.ts`

**Key Findings to Document**:
1. Current flow: Recording → Stop → Batch transcription (lines 182-186 in UltraVoiceRecorder)
2. Missing: Real-time streaming transport
3. Wiring exists: `TranscriptionChunk` type and `handleTranscription` callback
4. Gap: VoicePipeline doesn't call transcription callback

**Proposed Architecture**:
```
VoicePipeline
  ↓
TranscriptionTransport (interface)
  ↓
├─ WebSocketProvider (web + fallback)
└─ WebRTCProvider (native, low-latency)
  ↓
Edge Function (ai-proxy-realtime)
  ↓
Streaming Transcription Service
```

**Deliverable**: `debug/transcription-analysis.md`

---

### Phase 2: Translation Infrastructure (2 hours)

#### Phase 2.1: Expand Translation Structure

**File**: `locales/en/common.json`

**Add Missing Namespaces**:
```json
{
  "screens": {},
  "components": {},
  "modals": {},
  "forms": {},
  "validation": {},
  "errors": {},
  "success": {},
  "loading": {},
  "empty_states": {},
  "ai": {
    "voice": {},
    "transcription": {},
    "streaming": {}
  }
}
```

#### Phase 2.2: Translation Key Guidelines

**Create**: `docs/translation-key-template.md`

**Content**:
```markdown
# Translation Key Guidelines

## Naming Convention

- Use dot notation: `namespace.category.key`
- Lowercase with underscores: `auth.sign_in.failed`
- Descriptive and semantic: `dashboard.student_count` not `dashboard.label1`

## Variable Substitution

Use double curly braces: {{variable}}

Example:
```json
"welcome_message": "Welcome back, {{name}}!"
```

Usage:
```typescript
t('welcome_message', { name: userName })
```

## Common Patterns

| Pattern | Example Key | Usage |
|---------|-------------|-------|
| Button | `common.save` | Primary actions |
| Title | `screen.title` | Screen headers |
| Error | `errors.network` | Error messages |
| Placeholder | `forms.email_placeholder` | Input hints |
| Empty State | `empty.no_data_title` | Empty views |
```

#### Phase 2.3: Translation Tooling Scripts

**Script 1**: `scripts/export-for-translation.js`

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'af', 'zu', 'st'];
const enFile = './locales/en/common.json';

function flattenKeys(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...flattenKeys(value, fullKey));
    } else {
      result.push({ key: fullKey, en: value });
    }
  }
  return result;
}

const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const keys = flattenKeys(enData);

// Generate CSV
const header = ['Key', ...LANGUAGES].join(',');
const rows = keys.map(({ key, en }) => {
  const cells = [key, en, ...Array(LANGUAGES.length - 1).fill('')];
  return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
});

fs.writeFileSync('translations-template.csv', [header, ...rows].join('\n'));
console.log(`✅ Exported ${keys.length} keys to translations-template.csv`);
```

**Script 2**: `scripts/verify-translations.js`

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'af', 'zu', 'st'];

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

const results = {};
for (const lang of LANGUAGES) {
  const file = `./locales/${lang}/common.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    results[lang] = flattenKeys(data);
  } else {
    results[lang] = new Set();
  }
}

const enKeys = results.en;
let hasErrors = false;

for (const lang of LANGUAGES.filter(l => l !== 'en')) {
  const missing = [...enKeys].filter(k => !results[lang].has(k));
  const extra = [...results[lang]].filter(k => !enKeys.has(k));
  
  if (missing.length > 0) {
    console.error(`❌ ${lang}: Missing ${missing.length} keys`);
    console.error(`   First 5: ${missing.slice(0, 5).join(', ')}`);
    hasErrors = true;
  }
  if (extra.length > 0) {
    console.warn(`⚠️  ${lang}: ${extra.length} extra keys not in English`);
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${lang}: All keys match (${results[lang].size} keys)`);
  }
}

process.exit(hasErrors ? 1 : 0);
```

**Add to package.json**:
```json
{
  "scripts": {
    "i18n:export": "node scripts/export-for-translation.js",
    "i18n:verify": "node scripts/verify-translations.js"
  }
}
```

---

### Phase 3: Core Fixes (8 hours)

#### Phase 3.1: Fix Dashboard Double-Loading

**Strategy**: Consolidate effects, single data ownership

**File**: `app/screens/principal-dashboard.tsx`

**Before** (Lines 22-47):
```typescript
useEffect(() => {
  if (!isStillLoading && !user) {
    router.replace('/(auth)/sign-in');
  }
}, [isStillLoading, user]);

useEffect(() => {
  if (!isStillLoading && !orgId) {
    if (!user) return;
    router.replace('/screens/principal-onboarding');
  }
}, [user, orgId, isStillLoading, profile, profileLoading, loading]);
```

**After** (Consolidated):
```typescript
useEffect(() => {
  // Guard: wait for loading to complete
  if (isStillLoading) return;
  
  // Auth check
  if (!user) {
    router.replace('/(auth)/sign-in');
    return;
  }
  
  // Org check
  if (!orgId) {
    router.replace('/screens/principal-onboarding');
    return;
  }
}, [isStillLoading, user, orgId]);
```

**Optimization**: Add StrictMode guard

```typescript
const didNavigateRef = useRef(false);

useEffect(() => {
  if (didNavigateRef.current) return; // StrictMode guard
  
  if (isStillLoading) return;
  
  if (!user) {
    didNavigateRef.current = true;
    router.replace('/(auth)/sign-in');
    return;
  }
  
  if (!orgId) {
    didNavigateRef.current = true;
    router.replace('/screens/principal-onboarding');
    return;
  }
}, [isStillLoading, user, orgId]);
```

**Data Fetching**: Move to wrapper

**File**: `components/dashboard/PrincipalDashboardWrapper.tsx`

```typescript
const PrincipalDashboardWrapper = React.memo(() => {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  
  // Single source of truth for data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['principal-dashboard', orgId],
    queryFn: () => fetchDashboardData(orgId),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
  
  // Pass data down to children
  return <EnhancedPrincipalDashboard data={dashboardData} />;
});
```

**Repeat for**:
- `app/screens/parent-dashboard.tsx`
- `components/dashboard/ParentDashboardWrapper.tsx`
- `components/dashboard/TeacherDashboardWrapper.tsx`

#### Phase 3.2: Implement Streaming Transcription

**Step 1**: Define Transport Interface

**File**: `lib/voice/transports/types.ts`

```typescript
export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TranscriptionChunk {
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}

export interface TranscriptionTransport {
  start(onChunk: (chunk: TranscriptionChunk) => void): Promise<boolean>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  getStatus(): TransportStatus;
}
```

**Step 2**: WebSocket Transport

**File**: `lib/voice/transports/websocketProvider.ts`

```typescript
import { TranscriptionTransport, TranscriptionChunk, TransportStatus } from './types';
import { getRealtimeToken } from '../realtimeToken';

export class WebSocketTransport implements TranscriptionTransport {
  private ws: WebSocket | null = null;
  private status: TransportStatus = 'disconnected';
  private mediaRecorder: MediaRecorder | null = null;
  private onChunkCallback: ((chunk: TranscriptionChunk) => void) | null = null;

  async start(onChunk: (chunk: TranscriptionChunk) => void): Promise<boolean> {
    this.onChunkCallback = onChunk;
    this.status = 'connecting';

    try {
      // Get token from Edge Function
      const token = await getRealtimeToken();
      
      // Connect WebSocket
      const wsUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('https://', 'wss://')}/functions/v1/ai-proxy-realtime`;
      this.ws = new WebSocket(`${wsUrl}?token=${token}`);
      
      this.ws.onopen = () => {
        this.status = 'connected';
        this.startAudioCapture();
      };
      
      this.ws.onmessage = (event) => {
        const chunk: TranscriptionChunk = JSON.parse(event.data);
        this.onChunkCallback?.(chunk);
      };
      
      this.ws.onerror = () => {
        this.status = 'error';
      };
      
      return true;
    } catch (error) {
      this.status = 'error';
      return false;
    }
  }

  private async startAudioCapture() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 64000,
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        // Send audio chunk
        this.ws.send(event.data);
      }
    };
    
    // Send chunks every 250ms
    this.mediaRecorder.start(250);
  }

  async stop(): Promise<void> {
    this.mediaRecorder?.stop();
    this.mediaRecorder = null;
    this.ws?.close();
    this.ws = null;
    this.status = 'disconnected';
  }

  async dispose(): Promise<void> {
    await this.stop();
  }

  getStatus(): TransportStatus {
    return this.status;
  }
}
```

**Step 3**: Update VoicePipeline

**File**: `lib/voice-pipeline.ts`

```typescript
import { WebSocketTransport } from './voice/transports/websocketProvider';
// ... existing imports

export class VoicePipeline {
  private transport: TranscriptionTransport | null = null;
  // ... existing fields

  async startRecording(
    onTranscription: (chunk: TranscriptionChunk) => void,
    onStateChange: (state: RecordingState) => void
  ): Promise<boolean> {
    onStateChange('initializing');
    
    // Initialize transport
    this.transport = new WebSocketTransport();
    const started = await this.transport.start(onTranscription);
    
    if (!started) {
      onStateChange('error');
      return false;
    }
    
    // Start audio recording
    await this.startAudioRecording();
    onStateChange('recording');
    return true;
  }

  async stopRecording(): Promise<VoiceRecordingResult | null> {
    await this.transport?.stop();
    this.transport = null;
    // ... existing stop logic
  }
}
```

**Step 4**: Update UltraVoiceRecorder

**File**: `components/ai/UltraVoiceRecorder.tsx`

```typescript
// Remove lines 193-200 (processTranscription fallback)

const stopRecording = useSmartCallback(async () => {
  if (!state.isRecording) return;

  setState(prev => ({ ...prev, isProcessing: true }));
  stopWaveformAnimation();
  stopPulseAnimation();
  stopAudioLevelMonitoring();

  const result = await pipelineRef.current.stopRecording();

  if (result) {
    setState(prev => ({
      ...prev,
      isRecording: false,
      recordingUri: result.uri,
      duration: result.duration,
      isProcessing: false,
    }));

    onRecordingStop?.();
    
    // Streaming complete - use accumulated transcription
    onTranscriptionComplete?.(state.liveTranscription, result.uri);
  } else {
    setState(prev => ({ ...prev, isProcessing: false }));
    onError?.(new Error('Failed to stop recording'));
  }
}, [state.isRecording, state.liveTranscription, onRecordingStop, onError, onTranscriptionComplete], 'stop_recording');
```

#### Phase 3.3: UltraVoiceRecorder i18n

**Add to** `locales/en/common.json`:
```json
{
  "ai": {
    "voice": {
      "processing": "Processing...",
      "transcription_label": "Transcription",
      "analyzing": "Analyzing...",
      "clear": "Clear",
      "send": "Send",
      "connecting": "Connecting...",
      "streaming": "Streaming",
      "reconnecting": "Reconnecting...",
      "offline": "Offline"
    }
  }
}
```

**Update component**:
```typescript
const { t } = useTranslation();

// Memoize labels
const labels = useMemo(() => ({
  processing: t('ai.voice.processing'),
  transcription: t('ai.voice.transcription_label'),
  analyzing: t('ai.voice.analyzing'),
  clear: t('ai.voice.clear'),
  send: t('ai.voice.send'),
}), [t]);

// Use in JSX
<Text>{labels.processing}</Text>
```

---

### Phase 4: Systematic i18n Conversion (40 hours)

**Process Template** (apply to each file):

1. **Audit file**: Identify all hardcoded strings
2. **Create keys**: Add to appropriate namespace in `locales/en/common.json`
3. **Import hook**: `import { useTranslation } from 'react-i18next';`
4. **Initialize**: `const { t } = useTranslation();`
5. **Replace strings**: Use `t('namespace.key')` or `t('key', { variable })`
6. **Memoize if needed**: `useMemo(() => t('key'), [t])`
7. **Test**: Verify no missing key warnings
8. **Document**: Update `docs/i18n-progress.md`

**Priority Order**:

#### Phase 4.1: Auth (31 files, ~8 hours)

Files:
- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/auth-callback.tsx`
- `app/biometric-test.tsx`
- `components/auth/*` (all auth components)

**Example Conversion**:

**Before**:
```typescript
<Text>Please enter your email and password</Text>
<Button title="Sign In" onPress={handleSignIn} />
Alert.alert("Sign In Failed", "Invalid credentials");
```

**After**:
```typescript
<Text>{t('auth.enter_email_password')}</Text>
<Button title={t('auth.sign_in')} onPress={handleSignIn} />
Alert.alert(t('auth.sign_in.failed'), t('auth.invalid_credentials'));
```

**Keys to add**:
```json
{
  "auth": {
    "enter_email_password": "Please enter your email and password",
    "sign_in": "Sign In",
    "sign_in": {
      "failed": "Sign In Failed"
    },
    "invalid_credentials": "Invalid credentials"
  }
}
```

#### Phase 4.2: Dashboards (48 files, ~10 hours)

Files:
- `app/screens/*-dashboard.tsx`
- `components/dashboard/*`

**Optimization Focus**:
- React.memo for dashboard cards
- useMemo for metrics calculations
- FlashList for activity feeds

#### Phase 4.3: Financial (15 files, ~4 hours)

Files:
- `app/screens/financial-*.tsx`
- `app/screens/petty-cash*.tsx`

**Special handling**: Currency and date formatting

```typescript
const { t, i18n } = useTranslation();

// Currency formatting
const formatCurrency = useCallback((amount: number) => {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}, [i18n.language]);

// Date formatting
const formatDate = useCallback((date: Date) => {
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}, [i18n.language]);
```

#### Phase 4.4: AI Screens (12 files, ~4 hours)

Files:
- `app/screens/ai-*.tsx`
- `app/screens/dash-*.tsx`

**Focus**: Streaming status messages

#### Phase 4.5-4.12: Remaining Screens (~14 hours)

Systematic conversion of:
- Parent screens
- Teacher screens
- Student screens
- Principal screens
- Super Admin screens
- Settings
- Lessons
- Miscellaneous

#### Phase 4.13-4.21: Components Layer (~20 hours)

Files: All components in `components/*`

**Special focus**:
- Shared UI components
- Modals
- Forms
- Empty states

---

### Phase 5: Translation Completion (4 hours)

#### Phase 5.1: Generate Translation Template

```bash
npm run i18n:export
```

**Output**: `translations-template.csv` with ~2,000+ keys

#### Phase 5.2: Add Translations

For each language (es, fr, pt, de, af, zu, st):

1. Copy `locales/en/common.json` structure
2. Translate all values
3. Maintain {{variables}} exactly
4. Keep brand terms: EduDash, WhatsApp, AI

**Verify**:
```bash
npm run i18n:verify
```

---

### Phase 6: Performance Optimization (12 hours)

#### Phase 6.1: React.memo & Hooks (4 hours)

**Pattern**:
```typescript
const MyComponent = React.memo<Props>(({ data, onAction }) => {
  const memoizedValue = useMemo(() => expensiveCalculation(data), [data]);
  const handleAction = useCallback(() => onAction(data), [onAction, data]);
  
  return <View>...</View>;
}, (prevProps, nextProps) => {
  // Custom comparator
  return prevProps.data.id === nextProps.data.id;
});
```

**Apply to**: All dashboard cards, list items, repeated components

#### Phase 6.2: Lists & Images (4 hours)

**FlatList → FlashList**:
```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={100} // Set to actual item height
  keyExtractor={(item) => item.id}
/>
```

**Image → expo-image**:
```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri }}
  style={styles.image}
  cachePolicy="memory-disk"
  contentFit="cover"
  placeholder={blurhash}
  transition={200}
/>
```

#### Phase 6.3: TanStack Query (2 hours)

**Optimize all queries**:
```typescript
const { data } = useQuery({
  queryKey: ['dashboard', preschoolId, role],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 15 * 60 * 1000, // 15 minutes
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  select: (data) => transformData(data), // Shape data
});
```

#### Phase 6.4: Instrumentation (2 hours)

**Add performance tracking**:
```typescript
import { mark, measure } from '@/lib/perf';

mark('dashboard-start');
// ... load dashboard
mark('dashboard-end');
const duration = measure('dashboard-load', 'dashboard-start', 'dashboard-end');

if (__DEV__ && duration > 2000) {
  console.warn(`⚠️ Dashboard load took ${duration}ms (target: <2000ms)`);
}
```

---

### Phase 7: Verification (6 hours)

#### Phase 7.1: Manual Testing (4 hours)

**Test Matrix**:

| Screen | Test | Languages | Result |
|--------|------|-----------|--------|
| Sign In | All text translated | en, af, zu | ✅ |
| Dashboard | Metrics, labels | all 8 | ✅ |
| Financial | Currency, dates | all 8 | ✅ |
| AI Features | Streaming status | all 8 | ✅ |
| Settings | All options | all 8 | ✅ |

#### Phase 7.2: Automated Checks (1 hour)

```bash
npm run typecheck
npm run lint
node scripts/i18n-audit.js
npm run i18n:verify
```

**Expected**:
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors (or <200 warnings)
- ✅ 0 hardcoded strings
- ✅ All languages have full key parity

#### Phase 7.3: Streaming Validation (1 hour)

**Test scenarios**:
1. Normal recording: First chunk <500ms
2. Network interruption: Reconnects automatically
3. Long recording: Chunks continue streaming
4. Multiple sessions: No state leak between recordings

---

### Phase 8: Documentation (3 hours)

#### Phase 8.1: Update Docs (2 hours)

Files to update:
- `README.md`: Add i18n section
- `docs/governance/WARP.md`: Mark tasks complete
- `docs/i18n-implementation-guide.md`: New file
- `docs/performance-optimizations.md`: New file
- `docs/dashboard-fix-summary.md`: New file

#### Phase 8.2: Cleanup (1 hour)

1. Remove debug logs
2. Remove commented code
3. Archive analysis files
4. Add pre-commit hooks

---

### Phase 9: Final Validation & Deployment (4 hours)

#### Phase 9.1: Device Testing (2 hours)

**Test on**:
- Low-end Android (API 28+)
- High-end Android (API 33+)
- Web browser

**Validate**:
- Dashboard loads once
- Smooth 60 FPS scrolling
- Streaming transcription works
- All languages render correctly

#### Phase 9.2: Deployment Checklist (2 hours)

Create: `docs/deployment/i18n-deployment-checklist.md`

**Checklist**:
- [ ] All translation keys present in 8 languages
- [ ] Dashboard loads exactly once
- [ ] Streaming transcription functional
- [ ] React.memo/FlashList migrations complete
- [ ] TypeScript errors: 0
- [ ] ESLint errors: 0
- [ ] Hardcoded strings: 0
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] CI/CD passes

---

## 📊 Progress Tracking

**Status File**: `docs/i18n-progress.md`

**Format**:
```markdown
# i18n Conversion Progress

## Summary
- Files converted: 0/344
- Keys added: 0/2000
- Languages complete: 0/8

## By Phase

### Phase 4.1: Auth (0/31)
- [ ] app/(auth)/sign-in.tsx
- [ ] app/(auth)/sign-up.tsx
...

### Phase 4.2: Dashboards (0/48)
- [ ] app/screens/principal-dashboard.tsx
...
```

---

## 🎯 Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Dashboard Load | ~4s | <2s | 🟡 |
| TTI | ~6s | <3s | 🟡 |
| First Transcription Chunk | N/A (batch) | <500ms | 🔴 |
| Scrolling FPS | ~45 FPS | 60 FPS | 🟡 |
| Memory Usage | ~180MB | <150MB | 🟡 |
| Hardcoded Strings | 9,420 | 0 | 🔴 |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## 🚨 Risk Management

### Known Risks

1. **Streaming Transport Compatibility**
   - **Risk**: WebRTC may not work on all devices
   - **Mitigation**: Auto-detect and fallback to WebSocket
   - **Fallback**: Disable recording with localized message

2. **Translation Gaps**
   - **Risk**: Missing translations for some languages
   - **Mitigation**: Keep English as fallbackLng
   - **CI**: verify-translations.js fails on missing keys

3. **StrictMode Double-Invoke**
   - **Risk**: Dev-mode shows double renders
   - **Mitigation**: Use refs to guard idempotent effects
   - **Validation**: Production logs confirm single load

4. **Performance Regression**
   - **Risk**: Changes slow down app
   - **Mitigation**: Track metrics at each phase
   - **Rollback**: Revert commits if targets not met

---

## 🛠️ Developer Tools & Commands

### Daily Workflow

```bash
# Start dev server
npm run start

# Type check
npm run typecheck

# Lint
npm run lint
npm run lint:fix

# i18n audit
node scripts/i18n-audit.js

# Translation checks
npm run i18n:export
npm run i18n:verify
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feat/i18n-perf-transcription

# Commit frequently with descriptive messages
git commit -m "feat(i18n): convert auth screens to use translation keys"

# Push to remote
git push origin feat/i18n-perf-transcription

# Create PR when phase complete
gh pr create --title "Phase X: ..." --body "..."
```

---

## 📚 References

- [i18next Documentation](https://www.i18next.com/)
- [React i18next](https://react.i18next.com/)
- [FlashList Docs](https://shopify.github.io/flash-list/)
- [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/)
- [TanStack Query](https://tanstack.com/query/latest)
- [WebRTC Documentation](https://webrtc.org/getting-started/overview)

---

## ✅ Acceptance Criteria

**Definition of Done**:

1. ✅ i18n audit returns 0 hardcoded strings
2. ✅ All 8 languages fully translated with verified parity
3. ✅ Dashboard loads exactly once (confirmed via logs)
4. ✅ Live transcription shows chunks within 500ms
5. ✅ 60 FPS scrolling on lists with >20 items
6. ✅ Dashboard load <2s, TTI <3s
7. ✅ Memory usage <150MB typical
8. ✅ Zero TypeScript errors
9. ✅ Zero ESLint errors (or <200 warnings with justification)
10. ✅ All documentation updated
11. ✅ CI/CD pipeline passes
12. ✅ Physical device testing complete

---

**Last Updated**: 2025-10-14  
**Next Review**: After Phase 3 completion  
**Maintainer**: Development Team
