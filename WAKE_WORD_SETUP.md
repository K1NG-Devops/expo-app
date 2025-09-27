# Dash AI Wake-Word Setup Guide

## Overview

The Dash AI wake-word feature allows users to activate the assistant by saying "Hello Dash" while the app is open and in focus. This feature uses the Picovoice Porcupine wake-word detection engine.

## Prerequisites

- React Native/Expo development environment
- Picovoice Console account (free tier available)
- Compatible device (iOS/Android - not available on web)

## Installation Steps

### 1. Install Picovoice Porcupine SDK

```bash
npm install @picovoice/porcupine-react-native
```

### 2. Get Picovoice Access Key

1. Visit [Picovoice Console](https://console.picovoice.ai/)
2. Sign up for a free account
3. Create a new project
4. Copy your AccessKey from the project dashboard

### 3. Configure Environment Variable

Create or update your `.env` file in the project root:

```env
EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=your_access_key_here
```

### 4. Platform-Specific Setup

#### iOS
Add to `ios/Podfile`:
```ruby
pod 'pv-ios', '~> 3.0.0'
```

Then run:
```bash
cd ios && pod install
```

#### Android
Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'ai.picovoice:porcupine-android:3.0.0'
}
```

### 5. Rebuild the App

```bash
# For development builds
npx expo run:ios
# or
npx expo run:android

# For production builds, rebuild your custom dev client
```

## Usage

1. Open the Dash AI Settings
2. Enable the "'Hello Dash' Wake Word (in app)" toggle
3. Keep the app open and in focus
4. Say "Hello Dash" to activate the assistant

## Current Implementation Details

- **Foreground-only**: Wake word only works when the app is active and in focus
- **Built-in keyword**: Currently uses "Porcupine" as placeholder (should be trained for "Hello Dash")
- **Privacy-focused**: No background listening, no data sent to servers
- **Graceful fallback**: If SDK not installed, feature is silently disabled

## Customization Options

### Custom Wake Phrase
To train a custom "Hello Dash" wake phrase:

1. Visit [Picovoice Console](https://console.picovoice.ai/)
2. Go to "Wake Word" section
3. Create a custom wake word for "Hello Dash"
4. Download the generated `.ppn` file
5. Update the DashWakeWordListener component to use your custom model

### Sensitivity Adjustment
Modify the sensitivity in `components/ai/DashWakeWordListener.tsx`:

```typescript
porcupineRef.current = await Porcupine.create(
  accessKey, 
  [{ builtin: 'Porcupine', sensitivity: 0.65 }] // Adjust 0.65 (0.0-1.0)
);
```

## Troubleshooting

### Wake Word Not Working
1. Check that the environment variable is set correctly
2. Ensure the app has been rebuilt after installing the SDK
3. Verify the toggle is enabled in settings
4. Check the console for error messages

### Performance Issues
- Wake word detection runs on-device with minimal CPU impact
- If experiencing issues, try adjusting sensitivity lower (0.3-0.5)

### Platform Limitations
- **Web**: Wake word is not supported on web platform
- **Background**: Currently no background listening support
- **iOS Simulator**: May not work properly in simulator

## Advanced Features (Future Enhancements)

### Background Wake Word
Would require:
- Background processing permissions
- Persistent audio monitoring service
- Battery optimization handling

### Siri Shortcuts Integration (iOS)
- Create Siri shortcuts for common Dash commands
- Voice activation through Siri instead of wake word

### Multiple Wake Phrases
- Support multiple custom wake phrases
- Context-aware wake word activation

## Security & Privacy

- All processing is done on-device
- No audio data is transmitted to external servers
- Wake word detection only active when explicitly enabled
- App must be in focus for activation

## Support

For issues related to:
- **Picovoice SDK**: Check [Picovoice documentation](https://picovoice.ai/docs/)
- **Dash AI integration**: Check app logs and settings configuration
- **Platform-specific issues**: Ensure proper native dependencies are installed

## Cost Considerations

- **Picovoice Free Tier**: 10,000 API calls per month (plenty for most users)
- **Paid Tiers**: Available for higher usage or custom wake words
- **On-device processing**: No per-use costs after initial setup