# Azure Speech Setup Guide

## Issue Summary

Your logs show:
```
WARN  [AzureSpeechToken] Failed to fetch token: [FunctionsHttpError: Edge Function returned a non-2xx status code]
```

This means the `azure-speech-token` Edge Function is returning an error (500 status).

## Root Causes

1. **Azure secrets not configured** - The Edge Function needs `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
2. **Function not deployed** - The Edge Function may not be deployed to Supabase

## Setup Steps

### 1. Get Azure Speech Credentials

If you don't have them yet:
- Go to [Azure Portal](https://portal.azure.com)
- Create a Speech resource (preferably in South Africa North region)
- Get your subscription key and region

### 2. Configure Supabase Secrets

```bash
# Set the Azure Speech credentials
supabase secrets set AZURE_SPEECH_KEY=your_actual_key_here
supabase secrets set AZURE_SPEECH_REGION=southafricanorth

# Verify secrets are set (won't show values, just names)
supabase secrets list
```

### 3. Deploy the Edge Function

```bash
# Deploy the azure-speech-token function
supabase functions deploy azure-speech-token

# Verify it's deployed
supabase functions list
```

### 4. Test the Function

```bash
# Test the function directly
curl -X POST \
  "https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/azure-speech-token" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Expected successful response:
# {"token":"eyJhbGc...","region":"southafricanorth","expiresIn":600}
```

### 5. Verify in App

After setup, you should see in logs:
```
LOG  [RealtimeVoice] ✅ Azure token/region available
LOG  [RealtimeVoice] 🎤 Starting Azure Speech session...
```

Instead of:
```
WARN  [AzureSpeechToken] Failed to fetch token
WARN  [RealtimeVoice] No Azure token/region available
```

## Improved Error Logging

I've updated the Azure token fetch to show more details:
- If function returns error: shows the error code and details
- Hints about checking if function is deployed and secrets are set
- Shows actual response data when token/region are missing

## Timing Fix

I also fixed the race condition where the voice controller was checking for transcript before WebRTC fully established:

**Before:**
1. Start stream (status: connecting)
2. Immediately check for transcript → ERROR
3. Later: stream actually connects

**After:**
1. Start stream (status: connecting)
2. Wait up to 5 seconds for stream to establish
3. Stop stream once established
4. Wait up to 3 seconds for final transcript
5. Process transcript

## Alternative: Skip Azure for English

If you only need English voice recognition and want to skip Azure setup entirely:

1. Remove Azure language routing in `useRealtimeVoice` hook
2. Use OpenAI WebRTC for all languages (it already works for English)

This is simpler but won't support South African languages (Afrikaans, Zulu, Xhosa, Sotho).

## Testing Commands

```bash
# Check if function is deployed
supabase functions list | grep azure-speech-token

# Check function logs for errors
supabase functions logs azure-speech-token --tail

# Test locally (requires Docker)
supabase functions serve azure-speech-token

# Then in another terminal:
curl -X POST http://localhost:54321/functions/v1/azure-speech-token
```

## Next Steps

1. Run the setup commands above
2. Clear app cache: `npm run start:clear`
3. Test voice recording with South African language selected
4. Check logs for successful Azure token fetch
5. If still failing, check `supabase functions logs azure-speech-token`
