# Dash Full Agentic Activation - Quick Start

**For:** Developers implementing the agentic upgrade  
**Estimated Time:** 7-10 days  
**Last Updated:** October 13, 2025

---

## 🎯 What We're Building

Transform Dash from an assistant into a **true AI agent** that:
- ✅ **Knows** all EduDash Pro features, screens, and database structure
- ✅ **Suggests** relevant actions proactively (>70% of interactions)
- ✅ **Executes** low-risk tasks automatically (navigation, previews)
- ✅ **Learns** from interactions via telemetry
- ✅ **Respects** user autonomy preferences (observer → autonomous)

---

## 📋 Prerequisites Checklist

Before starting:
- [ ] Read `DASH_FULL_AGENTIC_ACTIVATION_PLAN.md`
- [ ] Review `docs/governance/WARP.md` for project rules
- [ ] Ensure TypeScript strict mode is working
- [ ] Run `npm run typecheck` successfully
- [ ] Database migrations are up-to-date

---

## 🚀 Implementation Order

### Phase 1: Knowledge Foundation (Days 1-2)

**Step 1:** Create feature constants
```bash
# Create the file
touch lib/constants/edudash-features.ts

# Copy the full implementation from DASH_FULL_AGENTIC_ACTIVATION_PLAN.md
# Lines 71-567 contain the complete constants module
```

**Step 2:** Build DashEduDashKnowledge service
```bash
# Create the file
touch services/DashEduDashKnowledge.ts

# Copy implementation from plan (lines 574-920)
```

**Step 3:** Test knowledge base
```bash
# Create test file
mkdir -p tests/agentic
touch tests/agentic/knowledge.spec.ts

# Test queries
# - getFeature('attendance')
# - getRoleCapabilities('teacher', 'starter')
# - search('lesson')
# - buildPromptContext(profile, awareness, 'premium')
```

**Acceptance Criteria:**
- [ ] Constants module exports 10+ features
- [ ] Knowledge service returns correct data
- [ ] Search returns relevant results
- [ ] buildPromptContext generates valid prompt text

---

### Phase 2: Autonomy System (Days 3-4)

**Step 1:** Create DashAutonomyManager
```bash
touch services/DashAutonomyManager.ts
```

Key implementation:
```typescript
export class DashAutonomyManager {
  private static instance: DashAutonomyManager;
  private level: AutonomyLevel = 'assistant';
  
  static getInstance() { /* singleton */ }
  
  getLevel(): AutonomyLevel { return this.level; }
  
  setLevel(level: AutonomyLevel) {
    this.level = level;
    // Persist to AsyncStorage: dash_autonomy_level
    // Emit change event
  }
  
  canAutoExecute(
    type: string,
    risk: 'low' | 'medium' | 'high',
    context: any
  ): boolean {
    // Policy matrix:
    // observer: false for all
    // assistant: false for all (current behavior)
    // partner: true for low risk only
    // autonomous: true for low+medium
    
    if (this.level === 'observer') return false;
    if (this.level === 'assistant') return false;
    if (this.level === 'partner') return risk === 'low';
    if (this.level === 'autonomous') return risk !== 'high';
    return false;
  }
  
  requiresApproval(action: DashAction): boolean {
    const risk = DashEduDashKnowledge.getRiskForAction(action);
    return !this.canAutoExecute(action.type, risk, {});
  }
}
```

**Step 2:** Create DashCapabilityDiscovery
```bash
touch services/DashCapabilityDiscovery.ts
```

**Step 3:** Integrate into DashAIAssistant
```typescript
// In DashAIAssistant.ts
import { DashAutonomyManager } from './DashAutonomyManager';

private autonomyManager: DashAutonomyManager;

constructor() {
  this.autonomyManager = DashAutonomyManager.getInstance();
}

// Use in generateResponse
if (this.autonomyManager.canAutoExecute('navigate', 'low', {})) {
  // Auto-execute screen opening
  await DashRealTimeAwareness.openScreen(route, params);
}
```

**Acceptance Criteria:**
- [ ] Autonomy levels persisted per user
- [ ] canAutoExecute policy works correctly
- [ ] Partner mode auto-opens low-risk screens
- [ ] Settings UI allows level selection

