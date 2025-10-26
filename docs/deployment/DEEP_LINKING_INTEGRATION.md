# Deep Linking Integration Guide for Edusitepro

**Last Updated**: 26 October 2025  
**Target Audience**: Edusitepro website developers  
**EduDash Pro Version**: 1.0.2+

## Overview

This guide explains how to integrate deep links from the **Edusitepro website** (WordPress/marketing site) to the **EduDash Pro mobile app** (React Native + Expo). Deep links allow seamless user experiences, directing website visitors directly into specific app screens.

## URL Schemes

EduDash Pro supports two URL schemes:

### 1. Custom Scheme (Primary)
```
edudashpro://
```

### 2. Universal Links (HTTPS - Production Only)
```
https://www.edudashpro.org.za/
```

**Note**: Universal links require DNS configuration and app store distribution. For development and immediate integration, use the custom scheme.

## Common Deep Link Patterns

### Pattern 1: Email Verification
**Use Case**: User clicks email confirmation link from Edusitepro registration flow

**Web URL** (fallback landing page):
```
https://www.edudashpro.org.za/landing?type=email&token_hash={TOKEN}
```

**Deep Link** (opens app directly):
```
edudashpro://landing?type=email&token_hash={TOKEN}
```

**Implementation**:
```html
<!-- In Edusitepro email template -->
<a href="edudashpro://landing?type=email&token_hash=abc123xyz">
  Verify Your Email in EduDash Pro App
</a>

<!-- Fallback for users without app installed -->
<a href="https://www.edudashpro.org.za/landing?type=email&token_hash=abc123xyz">
  Or verify in your browser
</a>
```

### Pattern 2: Parent Invitation
**Use Case**: Teacher invites parent from Edusitepro teacher dashboard

**Web URL**:
```
https://www.edudashpro.org.za/landing?flow=invite-parent&code={INVITE_CODE}
```

**Deep Link**:
```
edudashpro://landing?flow=invite-parent&code={INVITE_CODE}
```

**Implementation**:
```javascript
// In Edusitepro WordPress/PHP backend
function generate_parent_invite_link($invite_code) {
  $base_url = 'https://www.edudashpro.org.za/landing';
  $params = http_build_query([
    'flow' => 'invite-parent',
    'code' => $invite_code
  ]);
  return $base_url . '?' . $params;
}

// Generate app deep link for email/SMS
function generate_parent_invite_deeplink($invite_code) {
  return 'edudashpro://landing?flow=invite-parent&code=' . urlencode($invite_code);
}
```

### Pattern 3: Student Join by Code
**Use Case**: Student/member receives join link

**Deep Link**:
```
edudashpro://landing?flow=invite-student&code={JOIN_CODE}
```

**Web Fallback**:
```
https://www.edudashpro.org.za/landing?flow=invite-student&code={JOIN_CODE}
```

### Pattern 4: Direct Sign-In
**Use Case**: Marketing CTA buttons on Edusitepro site

**Deep Link**:
```
edudashpro://sign-in
```

**Web Fallback**:
```
https://www.edudashpro.org.za/sign-in
```

## Implementation Strategies

### Strategy 1: Smart Link Detection (Recommended)

Automatically detect if user has the app installed and redirect accordingly.

**HTML + JavaScript**:
```html
<button id="openAppButton" onclick="openEduDashPro()">
  Open EduDash Pro App
</button>

<script>
function openEduDashPro(path = '/') {
  const deepLink = `edudashpro://${path}`;
  const webFallback = `https://www.edudashpro.org.za${path}`;
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.edudashpro';
  
  let didHide = false;
  const handleVisibilityChange = () => {
    if (document.hidden) didHide = true;
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Attempt to open app via deep link
  window.location.href = deepLink;
  
  // After 2 seconds, check if app opened
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    if (!didHide) {
      // App not detected, show install prompt
      const install = confirm('EduDash Pro app not detected. Install from Google Play?');
      if (install) {
        window.location.href = playStoreUrl;
      } else {
        // Fallback to web version
        window.location.href = webFallback;
      }
    }
  }, 2000);
}

// Example: Open specific flow
function openParentInvite(inviteCode) {
  openEduDashPro(`/landing?flow=invite-parent&code=${encodeURIComponent(inviteCode)}`);
}
</script>
```

### Strategy 2: Dual Button Approach

Provide separate buttons for app users and new users.

```html
<!-- For existing app users -->
<a href="edudashpro://sign-in" class="btn-primary">
  Open in EduDash Pro App
</a>

<!-- For new users -->
<a href="https://play.google.com/store/apps/details?id=com.edudashpro" class="btn-secondary">
  Download EduDash Pro
</a>
```

### Strategy 3: QR Code Integration

Generate QR codes containing deep links for print materials.

**PHP Example** (using any QR library):
```php
<?php
require_once 'vendor/autoload.php';
use Endroid\QrCode\QrCode;

function generate_parent_invite_qr($invite_code) {
  $deep_link = 'edudashpro://landing?flow=invite-parent&code=' . urlencode($invite_code);
  
  $qr_code = new QrCode($deep_link);
  $qr_code->setSize(300);
  $qr_code->setMargin(10);
  
  return $qr_code->writeDataUri();
}
?>

<!-- Display QR code in parent invite email/dashboard -->
<img src="<?php echo generate_parent_invite_qr($invite_code); ?>" 
     alt="Scan to join EduDash Pro" />
