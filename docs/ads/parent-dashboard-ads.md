# Enhanced Ad System - Parent Dashboard Integration

## Overview

The EduDash Pro parent dashboard now includes a comprehensive ad system designed specifically for free-tier users on Android devices. The system is built with user experience, privacy, and AdMob compliance in mind.

## Ad Placements

### 1. Banner Ads
- **Main Dashboard Banner**: Bottom of parent dashboard, above footer navigation
  - Placement: `PLACEMENT_KEYS.BANNER_PARENT_DASHBOARD`
  - Position: Fixed bottom placement with safe area padding
  - Fallback: Premium upgrade CTA with gradient design

- **Messages Context Banner**: In communication hub section  
  - Placement: `PLACEMENT_KEYS.BANNER_PARENT_MESSAGES`
  - Position: After communication tools, before recent activity
  - Context: Communication and messaging-related ads

### 2. Native Ads
- **Feed Inline Native**: After POP upload actions
  - Placement: `PLACEMENT_KEYS.NATIVE_PARENT_FEED`
  - Position: Inline within content stream (item index 1)
  - Fallback: Educational tips carousel

- **List Context Native**: Within communication hub tools
  - Placement: `PLACEMENT_KEYS.NATIVE_PARENT_LIST`
  - Position: Between communication tool cards (item index 3)
  - Fallback: Feature highlight cards

## Gating Logic

### Eligibility Requirements (ALL must be true):
- ✅ Platform is Android (`Platform.OS === 'android'`)
- ✅ User has parent role (`profile.role === 'parent'`)  
- ✅ User is on free tier (`subscriptionTier === 'free'`)
- ✅ Ads are enabled (`EXPO_PUBLIC_ENABLE_FREE_TIER_ADS === 'true'`)
- ✅ Device is online (network connectivity check)

### Exclusions:
- ❌ Web platform (no web ads)
- ❌ iOS platform (Android-first strategy)
- ❌ Paid tier users (pro/enterprise)
- ❌ Non-parent roles (teacher, principal, superadmin)
- ❌ Payment/checkout flows
- ❌ Authentication screens
- ❌ Error/critical alert screens

## Ad Types & Features

### Banner Ads
- **Format**: Anchored adaptive banner (320x50 to 320x100)
- **Loading**: Shimmer/skeleton while loading
- **Fallbacks**: Premium upgrade CTA with EduDash Pro branding
- **Analytics**: Load, impression, click, failure tracking
- **Spacing**: Minimum 16px from interactive elements

### Native Ads  
- **Format**: Custom card with image, headline, description, CTA
- **Labels**: Clear "Sponsored" or "Ad" labeling
- **Fallbacks**: Educational content carousel
- **Accessibility**: Screen reader support with appropriate labels
- **Styling**: Matches EduDash Pro design system

## User Experience

### Loading States
- Shimmer animations for banner ads
- Skeleton placeholders for native ads  
- No layout shift during ad loading
- Graceful degradation on failures

### Fallback Content
- **Banner Fallback**: Premium upgrade gradient CTA
- **Native Fallback**: Educational tips with navigation
- **Empty State**: Clean removal when no ads/fallbacks
- **Offline**: Instant fallback rendering when offline

### Accessibility
- Screen reader labels: "Sponsored content" 
- Focus order: Ads don't interrupt main navigation flow
- High contrast support via theme system
- Touch targets: Minimum 44x44 pixels

## Analytics & Tracking

### Events Tracked
- `edudash.ad.banner_eligible` - User qualifies for banner ads
- `edudash.ad.banner_loaded` - Banner ad successfully loaded
- `edudash.ad.banner_clicked` - User clicked banner ad
- `edudash.ad.banner_failed` - Banner ad failed to load
- `edudash.ad.native_eligible` - User qualifies for native ads
- `edudash.ad.native_loaded` - Native ad successfully loaded
- `edudash.ad.native_clicked` - User clicked native ad
- `edudash.ad.fallback_clicked` - User clicked fallback content