---

### Phase 3: Integration & Telemetry (Days 5-7)

**Step 1:** Wire CapabilityDiscovery into generateResponse
```typescript
// In generateResponse after context analysis
const discovery = DashCapabilityDiscovery.discoverFromMessage({
  userInput,
  analysis,
  awareness,
  role: profile?.role,
  tier: this.getUserTier()
});

// Auto-execute eligible actions
for (const suggestion of discovery.filter(s => s.canAutoExecute)) {
  await this.executeAction(suggestion.action);
}

// Add others to suggested_actions
response.metadata.suggested_actions = discovery
  .filter(s => !s.canAutoExecute)
  .map(s => s.title);
```

**Step 2:** Create telemetry tables
```bash
# Create migration
supabase migration new agentic_telemetry

# Add tables from plan (lines in migration task)
# - agentic_events
# - agentic_suggestions  
# - agentic_decisions

# Lint SQL
npm run lint:sql

# Push to remote
supabase db push
```

**Step 3:** Implement telemetry logging
```typescript
// Add to DashAgenticEngine
private async logEvent(type: string, payload: any) {
  try {
    const profile = await getCurrentProfile();
    await assertSupabase()
      .from('agentic_events')
      .insert({
        user_id: profile?.auth_user_id,
        preschool_id: profile?.preschool_id,
        type,
        autonomy_level: this.autonomyManager.getLevel(),
        payload
      });
  } catch (error) {
    console.error('[Telemetry] Failed to log event:', error);
  }
}
```

**Acceptance Criteria:**
- [ ] Discovery integrated into message flow
- [ ] Proactive suggestions appear >70% of time
- [ ] Telemetry tables created with RLS
- [ ] Events logged on suggestion/execution

---

### Phase 4: Cleanup & Documentation (Days 8-10)

**Step 1:** Archive legacy code
```bash
# Run archive script
./scripts/archive-legacy.sh

# Review archived files
ls -la docs/archive/

# Update LEGACY_DASH_IMPLEMENTATION.md
```

**Step 2:** Update prompts with knowledge
```typescript
// In DashAIAssistant.generateEnhancedResponse
const tier = this.getUserTier();
const knowledgeContext = DashEduDashKnowledge.buildPromptContext(
  profile,
  awareness,
  tier
);

// Append to system prompt
systemPrompt += knowledgeContext;
```

**Step 3:** Create test suite
```bash
mkdir -p tests/agentic
touch tests/agentic/knowledge.spec.ts
touch tests/agentic/autonomy.spec.ts
touch tests/agentic/proactive.spec.ts
touch tests/agentic/safety.spec.ts

# Run tests
npm run test:agentic
```

**Step 4:** Documentation
- [ ] Complete AUTONOMY_LEVELS.md
- [ ] Complete KNOWLEDGE_BASE.md
- [ ] Complete TELEMETRY_PRIVACY.md
- [ ] Update governance/WARP.md

**Acceptance Criteria:**
- [ ] Legacy code archived
- [ ] Prompts include EduDash knowledge
- [ ] Test suite passes
- [ ] Documentation complete

---

## 🧪 Testing Scenarios

### Scenario 1: Feature Discovery
**User:** "What features do you have?"  
**Expected:** Dash lists 8-10 features with descriptions  
**Verify:** Response includes attendance, lesson planning, grading, etc.

### Scenario 2: Auto-Navigation (Partner Mode)
**User:** "Open the financial dashboard"  
**Expected:** Screen opens immediately + confirmation message  
**Verify:** router.push called, no extra confirmation needed

### Scenario 3: High-Risk Approval
**User:** "Delete all student records"  
**Expected:** Refusal + explanation of high-risk  
**Verify:** No action executed, requiresApproval = true

### Scenario 4: Proactive Suggestion
**User:** "Good morning" (Monday 8:00 AM, teacher)  
**Expected:** Greeting + suggestion to mark attendance  
**Verify:** metadata.suggested_actions includes attendance

