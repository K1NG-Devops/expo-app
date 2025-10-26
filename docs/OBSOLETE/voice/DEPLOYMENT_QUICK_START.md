# Voice System Deployment - Quick Start 🚀

## Prerequisites

Before deploying, ensure you have:

1. ✅ Azure Speech Services subscription
2. ✅ Azure Speech Key and Region
3. ✅ Supabase project (already configured)
4. ✅ Supabase CLI installed

## Option 1: Automated Deployment (Recommended)

Run the deployment script from your project root:

```bash
./scripts/deploy-voice-system.sh
```

The script will:
- ✓ Check all prerequisites
- ✓ Prompt for Azure credentials (if needed)
- ✓ Link to your Supabase project
- ✓ Set secrets securely
- ✓ Deploy the TTS proxy function
- ✓ Test the deployment

## Option 2: Manual Deployment

### Step 1: Set Environment Variables

```bash
export AZURE_SPEECH_KEY="your-azure-key-here"
export AZURE_SPEECH_REGION="southafricanorth"
```

### Step 2: Log in to Supabase

```bash
supabase login
```

### Step 3: Link to Your Project

```bash
supabase link --project-ref lvvvjywrmpcqrpvuptdi
```

### Step 4: Set Secrets

```bash
supabase secrets set AZURE_SPEECH_KEY="$AZURE_SPEECH_KEY" --project-ref lvvvjywrmpcqrpvuptdi
supabase secrets set AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION" --project-ref lvvvjywrmpcqrpvuptdi
```

### Step 5: Deploy Function

```bash
supabase functions deploy tts-proxy --project-ref lvvvjywrmpcqrpvuptdi
```

### Step 6: Test Deployment

```bash
curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/tts-proxy \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"synthesize","text":"Hello test","language":"af"}'
```

## Getting Your Azure Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **Cognitive Services** → **Speech Services**
3. Select your Speech resource (or create one)
4. Click **Keys and Endpoint** in the left menu
5. Copy **Key 1** and **Location/Region**

**Available Regions:**
- `southafricanorth` (Johannesburg) - Recommended
- `southafricawest` (Cape Town)
- `westeurope` (Netherlands)
- `eastus` (Virginia)

## Verify Deployment

### Check Function Logs

```bash
supabase functions logs tts-proxy --project-ref lvvvjywrmpcqrpvuptdi
```

### Check Secrets

```bash
supabase secrets list --project-ref lvvvjywrmpcqrpvuptdi
```

### Test in App

Navigate to the voice demo screen in your app:
```
app/screens/voice-demo.tsx
```

## Troubleshooting

### Issue: "Not logged in"

```bash
supabase login
```

### Issue: "Project not linked"

```bash
supabase link --project-ref lvvvjywrmpcqrpvuptdi
```

### Issue: "Function deployment failed"

Check function logs:
```bash
supabase functions logs tts-proxy --project-ref lvvvjywrmpcqrpvuptdi --follow
```

### Issue: "Invalid credentials"

Verify secrets are set correctly:
```bash
supabase secrets list --project-ref lvvvjywrmpcqrpvuptdi
```

## Post-Deployment

After successful deployment:

1. **Test the Demo Screen**
   - Run your app
   - Navigate to voice demo
   - Test each language

2. **Check Usage**
   - Monitor Azure usage in Azure Portal
   - Check Supabase function invocations

3. **Integrate into Screens**
   - See `docs/voice/CLIENT_INTEGRATION.md`
   - Add voice to existing features

## Supported Languages

| Language | Code | Provider | Status |
|----------|------|----------|--------|
| Afrikaans | `af` | Azure | ✅ Full |
| isiZulu | `zu` | Azure | ✅ Full |
| isiXhosa | `xh` | Google | ⚠️ Fallback |
| Sepedi | `nso` | OpenAI | ⚠️ Fallback |

## Cost Estimation

**Azure Speech Services (Standard tier):**
- TTS: $16 per 1M characters
- Average request: ~100 characters = $0.0016
- With caching: ~70% cache hit rate
- Effective cost: ~$0.0005 per request

**Example Usage:**
- 1,000 requests/month = ~$0.50
- 10,000 requests/month = ~$5.00
- 100,000 requests/month = ~$50.00

## Need Help?

- **Documentation**: `docs/voice/`
- **Demo Screen**: `app/screens/voice-demo.tsx`
- **Integration Guide**: `docs/voice/CLIENT_INTEGRATION.md`
- **Test Script**: `scripts/test-azure-voices.sh`

## Quick Commands Reference

```bash
# Deploy
./scripts/deploy-voice-system.sh

# View logs
supabase functions logs tts-proxy --project-ref lvvvjywrmpcqrpvuptdi

# List secrets
supabase secrets list --project-ref lvvvjywrmpcqrpvuptdi

# Redeploy function
supabase functions deploy tts-proxy --project-ref lvvvjywrmpcqrpvuptdi

# Test locally (requires Docker)
supabase functions serve tts-proxy
```

---

**Ready to deploy?** Run: `./scripts/deploy-voice-system.sh` 🚀
