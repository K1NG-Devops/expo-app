# Dash AI Capability System - Quick Reference

## Overview
Tier-based feature gating system for Dash AI Assistant, integrated into EduDash Pro.

## Usage in Code

### Import
```typescript
import { hasCapability, assertCapability, FeatureGatedError, type Tier, type DashCapability } from '@/lib/ai/capabilities';
```

### Check Capability
```typescript
// Check if user has access
if (dash.hasCapability('multimodal.vision')) {
  // Process image
}

// Assert (throws error if unavailable)
try {
  assertCapability(tier, 'multimodal.documents');
  // Process document
} catch (error) {
  if (error instanceof FeatureGatedError) {
    // Show upgrade prompt
    showUpgradeModal(error.requiredTier);
  }
}
```

### DashAIAssistant Methods
```typescript
const dash = DashAIAssistant.getInstance();

// Get tier
const tier = dash.getUserTier(); // 'free' | 'starter' | 'basic' | 'premium' | 'pro' | 'enterprise'

// Check capability
const canAnalyzeImages = dash.hasCapability('multimodal.vision');

// Get all capabilities
const capabilities = dash.getAvailableCapabilities();

// Update tier (when subscription changes)
dash.updateTier('premium');
```

## Capability Domains

### Chat
- `chat.basic` - Basic text chat (all tiers)
- `chat.streaming` - Real-time streaming (basic+)
- `chat.thinking` - Show reasoning (premium+)
- `chat.priority` - Priority queue (pro+)

### Memory
- `memory.lite` - 7-day history (free)
- `memory.standard` - 30-day history (basic+)
- `memory.advanced` - Unlimited + learning (premium+)
- `memory.patterns` - Pattern detection (premium+)

### Multimodal
- `multimodal.vision` - Image analysis (premium+)
- `multimodal.ocr` - Text extraction (premium+)
- `multimodal.documents` - PDF/DOCX (premium+)
- `multimodal.handwriting` - Handwriting (premium+)

### Homework
- `homework.assign` - Create assignments (basic+)
- `homework.grade.basic` - Auto-grade objective (basic+)
- `homework.grade.advanced` - Grade essays (premium+)
- `homework.grade.bulk` - Batch grading (pro+)
- `homework.rubric` - Generate rubrics (premium+)
- `homework.feedback` - Personalized feedback (premium+)

### Lessons
- `lessons.basic` - Basic help (free)
- `lessons.curriculum` - Aligned plans (basic+)
- `lessons.adaptive` - Adaptive pacing (premium+)
- `lessons.trends` - Trend-based (pro+)
- `lessons.personalized` - Student-specific (premium+)

### Insights
- `insights.basic` - Basic stats (free)
- `insights.proactive` - Daily briefings (premium+)
- `insights.predictive` - Forecasts (pro+)
- `insights.custom` - Custom reports (enterprise)
- `insights.realtime` - Real-time monitoring (premium+)

## Error Handling

### FeatureGatedError
```typescript
try {
  dash.sendMessage(message, convId, attachments);
} catch (error) {
  if (error instanceof FeatureGatedError) {
    console.log(error.capability);      // 'multimodal.vision'
    console.log(error.requiredTier);    // 'premium'
    console.log(error.currentTier);     // 'basic'
    console.log(error.getUserMessage()); // "This feature requires Premium subscription. Upgrade to unlock!"
  }
}
```

## Tier Hierarchy
```
free (0) < starter (1) = basic (1) < premium (2) = pro (2) < enterprise (3)
```

Note: `starter` and `basic` are equivalent; `premium` and `pro` are equivalent.

## Integration Points

### DashAIAssistant
- `sendMessage()` - Checks multimodal capabilities for attachments
- `getAllConversations()` - Checks memory capabilities for history

### Future Integration
- UI components will use `hasCapability()` to show/hide features
- Upgrade prompts will display `error.getUserMessage()`
- SubscriptionContext will expose tier helpers

## Testing
```bash
# Run tests
npm test -- lib/ai/__tests__/capabilities.test.ts

# 38 passing tests covering all functions
```

---
**Last Updated**: Week 1 Implementation  
**Status**: Production-ready with DashAIAssistant integration