```

## Supported Routes & Parameters

### Landing Handler (`/landing`)
**Route**: `edudashpro://landing` or `https://www.edudashpro.org.za/landing`

**Parameters**:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `type` | string | Email verification flow | `type=email` |
| `token_hash` | string | Email verification token | `token_hash=abc123xyz` |
| `token` | string | Alternative token param | `token=abc123xyz` |
| `flow` | string | Specific user flow | `flow=invite-parent` |
| `code` | string | Invitation code | `code=ABCD1234` |
| `invitationCode` | string | Alternative code param | `invitationCode=ABCD1234` |

**Supported Flows**:
- `email-confirm`: Email verification
- `invite-parent`: Parent invitation
- `invite-student`: Student/member join
- `invite-member`: Generic member invitation

### Sign-In (`/sign-in`)
**Route**: `edudashpro://sign-in` or `https://www.edudashpro.org.za/sign-in`

**Parameters**:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `emailVerified` | boolean | Show email verified message | `emailVerified=true` |
| `emailVerificationFailed` | boolean | Show verification error | `emailVerificationFailed=true` |

### Legal Pages (Web Only)
These routes are **web-only** and do not have deep link equivalents:

- **Privacy Policy**: `https://www.edudashpro.org.za/privacy-policy`
- **Terms of Service**: `https://www.edudashpro.org.za/terms-of-service`

Users must view these in a web browser for legal compliance.

## Testing Deep Links

### Android (Physical Device or Emulator)
```bash
# Test email verification
adb shell am start -W -a android.intent.action.VIEW \
  -d "edudashpro://landing?type=email&token_hash=test123"

# Test parent invitation
adb shell am start -W -a android.intent.action.VIEW \
  -d "edudashpro://landing?flow=invite-parent&code=TEST1234"

# Test sign-in
adb shell am start -W -a android.intent.action.VIEW \
  -d "edudashpro://sign-in"
```

### iOS (Simulator or Device)
```bash
# Test email verification
xcrun simctl openurl booted "edudashpro://landing?type=email&token_hash=test123"

# Test parent invitation
xcrun simctl openurl booted "edudashpro://landing?flow=invite-parent&code=TEST1234"

# Test sign-in
xcrun simctl openurl booted "edudashpro://sign-in"
```

### Web Browser (Chrome/Firefox)
Simply visit the deep link URL in the address bar:
```
edudashpro://landing?flow=invite-parent&code=TEST1234
```

The browser will prompt to open the app if installed.

## Error Handling & Fallbacks

### Scenario 1: App Not Installed
**Solution**: Redirect to Play Store or web version

```javascript
function openWithFallback(deepLink, playStoreUrl, webUrl) {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Mobile: Try app, fallback to Play Store
    window.location.href = deepLink;
    setTimeout(() => {
      window.location.href = playStoreUrl;
    }, 2000);
  } else {
    // Desktop: Open web version
    window.location.href = webUrl;
  }
}
```

### Scenario 2: Invalid Parameters
EduDash Pro's landing handler validates all parameters. If invalid:
- Displays error message to user
- Provides "Back to Home" button
- Logs error for debugging

### Scenario 3: Expired Tokens
For email verification tokens:
- Token expiry handled server-side (Supabase)
- User sees "Token expired" error
- Redirected to request new verification email

## Security Considerations

### 1. Token Validation
- **Never expose sensitive data** in deep link parameters
- Email verification tokens are **single-use** and **time-limited**
- Invitation codes are **unique** and **trackable**

### 2. HTTPS for Universal Links
- Production universal links use HTTPS only
- Prevents man-in-the-middle attacks
- Requires Apple App Site Association (iOS) and Digital Asset Links (Android)

### 3. Rate Limiting
- Implement rate limiting on Edusitepro backend
- Prevent abuse of invitation code generation
- Monitor for suspicious deep link access patterns

## Integration Checklist

For Edusitepro developers integrating deep links:

- [ ] **Email Templates**: Update verification emails with deep links
- [ ] **Teacher Dashboard**: Add parent invitation deep link generation
- [ ] **Marketing CTAs**: Update "Download App" buttons with smart detection
- [ ] **QR Codes**: Generate QR codes for physical materials
- [ ] **Analytics**: Track deep link clicks and conversions
- [ ] **Error Handling**: Implement fallback logic for non-app users
- [ ] **Testing**: Verify all flows on Android devices
- [ ] **Documentation**: Update Edusitepro docs with deep link examples

## Support & Troubleshooting

### Common Issues

**Issue**: Deep link not opening app
- **Cause**: App not installed or custom scheme not registered
- **Solution**: Use smart detection with fallback (see Strategy 1)

**Issue**: Parameters not passing through
- **Cause**: URL encoding issues
- **Solution**: Always use `encodeURIComponent()` for parameter values

**Issue**: iOS not recognizing deep links
- **Cause**: Universal links not configured
- **Solution**: Use custom scheme `edudashpro://` for immediate testing

### Contact

For technical assistance with deep linking integration:
- **Email**: support@edudashpro.org.za
- **GitHub**: [EduDash Pro Repository Issues]
- **Slack**: #edudashpro-integration (if applicable)

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-26 | 1.0 | Initial deep linking documentation for Edusitepro integration |

---

**Last Updated**: 26 October 2025  
**Maintainer**: EduDash Pro Development Team
