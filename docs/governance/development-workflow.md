# EduDash Pro Development Workflow 🚀

## 📋 Current Status - Push Notifications & OTA Updates

### ✅ **COMPLETED (5/10 Tasks)**
1. **Push Registration Audit** - Single source of truth in AuthContext ✅  
2. **Enhanced lib/notifications.ts** - Device fingerprinting, error handling ✅
3. **AuthContext Integration** - Clean lifecycle management ✅  
4. **Settings OTA Updates** - Manual check with restart prompts ✅
5. **Push Testing UI** - Gated developer/superadmin interface ✅

### 🔧 **INFRASTRUCTURE STATUS**
- **EAS Project**: Linked to `@edudashpro/edudashpro` (ID: 253b1057-8489-44cf-b0e3-c3c10319a298) ✅
- **GitHub Remote**: `git@github.com:K1NG-Devops/expo-app.git` ✅
- **Android FCM**: FCM V1 credentials configured ✅
- **iOS APNs**: Not configured yet ⚠️
- **Database Schema**: Migration ready (`db/20250917_enhance_push_devices.sql`) ⚠️

---

## 🌳 **Branch Strategy**

### **Branch Structure**
```
main                    → Production releases (protected)
├── preview            → Staging/QA testing  
├── development        → Active development
└── feature/*          → Feature branches
```

### **EAS Channel Mapping**
```
Branch          EAS Channel    Build Profile    Purpose
────────────────────────────────────────────────────────────
main           production     production       App Store/Play Store
preview        preview        preview          Internal testing  
development    development    development      Dev client builds
feature/*      development    development      Feature dev/testing
```

### **Current Working Branch**
`feature/push-notifications-ota-updates` → Will merge to `development` → `preview` → `main`

---

## 🚀 **Next Steps (Priority Order)**

### **IMMEDIATE (Do Now)**

#### 1. Apply Database Migration
```bash
# Apply enhanced push_devices schema to your Supabase project
psql -h your-supabase-host -d postgres -U postgres < db/20250917_enhance_push_devices.sql

# Or via Supabase dashboard SQL editor:
# Copy contents of db/20250917_enhance_push_devices.sql and execute
```

#### 2. Test Current Implementation  
```bash
# Enable test tools
export EXPO_PUBLIC_ENABLE_TEST_TOOLS=1

# Start development server  
npm start

# Test push registration flow:
# - Sign in → Check push_devices table for new rows
# - Go to Settings → Use "Test Notification" (if superadmin/test tools enabled)
# - Try "Check for updates" button
```

### **SHORT TERM (This Week)**

#### 3. Build Preview APK for Testing
```bash
# Build preview APK with test tools enabled
eas build -p android --profile preview

# Install on physical Android device and test:
# - Push registration works
# - Test notifications arrive
# - OTA updates download and apply
```

#### 4. Set Up iOS Push Credentials (Optional)
```bash
# Configure iOS APNs if you have Apple Developer account
eas credentials -p ios --profile preview

# Follow prompts to:
# - Connect Apple Developer account
# - Generate/upload push certificates  
# - Set up provisioning profiles
```

#### 5. End-to-End Push Testing
```bash
# From your Supabase Edge Functions console or API client:
curl -X POST "https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/notifications-dispatcher" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "custom",
    "user_ids": ["YOUR_USER_ID"],
    "template_override": {
      "title": "Test from Server",  
      "body": "End-to-end push test successful!"
    }
  }'
```

### **MEDIUM TERM (Next Sprint)**

#### 6. Global Update Banner UI
Create `contexts/UpdatesProvider.tsx` that listens for update events and shows persistent banners.

#### 7. Production Channel Setup
```bash
# Merge feature → development → preview → main
# Set up production builds when ready:
eas build -p android --profile production
eas submit -p android --profile production
```

#### 8. Monitoring & Analytics Setup
- Configure Sentry error tracking for push registration failures
- Add PostHog events for update adoption rates
- Set up alerts for failed push deliveries

