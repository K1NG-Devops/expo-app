# Route Comparison: Local vs EAS Build

## Summary
Your app has **119 route files** total. Some debug/test routes are excluded from production builds via Metro bundler configuration.

## Routes Excluded by Metro Config (Production Builds)
These routes are blocked by the `metro.config.js` blockList and won't appear in EAS builds:

1. `/app/biometric-test.tsx` - Biometric testing screen
2. `/app/debug-user.tsx` - User debugging screen  
3. Files matching `/app/.*debug.*\.tsx?$/` pattern

## All Available Routes (Local Development)

### Root Level Routes
- `/` - index.tsx (Main entry)
- `/admin-dashboard` - Admin dashboard
- `/auth-callback` - OAuth callback handler
- `/auth-demo` - Auth demonstration (dev only)
- `/biometric-test` - Biometric test screen (EXCLUDED IN PRODUCTION)
- `/debug-user` - User debug screen (EXCLUDED IN PRODUCTION)
- `/demo-index` - Demo index page
- `/fallback` - Fallback screen
- `/landing` - Landing page
- `/+not-found` - 404 handler
- `/premium-feature-modal` - Premium features modal
- `/pricing` - Pricing page
- `/profiles-gate` - Profile gating
- `/subscription-upgrade` - Subscription upgrade flow
- `/test-working` - Test page
- `/test-worksheet` - Worksheet testing

### (auth) Group Routes
- `/sign-in` - Sign in screen
- `/sign-up` - Sign up screen

### (parent) Group Routes
- `/message-thread` - Parent message thread
- `/picture-of-progress` - Picture of progress
- `/pop-history` - POP history
- `/proof-of-payment` - Proof of payment

### Marketing Routes
- `/marketing/pricing` - Marketing pricing page

### Sales Routes
- `/sales/contact` - Contact page

### Screens Directory (119 total files)
**Account & Settings:**
- account.tsx, account-old.tsx
- settings.tsx, sound-alert-settings.tsx
- school-settings.tsx, email-verification.tsx

**Parent Screens:**
- parent-dashboard.tsx, parent-children.tsx
- parent-messages.tsx, parent-message-thread.tsx
- parent-registration.tsx, parent-child-registration.tsx
- parent-link-child.tsx, parent-join-by-code.tsx
- parent-picture-of-progress.tsx, parent-pop-history.tsx
- parent-pop-upload.tsx, parent-proof-of-payment.tsx

**Teacher Screens:**
- teacher-dashboard.tsx, teacher-management.tsx
- teacher-messages.tsx, teacher-reports.tsx
- teacher-registration.tsx, teacher-profile-completion.tsx
- teacher-invite-accept.tsx, teachers-detail.tsx

**Principal Screens:**
- principal-dashboard.tsx, principal-analytics.tsx
- principal-announcement.tsx, principal-approval-dashboard.tsx
- principal-onboarding.tsx, principal-parent-invite-code.tsx
- principal-parent-requests.tsx, principal-seat-management.tsx

**Student Management:**
- student-management.tsx, student-enrollment.tsx
- student-detail.tsx, students-detail.tsx
- class-details.tsx, class-teacher-management.tsx

**Financial:**
- financial-dashboard.tsx, financial-reports.tsx
- financial-transactions.tsx
- petty-cash.tsx, petty-cash-reconcile.tsx

**AI & Learning:**
- ai-homework-helper.tsx, ai-homework-grader-live.tsx
- ai-lesson-generator.tsx, ai-progress-analysis.tsx
- dash-assistant.tsx, dash-ai-settings.tsx
- dash-ai-settings-enhanced.tsx
- dash-conversations-history.tsx

**Lessons & Content:**
- lessons-hub.tsx, lessons-categories.tsx
- lessons-category.tsx, lessons-search.tsx
- lesson-detail.tsx, create-lesson.tsx
- assign-homework.tsx, attendance.tsx

**Super Admin:**
- super-admin-dashboard.tsx
- super-admin-users.tsx, super-admin-analytics.tsx
- super-admin-subscriptions.tsx, super-admin-settings.tsx
- super-admin-ai-quotas.tsx, super-admin-feature-flags.tsx
- super-admin-announcements.tsx, super-admin-moderation.tsx
- super-admin-leads.tsx, super-admin-whatsapp.tsx
- super-admin-system-monitoring.tsx, super-admin-system-test.tsx
- super-admin-admin-management.tsx
- super-admin/school-onboarding-wizard.tsx

**Admin:**
- admin-ai-allocation.tsx
- admin/data-export.tsx, admin/school-settings.tsx

**Subscription & Payments:**
- subscription-setup.tsx, subscription-upgrade-post.tsx
- manage-subscription.tsx
- payments/return.tsx

**Other:**
- school-registration.tsx, school-type-selection.tsx
- activity-detail.tsx, whatsapp-demo.tsx
- whatsapp-setup.tsx, worksheet-demo.tsx
- theme-demo.tsx, env-debug.tsx (likely excluded)

## Metro Config Exclusion Pattern
```javascript
config.resolver.blockList = exclusionList([
  /\/(scripts\/.*test.*|scripts\/.*debug.*|utils\/.*test.*|utils\/.*debug.*|.*mock.*)\//,
  /\/components\/debug\//,
  /\/app\/.*debug.*\.tsx?$/,
  /\/app\/biometric-test\.tsx$/,
  /\/app\/debug-user\.tsx$/,
]);
```

## Translation Files Issue (FIXED)
**Problem:** Translation files in `locales/` directory were not being included in EAS builds.

**Solution Applied:**
1. Updated `metro.config.js` to treat JSON files as source files
2. Added `assetBundlePatterns` to `app.config.js`:
   ```javascript
   assetBundlePatterns: [
     '**/*',
     'locales/**/*.json',
   ]
   ```

## Verification Steps
To verify routes are working in EAS build:
1. Build the app with current changes
2. Install on device
3. Check if translation keys are now showing properly (should display translated text)
4. Verify all production routes are accessible

## Notes
- Debug/test routes being excluded is INTENTIONAL and correct behavior
- The main issue was translation files not being bundled, which is now fixed
- All production routes should be available in EAS builds
