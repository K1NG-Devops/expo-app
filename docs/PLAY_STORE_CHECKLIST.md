# PLAY_STORE_CHECKLIST.md

A single source of truth for Google Play Console readiness for internal testing, closed testing, and production.

---

## App Info
- App Name: EduDash Pro
- Package: com.k1ngdevops.edudashpro
- Versioning: app.json version + runtimeVersion policy (Android)
- Keystore: Managed via Play App Signing (recommended)

## Required Store Listing Assets
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (min 2)
- [ ] 7-inch and 10-inch tablet screenshots (if applicable)
- [ ] Short description (80 chars)
- [ ] Full description

## Policy & Compliance
- [ ] Privacy Policy URL (hosted, publicly accessible)
- [ ] Data Safety Form (declare analytics, crash data, account data)
- [ ] Content Rating Questionnaire
- [ ] Target API Level compliance (target latest API per Play requirements)
- [ ] Permissions Justification: CAMERA, RECORD_AUDIO, READ_MEDIA_IMAGES/VIDEO (Android 13+), with in-app rationale dialogs
- [ ] Ads Policy (if ads enabled): Test IDs in dev; production IDs only with consent and age-appropriate placement

## App Content
- [ ] In-app Privacy Policy link (Settings → Privacy Policy)
- [ ] In-app rationale prompts for camera/microphone usage, localized (en, af, zu)
- [ ] Terms of Service link (optional but recommended)

## Testing Tracks
- [ ] Internal Testing track created
- [ ] Tester emails added
- [ ] Release notes written for testers
- [ ] Test user accounts provisioned with sample data (parent, teacher, principal)
- [ ] Login instructions included

## Technical
- [ ] EAS build configuration mapped to Play Console app
- [ ] app.json includes runtimeVersion and package
- [ ] Sentry/PostHog gated by env vars, not hardcoded
- [ ] API keys secured (no client-secret exposure)
- [ ] Release variant uses production endpoints

## Review Aids
- [ ] Demo video (optional) showing key flows
- [ ] Documentation links (help center, FAQs)
- [ ] Support contact email in listing

---

Append build IDs and release notes here per submission:
- 2025-09-__: EAS build ID: <id> – Internal testing v1.0.0-alpha.1 – Notes: ...
