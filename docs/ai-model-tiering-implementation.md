# AI Model Tiering Implementation Summary

## Overview

I've implemented a comprehensive, business-logical AI model tiering system for EduDash Pro based on industry standards and best practices. This system enforces subscription-based access to AI models while maintaining proper quotas and rate limits.

## Business Logic & Tier Structure

### Subscription Tiers & Model Access

| Tier | Monthly Quota | RPM Limit | Available Models | Business Logic |
|------|---------------|-----------|------------------|----------------|
| **Free** | 150 requests | 5/min | Dash Fast (Haiku only) | Basic AI to encourage upgrades |
| **Starter** | 1500 requests | 15/min | Dash Fast + Dash Smart (1000:Haiku + 500:Sonnet) | Balanced for small schools (5 seats) |
| **Premium** | 2,500 requests | 30/min | All models (Haiku + Sonnet + Opus) | Comprehensive solution (15 seats) |
| **Enterprise** | Unlimited | 60/min | All models + priority support | Complete solution with SLA |

### Model Branding ("Dash" Assistant)
- **Dash Fast** (Claude 3 Haiku) - Lightning-fast responses for quick questions
- **Dash Smart** (Claude 3 Sonnet) - Balanced intelligence for comprehensive work  
- **Dash Expert** (Claude 3 Opus) - Maximum intelligence for complex content

## Implementation Details

### 1. Core Model Definitions (`lib/ai/models.ts`)
- Defined `SubscriptionTier` type system aligned with new subscription schema
- Added `minTier` requirements for each model
- Implemented tier hierarchy and quota limits
- Created utility functions for model access checking

### 2. Subscription Gating Service (`lib/ai/subscription-gating.ts`)
- Centralized subscription context resolution
- Model access enforcement with fallback to tier-appropriate models
- Quota tracking and rate limit enforcement
- Principal override logic (principals can allocate regardless of tier)

### 3. AI Gateway Enhancement (`supabase/functions/ai-gateway/index.ts`)
- Server-side tier-based model enforcement
- Automatic model downgrade if user requests unavailable model
- Comprehensive error messages for upgrade prompts
- Grade-level context added to homework help prompts

### 4. Updated Subscription Rules (`lib/subscriptionRules.ts`)
- Aligned with new tier system (free, starter, premium, enterprise)
- Legacy tier normalization for backward compatibility
- Business rules for AI quota allocation

### 5. React Hooks (`hooks/useAIModelSelection.ts`)
- `useAIModelSelection` - Core hook for model selection with tier enforcement
- Specialized hooks: `useLessonGeneratorModels`, `useHomeworkHelperModels`, `useGradingModels`
- `useTierInfo` - UI tier display information with colors and descriptions

### 6. UI Component Updates (`app/screens/ai-lesson-generator.tsx`)
- Replaced legacy model selection with tier-based system
- Visual tier indicators with plan badges
- Clear quota display and upgrade prompts
- Improved UX with "Dash" branding

## Key Features Implemented

### ✅ Tier-Based Model Access
- Free tier: Haiku only
- Starter tier: Haiku + Sonnet  
- Premium+: All models including Opus
- Enterprise: Unlimited access

### ✅ Quota Enforcement
- Monthly request limits per tier
- Rate limiting (RPM) per tier
- Server-side enforcement in AI gateway
- Graceful degradation when limits reached

### ✅ Grade-Level Targeting
- Added grade/age context to homework help prompts
- Age-appropriate language and examples
- Better educational relevance

### ✅ Principal Override
- Principals can allocate AI quotas regardless of their school's tier
- Supports business rule: "The principal should be able to allocate seats from the Starter Plan"

### ✅ "Dash" Assistant Branding
- Renamed models to "Dash Fast", "Dash Smart", "Dash Expert"
- Consistent branding across UI
- Maintains technical Claude model mapping

### ✅ Backward Compatibility
- Legacy tier normalization (parent_starter → starter, etc.)
- Graceful fallbacks for missing data
- Support for existing subscription schema

## Business Benefits

1. **Revenue Optimization**: Clear upgrade path with meaningful model restrictions
2. **User Experience**: Intuitive "Dash" branding with transparent capabilities
3. **Cost Management**: Proper quota enforcement prevents overuse
4. **Educational Focus**: Grade-level targeting improves content relevance
5. **Scalability**: Enterprise tier supports unlimited growth

## Technical Architecture

### Server-Side Enforcement
- All quota and model access checks happen in the AI gateway
- No client-side bypass possible
- Proper error handling with upgrade prompts

### Database Integration
- Works with new subscription system migration
- Supports both organizations and preschools tables
- Row-level security maintained

### React Integration  
- Custom hooks provide clean component integration
- Automatic tier detection and model filtering
- Persistent user preferences

## Next Steps (Recommendations)

1. **Rate Limiting**: Implement Redis-based sliding window for RPM limits
2. **Agent System**: Build MVP agent system with tier-based memory limits
3. **Analytics**: Track model usage patterns and upgrade conversion
4. **A/B Testing**: Test different quota limits for optimal conversion
5. **API Integration**: Extend tiering to external API access

## Migration Path

The implementation is designed for gradual rollout:

1. **Phase 1** (Complete): Core tiering with existing users grandfathered
2. **Phase 2**: Gradual enforcement as subscriptions renew  
3. **Phase 3**: Full enforcement with upgrade campaigns
4. **Phase 4**: Advanced features (agents, custom models)

## Testing Recommendations

- Verify tier-based model filtering in UI
- Test quota enforcement at boundaries
- Validate principal override functionality  
- Check legacy tier normalization
- Confirm grade-level context in prompts

---

This implementation provides a solid foundation for monetizing AI features while maintaining excellent user experience and educational value.

<citations>
  <document>
      <document_type>RULE</document_type>
      <document_id>kfNDtIXWx2ZKOuBjiAPM18</document_id>
  </document>
</citations>