### Properties Tracked
- `placement` - Ad placement identifier
- `user_id` - Hashed user identifier
- `platform` - Device platform (android)
- `ad_unit_id` - Last 8 chars of ad unit ID
- `item_index` - Position in feed/list
- `error` - Error message for failed loads

## AdMob Compliance

### Policy Adherence
- ✅ Clear ad labeling ("Sponsored", "Ad")
- ✅ No ads near critical actions (payments, errors)
- ✅ Minimum spacing from interactive elements
- ✅ Family-friendly content targeting
- ✅ Non-personalized ads by default
- ✅ User consent handling for personalization

### Test IDs in Development
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Native: `ca-app-pub-3940256099942544/2247696110`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

## Configuration

### Environment Variables
```bash
# Development (enforced test IDs)
EXPO_PUBLIC_ADMOB_TEST_IDS_ONLY=true
EXPO_PUBLIC_ENABLE_FREE_TIER_ADS=true

# Production (requires EAS secrets)
EXPO_PUBLIC_ADMOB_ADUNIT_BANNER_PARENT_DASHBOARD=ca-app-pub-XXXX/YYYYYYY
EXPO_PUBLIC_ADMOB_ADUNIT_NATIVE_PARENT_FEED=ca-app-pub-XXXX/YYYYYYY
EXPO_PUBLIC_ADMOB_ADUNIT_NATIVE_PARENT_LIST=ca-app-pub-XXXX/YYYYYYY
EXPO_PUBLIC_ADMOB_ADUNIT_BANNER_PARENT_MESSAGES=ca-app-pub-XXXX/YYYYYYY
```

### Remote Config (Future)
- Kill switch for instant ad disabling
- Frequency adjustment without app updates
- A/B testing for placement optimization
- Revenue optimization settings

## Development Testing

### Test Scenarios
1. **Free Tier Parent on Android**: Should see all ads with test IDs
2. **Paid Tier Parent on Android**: Should see no ads
3. **Parent on iOS**: Should see no ads  
4. **Teacher/Principal on Android**: Should see no ads
5. **Offline State**: Should see fallback content immediately
6. **Ad Load Failure**: Should show fallback content
7. **Web Platform**: Should see no ads

### QA Checklist
- [ ] Ads only appear for Android free-tier parents
- [ ] Banner ads load with proper spacing and fallbacks
- [ ] Native ads integrate seamlessly with content
- [ ] Fallback content is useful and actionable
- [ ] No ads in payment or critical flows
- [ ] Analytics events fire correctly
- [ ] Accessibility labels are present
- [ ] Loading states prevent layout shift

## Performance Considerations

### Bundle Size
- Lazy loading of ad modules
- Platform-specific imports to avoid web bloat
- Fallback-first approach reduces dependencies

### Network Usage
- Cached ad content where possible
- Offline detection prevents unnecessary requests
- Preloading only for high-probability placements

### Battery & Performance
- No background ad loading
- Efficient event tracking with batching
- Memory-conscious ad caching

## Future Enhancements

### Interstitial Ads
- Natural navigation breaks
- Frequency capping (max 3/day, 180s intervals)
- Never on first session or critical flows

### Rewarded Video Ads
- Optional premium feature unlocks
- AI tips bundle (24h access)
- PDF export credits
- Theme customization unlocks

### Advanced Features
- Contextual keyword targeting
- Location-based relevance (privacy-compliant)
- Time-based optimization
- Seasonal content alignment

## Success Metrics

### User Experience
- No increase in bounce rate on ad-enabled screens
- Maintained engagement with core features
- Positive or neutral app store ratings
- No increase in support tickets

### Revenue
- CPM targets: $2-5 for banner, $5-10 for native
- Click-through rates: 1-3% baseline
- Fill rates: >90% for test/production ads
- Revenue per user: Target $0.50-2.00/month

### Technical
- Ad load success rate: >95%
- Fallback engagement: >10% click rate
- Analytics tracking: 100% event capture
- Zero crashes related to ad loading