# 📱 MOBILE BRANCH ROADMAP

## Current Branch: `mobile`
Focus: Android/iOS native features and mobile-optimized experiences

---

## 🎯 Phase 1: Wake Word & Native Features (NOW)

### 1.1 Build Preview APK with Porcupine (30 min)
```bash
eas build --platform android --profile preview
```

**Why**: Compiles native Porcupine module for "Hello Dash" wake word

**Expected**: After installing APK, saying "Hello Dash" will trigger Dash AI

### 1.2 Test Native Features
- Wake word detection
- Voice recording
- Microphone permissions
- Background audio handling

---

## 🎯 Phase 2: DashNavigationHandler (1-2 hours)

### 2.1 Create Service (`services/DashNavigationHandler.ts`)

**Features**:
- Voice navigation ("Show me students", "Open lessons")
- Screen registry with mobile-optimized routes
- Navigation history tracking
- Deep linking support
- Back button handling

**Implementation**:
```typescript
export class DashNavigationHandler {
  private static instance: DashNavigationHandler;
  private navigationHistory: string[] = [];
  
  // Screen registry for mobile
  private readonly MOBILE_SCREENS = {
    'dashboard': '/',
    'students': '/screens/student-management',
    'lessons': '/screens/lessons-hub',
    'homework': '/screens/assign-homework',
    // ... more screens
  };
  
  // Voice command patterns
  private readonly COMMAND_PATTERNS = [
    { pattern: /show (me )?(my )?students?/i, screen: 'students' },
    { pattern: /open (the )?lesson/i, screen: 'lessons' },
    // ... more patterns
  ];
}
```

### 2.2 Integrate with Dash
Connect DashNavigationHandler to DashAIAssistant for voice navigation

---

## 🎯 Phase 3: Mobile-Specific UI/UX (2-3 hours)

### 3.1 Enhanced Mobile Gestures
- Swipe gestures for Dash drawer
- Pull-to-refresh for dashboard
- Shake to activate Dash (alternative to wake word)
- Long-press for quick actions

### 3.2 Mobile-Optimized Layouts
- Bottom sheet for Dash (instead of full screen)
- Floating action button for quick Dash access
- Mobile-friendly dashboard cards
- Touch-optimized button sizes

### 3.3 Haptic Feedback
```typescript
// Add haptic feedback throughout mobile UI
import * as Haptics from 'expo-haptics';

// On important actions
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// On errors
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

---

## 🎯 Phase 4: Offline-First Mobile (2-3 hours)

### 4.1 Enhanced Caching
- Cache lesson plans locally
- Offline voice recording queue
- Background sync when online
- SQLite for offline data

### 4.2 Offline Dash
- Basic Dash responses without network
- Queue voice messages for processing
- Show offline status clearly

---

## 🎯 Phase 5: Push Notifications & Background (1-2 hours)

### 5.1 Smart Notifications
- "Time to grade homework" reminders
- Student progress alerts
- Parent message notifications
- Customizable notification preferences

### 5.2 Background Tasks
- Sync data in background
- Update notifications
- Wake word detection (when app is active)

---

## 🎯 Phase 6: Biometric & Security (1 hour)

### 6.1 Biometric Login
- Fingerprint
- Face ID (iOS)
- PIN backup

### 6.2 Secure Storage
- Store sensitive data in SecureStore
- Encrypt voice recordings locally
- Secure credential management

---

## 🎯 Phase 7: Mobile Performance (1-2 hours)

### 7.1 Optimizations
- Lazy load screens
- Image optimization
- Reduce bundle size
- Memory management

### 7.2 Monitoring
- Track app performance
- Monitor crash reports
- Analytics for mobile usage

---

## Implementation Priority

### 🔥 IMMEDIATE (Today)
1. **Build Preview APK** - Enable wake word
2. **DashNavigationHandler** - Voice navigation
3. **Test on device** - Verify all features work

### 🎯 THIS WEEK
4. Mobile-specific UI enhancements
5. Offline-first functionality
6. Push notifications

### 📅 NEXT WEEK
7. Biometric authentication
8. Performance optimizations
9. Polish and refinement

---

## Mobile-Specific Features to Add

### Voice Features
- [x] Voice recording ✅
- [x] Transcription ✅
- [ ] Wake word detection (needs preview build)
- [ ] Background wake word (advanced)
- [ ] Voice-to-text in all inputs
- [ ] Speech output controls

### Navigation
- [ ] DashNavigationHandler
- [ ] Voice commands
- [ ] Gesture navigation
- [ ] Quick actions menu
- [ ] Recent screens history

### Native Integrations
- [ ] Camera for scanning
- [ ] Document picker
- [ ] Share functionality
- [ ] Calendar integration
- [ ] Contact integration

### Offline Support
- [ ] Local database (SQLite)
- [ ] Sync engine
- [ ] Conflict resolution
- [ ] Offline indicators

### Performance
- [ ] Code splitting
- [ ] Image optimization
- [ ] Memory profiling
- [ ] Battery optimization

---

## Testing Checklist

### Device Testing
- [ ] Android 11+
- [ ] Android 8-10 (legacy)
- [ ] Different screen sizes
- [ ] Tablet layouts
- [ ] Landscape mode

### Feature Testing
- [ ] Wake word detection
- [ ] Voice recording
- [ ] Navigation
- [ ] Offline mode
- [ ] Push notifications
- [ ] Biometrics

### Performance Testing
- [ ] App launch time < 3s
- [ ] Smooth scrolling (60fps)
- [ ] Memory usage < 200MB
- [ ] Battery drain acceptable

---

## Commands Reference

### Development
```bash
# Start dev server
npm run start:clear

# Android dev
npm run dev:android

# Build preview
eas build --platform android --profile preview

# Build dev client
npm run android
```

### Testing
```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

### Git Workflow
```bash
# Check branch
git branch
# Should show: * mobile

# Regular commits
git add .
git commit -m "feat(mobile): description"

# Push when ready (after fixing GitHub secrets)
git push origin mobile
```

---

## Current Status

| Feature | Status | Priority |
|---------|--------|----------|
| Voice Recording | ✅ Working | Complete |
| Voice Upload | ✅ Fixed | Complete |
| Transcription | ✅ Working | Complete |
| Wake Word | ⏳ Needs build | HIGH |
| Navigation Handler | 📝 To implement | HIGH |
| Mobile UI | 📝 To implement | MEDIUM |
| Offline Mode | 📝 To implement | MEDIUM |
| Biometrics | 📝 To implement | LOW |

---

**Ready to start!** Let's begin with building the preview APK and implementing DashNavigationHandler! 🚀