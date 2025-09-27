# Ad Placement Strategy for EduDash Pro

## Overview

This document outlines the ad placement implementation for monetizing free tier users in EduDash Pro's principal and teacher dashboards while maintaining excellent UX and encouraging upgrades.

## Core Principles

### Subscription-Based Gating
- **Free tier only**: Ads display exclusively for `tier === 'free'` users
- **Paid tiers ad-free**: Starter, Premium, Enterprise users never see ads
- **Platform restrictions**: Respects existing Android-only development mode
- **Environment controls**: Honors `EXPO_PUBLIC_ENABLE_ADS` flag

### Frequency Controls & Rate Limiting
- **Interstitial ads**: Max 1 per 2 minutes, max 3 per day
- **Rewarded ads**: Max 2 offers per day (user-initiated)
- **Grace period**: No interstitials within 60 seconds of app start
- **Persistence**: Uses AsyncStorage for cross-session rate limiting

## Implementation Architecture

### Core Components

#### 1. AdsContext (`contexts/AdsContext.tsx`)
- Centralized ad logic and frequency controls
- Subscription-aware initialization
- Analytics tracking for all ad events
- Methods:
  - `maybeShowInterstitial(tag: string): Promise<boolean>`
  - `offerRewarded(tag: string): Promise<{shown, rewarded}>`
  - `canShowBanner: boolean`

#### 2. SubscriptionAdGate (`components/ui/SubscriptionAdGate.tsx`)
- Wrapper component for subscription-based ad display
- Guards against showing ads to paid users
- Platform and environment validation

#### 3. AdBannerWithUpgrade (`components/ui/AdBannerWithUpgrade.tsx`)
- Combines banner ad with upgrade CTA
- Consistent styling and analytics
- Optional "Remove ads — Upgrade" link

### Integration Points

#### Teacher Dashboard
**Banner Placements:**
- Below Quick Actions (primary, with upgrade CTA)
- Mid-feed after 2+ class cards (scroll monetization)
- Bottom section (session monetization)

**Interactive Ads:**
- Interstitials on "Message Parents" and "View Reports"
- Rewarded ads for AI tool previews (lesson generator, homework grader)

#### Principal Dashboard  
**Banner Placements:**
- After welcome section (high visibility)
- After metrics grid (natural break)

**Interactive Ads:**
- Interstitials before management screen navigation
- Optional rewarded unlocks for premium analytics

## User Experience Guidelines

### Non-Intrusive Design
- Ads appear at natural content breaks
- Never block critical functionality
- Maintain 44x44 minimum touch targets
- No overlap with important messaging (seat pending banners)

### Upgrade Motivation
- Subtle "Remove ads — Upgrade" CTAs
- Value demonstration via rewarded ad previews
- No aggressive blocking of core workflows

### Accessibility
- Screen reader compatible
- High contrast maintained
- Performance optimized (no scroll lag)

## Analytics & Tracking

### Event Types
```typescript
// Banner ads
track('ads.banner_shown', { screen, platform, tier });

// Interstitial ads
track('ads.interstitial_attempt', { screen, allowed, reason_blocked });
track('ads.interstitial_shown', { screen });

// Rewarded ads
track('ads.rewarded_offer_shown', { screen, tag });
track('ads.rewarded_completed', { screen, tag, reward });

// Upgrade funnel
track('ads.upgrade_cta_clicked', { screen, tier });
```

### Performance Metrics
- Ad impression rates by placement
- Upgrade conversion from ad CTAs
- User engagement post-ad-view
- Frequency cap effectiveness

## Testing & QA

### Environment Setup
```bash
EXPO_PUBLIC_ENABLE_ADS=1
EXPO_PUBLIC_ADMOB_TEST_IDS_ONLY=true
```

### Test Scenarios
1. **Free tier**: Verify ads appear at correct positions
2. **Paid tiers**: Confirm complete ad absence
3. **Rate limiting**: Test interstitial frequency caps
4. **Platform restrictions**: Android-only during development
5. **Graceful degradation**: Ads fail without breaking UX

## Rollout Strategy

### Phase 1: Banner Ads Only
- Deploy banner placements
- Monitor impression rates and user feedback
- Verify subscription gating works correctly

### Phase 2: Interstitial Ads
- Add navigation interstitials with conservative limits
- Track completion rates and abandonment
- Fine-tune frequency caps based on data

### Phase 3: Rewarded Features
- Implement AI tool previews
- Optional premium unlocks for principals
- Measure conversion to paid subscriptions

## Kill Switch & Controls

### Emergency Disabling
Set `EXPO_PUBLIC_ENABLE_ADS=0` to instantly disable all ad functionality.

### Progressive Rollback
- Disable specific ad types via feature flags
- Adjust frequency caps via AsyncStorage keys
- Remote configuration for A/B testing

## Revenue Projections

### Conservative Estimates (Monthly)
- **Banner RPM**: R2-5 per 1000 impressions
- **Interstitial RPM**: R8-15 per 1000 impressions
- **Rewarded CPM**: R12-25 per 1000 completions

### Conversion Goals
- **Primary**: 5-10% of free users upgrade within 90 days
- **Secondary**: Increased engagement via rewarded previews
- **Tertiary**: Brand awareness through non-intrusive placements

## Maintenance & Optimization

### Monthly Reviews
- Analyze placement performance data
- Adjust frequency caps based on user feedback
- Test new ad positions and formats

### Quarterly Updates
- Review subscription tier migration patterns
- Optimize upgrade funnel from ad interactions
- Evaluate new monetization opportunities

---

**Implementation Status**: ✅ Complete - Ready for testing and gradual rollout
**Last Updated**: 2025-01-20
**Next Review**: 2025-02-20