### Scenario 5: Tier Gating
**User:** "Show financial dashboard" (Free tier)  
**Expected:** Upgrade nudge  
**Verify:** isFeatureAvailable returns false

---

## 🚨 Common Pitfalls

### Token Bloat
**Problem:** buildPromptContext generates huge prompts  
**Solution:** Limit to 8 features, use bulleted format  
**Check:** Prompt < 2000 tokens

### Race Conditions
**Problem:** Multiple auto-exec actions fire simultaneously  
**Solution:** Use aiRequestQueue, add cooldowns  
**Check:** No parallel router.push calls

### PII Leakage
**Problem:** Telemetry logs student names  
**Solution:** Only log IDs, anonymized flags  
**Check:** No PII in agentic_events.payload

### Multi-Tenant Breach
**Problem:** Suggestions include other schools' data  
**Solution:** Emphasize RLS in prompts, test filters  
**Check:** All queries include preschool_id

---

## 📊 Success Metrics Dashboard

Track these after deployment:

```sql
-- Proactive suggestion rate
SELECT 
  COUNT(*) FILTER (WHERE payload->>'has_suggestions' = 'true') * 100.0 / COUNT(*) as suggestion_rate
FROM agentic_events
WHERE type = 'message_processed'
  AND created_at > NOW() - INTERVAL '7 days';

-- Auto-exec success rate  
SELECT
  COUNT(*) FILTER (WHERE outcome = 'success') * 100.0 / COUNT(*) as success_rate
FROM agentic_decisions
WHERE auto_executed = true
  AND created_at > NOW() - INTERVAL '7 days';

-- Feature discovery
SELECT
  feature_id,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_impressions,
  COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) as accepted
FROM agentic_suggestions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY feature_id
ORDER BY total_impressions DESC;
```

Target KPIs:
- ✅ Suggestion rate: >70%
- ✅ Auto-exec success: >95%
- ✅ Response time: <3s simple, <8s complex
- ✅ User satisfaction: >4.5/5

---

## 🆘 Troubleshooting

### Dash doesn't suggest anything
**Check:**
- [ ] DashCapabilityDiscovery imported correctly
- [ ] Discovery called in generateResponse
- [ ] Feature catalog has relevant triggers
- [ ] User tier allows features

**Fix:**
```typescript
// Add debug logging
console.log('[Discovery]', {
  userInput,
  roleCapabilities: capabilities.length,
  suggestions: suggestions.length
});
```

### Auto-exec not working
**Check:**
- [ ] Autonomy level is 'partner' or 'autonomous'
- [ ] Action risk is 'low'
- [ ] canAutoExecute returns true

**Fix:**
```typescript
const canExec = this.autonomyManager.canAutoExecute(type, risk, {});
console.log('[AutoExec]', { type, risk, level: this.autonomyManager.getLevel(), canExec });
```

### Telemetry not logging
**Check:**
- [ ] Tables created with RLS
- [ ] User has insert permission
- [ ] preschool_id is set

**Fix:**
```bash
# Verify RLS policies
supabase db diff
```

---

## 🎓 Resources

- **Full Plan:** `docs/agentic/DASH_FULL_AGENTIC_ACTIVATION_PLAN.md`
- **Todo List:** Check `read_todos` for current progress
- **WARP Rules:** `docs/governance/WARP.md`
- **Testing Guide:** `tests/agentic/README.md`

---

## 🚦 Rollout Plan

### Phase 1: Internal (Week 1)
- Default: assistant level
- Feature flag: `EXPO_PUBLIC_AGENTIC_ENABLE=false`
- Only devs can toggle partner mode

### Phase 2: Teacher Beta (Week 2-3)
- Default: partner level for teachers
- Feature flag: `EXPO_PUBLIC_AGENTIC_DEFAULT_LEVEL=partner`
- Monitor telemetry closely

### Phase 3: All Roles (Week 4+)
- Partner default for principal/teacher
- Assistant default for parent
- Autonomous behind opt-in flag

### Phase 4: GA (Week 6+)
- Stable telemetry metrics
- User feedback positive
- No critical issues

---

**Questions?** Ask Warp AI Agent or check the full activation plan!
