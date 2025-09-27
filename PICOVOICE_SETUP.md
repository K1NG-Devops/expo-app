# Quick Picovoice Setup

## Get Your Free Access Key

1. Visit https://console.picovoice.ai/
2. Sign up (free)
3. Create a project 
4. Copy your AccessKey

## Add to Environment

Edit `.env` file in project root:

```env
EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=your_actual_key_here
```

## Restart App

```bash
npm run start:clear
```

That's it! The "Hello Dash" wake word will now work when the app is open.