### **LONG TERM (Future Sprints)**

#### 9. Advanced Push Features
- Rich notifications with images/actions
- Push notification scheduling
- User preference management
- A/B testing for notification content

#### 10. Advanced OTA Features
- Staged rollouts (10% → 50% → 100%)  
- Rollback capabilities
- Feature flags integration
- Update success rate monitoring

---

## 🔧 **Development Commands**

### **Git Workflow**
```bash
# Start new feature
git checkout development
git pull origin development  
git checkout -b feature/your-feature-name

# Work on feature...
git add -A
git commit -m "feat: your changes"
git push -u origin feature/your-feature-name

# Merge via GitHub PR: feature → development → preview → main
```

### **EAS Operations** 
```bash
# Development build (dev client)
eas build -p android --profile development

# Preview build (standalone APK)  
eas build -p android --profile preview

# Publish OTA update
eas update --branch preview --message "Test update message"

# Check channels
eas channel:list
```

### **Testing Push Notifications**

#### Via App (Settings)
1. Build with `EXPO_PUBLIC_ENABLE_TEST_TOOLS=1`
2. Sign in as superadmin OR set test tools flag
3. Go to Settings → Push Testing section
4. Fill in title/message → Send test notification

#### Via Edge Function
```bash
# Direct API call to notifications-dispatcher
curl -X POST "https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/notifications-dispatcher" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "custom",  
    "user_ids": ["target-user-id"],
    "template_override": {
      "title": "Test Push",
      "body": "Testing from command line"
    }
  }'
```

---

## 📊 **WARP.md Compliance Checklist**

### ✅ **Golden Rule Compliance**
- [x] Students, Teachers, Parents first - all features enhance education
- [x] Mobile-first design with proper touch targets (44x44px minimum)
- [x] Accessibility compliance maintained

### ✅ **Non-Negotiables Compliance**  
- [x] No mock data - all real user data, proper empty states
- [x] Authentication sanctity - no auth flow changes
- [x] Security controls - RLS maintained, no client AI keys
- [x] AI integration security - server-side notifications-dispatcher only

### ✅ **Architecture Principles**
- [x] Multi-tenant security with proper RLS
- [x] Offline-first with TanStack Query patterns
- [x] Child safety - gated testing tools
- [x] Performance budgets maintained

---

## 🛡️ **Security Notes**

### **Secrets Management**
- EAS credentials stored securely in Expo servers
- No push tokens logged in application code
- Test tools only enabled in development/preview environments
- Service role keys never exposed to client

### **Privacy Compliance**
- Device metadata collected is minimal and functional
- User consent implied through notification permissions
- PII never sent to third-party services
- Audit trails maintained in database

---

## 📈 **Success Metrics**

### **Technical KPIs**
- Push registration success rate: >95%
- Update adoption rate: >80% within 24h
- Notification delivery rate: >90%
- App crash rate: <0.1%

### **User Experience KPIs**  
- Time to receive push: <30 seconds
- Update download size: <10MB
- Settings interaction success: 100%
- Support tickets for notifications: <5/month

---

## 🔍 **Troubleshooting**

### **Push Notifications Not Working**
1. Check `push_devices` table has recent entries
2. Verify FCM credentials in EAS dashboard
3. Confirm app has notification permissions
4. Test with direct API call to notifications-dispatcher

### **OTA Updates Not Downloading**  
1. Verify `updates.url` in app.config.js
2. Check EAS channel configuration
3. Confirm network connectivity
4. Review expo-updates logs in device console

### **Build Failures**
1. Clear Metro cache: `npx expo start --clear`
2. Update EAS CLI: `npm install -g eas-cli`
3. Check for TypeScript errors: `npm run typecheck`
4. Verify all dependencies are up to date

---

**Last Updated**: 2025-09-17  
**Status**: ACTIVE DEVELOPMENT  
**Next Review**: After completing todos 6-10