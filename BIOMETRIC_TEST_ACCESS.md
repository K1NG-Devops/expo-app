# How to Access Biometric Test Screen

There are several ways to access the biometric test screen for debugging your OppoA40 fingerprint issues:

## Method 1: From Settings (Recommended)

1. **Open the app** and navigate to **Settings**
2. **In Development Mode**: Look for the "Developer Tools" section and tap "Biometric Test"
3. **If biometrics not working**: Tap on the biometric authentication setting - it will show an alert with "Run Tests" option

## Method 2: From Sign-in Screen (Development)

1. **In Development Mode**: Look for a small bug icon (🐛) in the top-right corner of the sign-in screen
2. **Tap the bug icon** to go directly to the biometric test

## Method 3: URL Navigation (Direct)

If you're using Expo Go or a development build:

1. **In the terminal**: `npx expo start`
2. **Press 's'** to switch to Expo Go
3. **In Expo Go**: Navigate to `exp://your-ip:8081/biometric-test`

## Method 4: Long Press (Hidden Feature)

1. **On Sign-in Screen**: If biometric login is available, look for the backup authentication link
2. **Long press** on the backup authentication text
3. This will navigate to the biometric test screen

## What the Test Screen Shows

The biometric test screen provides:

- **Device Information**: Your OppoA40 details
- **Biometric Status**: Hardware availability, enrollment status, security level
- **Supported Types**: What biometric methods are detected
- **Issues & Recommendations**: Specific suggestions for your device
- **Test Authentication**: Live testing of biometric authentication
- **Comprehensive Tests**: Multiple authentication configurations
- **Share Debug Report**: Export detailed report for troubleshooting

## Expected Results for OppoA40

Your OppoA40 should show:
- **Brand**: OPPO
- **Model**: OppoA40
- **Hardware**: Available (True)
- **Enrolled**: True (if you've set up fingerprint)
- **Supported Types**: Should detect FINGERPRINT
- **Security Level**: Likely BIOMETRIC_WEAK (which is acceptable)

## Troubleshooting Tips

1. **If no biometric types detected**: The app now automatically assumes FINGERPRINT for OPPO devices
2. **If authentication fails**: Try the "Permissive Configuration" test
3. **Security level issues**: OPPO devices often use WEAK security, which our app now accepts
4. **Device settings**: Ensure fingerprint is set up in Android Settings > Security & location > Fingerprint

## Debug Report

Use the "Share Debug Report" button to get a detailed report that includes:
- Complete device and capability information
- Identified issues and recommendations
- Test results from different authentication methods
- OPPO-specific compatibility notes

This report can help identify exactly why biometric authentication might not be working on your device.