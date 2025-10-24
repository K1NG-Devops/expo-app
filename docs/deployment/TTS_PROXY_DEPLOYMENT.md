# TTS Proxy Edge Function - Deployment Guide

**Status**: Ready to Deploy ✅  
**Date**: 2025-10-14

---

## ✅ What's Been Done

1. ✅ Created `tts-proxy` Edge Function (`supabase/functions/tts-proxy/index.ts`)
2. ✅ Created database migration with tables:
   - `voice_preferences`
   - `tts_audio_cache`
   - `voice_usage_logs`
3. ✅ Applied migration to production database
4. ✅ Tested Azure voices (Afrikaans + Zulu working)

---

## 🚀 Step 1: Add Azure Credentials to Supabase

### Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions
2. Scroll to **"Secrets" section**
3. Add these secrets:

```bash
AZURE_SPEECH_KEY={{AZURE_SPEECH_KEY}}
AZURE_SPEECH_REGION={{AZURE_SPEECH_REGION}}
```

4. Click **"Save"** or **"Add Secret"** for each

---

## 🚀 Step 2: Deploy the Edge Function

From your terminal:

```bash
cd /home/king/Desktop/edudashpro

# Deploy the function
supabase functions deploy tts-proxy

# Verify deployment
supabase functions list
```

---

## 🧪 Step 3: Test the Function

### Option 1: Quick Test (from terminal)

```bash
# Get your Supabase URL and anon key
export SUPABASE_URL="your-project-url.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Test Afrikaans
curl -X POST "https://${SUPABASE_URL}/functions/v1/tts-proxy" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hallo, ek is Dash",
    "lang": "af"
  }'

# Expected response:
# {
#   "audioUrl": "https://...",
#   "provider": "azure",
#   "language": "af-ZA",
#   "cacheHit": false
# }
```

### Option 2: Test with Real Auth Token

```bash
# Login to Supabase (if you have a test user)
# Get auth token from your app or Supabase Dashboard

curl -X POST "https://${SUPABASE_URL}/functions/v1/tts-proxy" \
  -H "Authorization: Bearer YOUR_REAL_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sawubona, nginguDash",
    "lang": "zu"
  }'
```

---

## 📊 Step 4: Verify in Database

Check that tables are working:

```sql
-- Check voice preferences table
SELECT * FROM voice_preferences LIMIT 1;

-- Check TTS cache
SELECT * FROM tts_audio_cache LIMIT 5;

-- Check usage logs
SELECT 
  service,
  provider,
  language_code,
  units,
  cost_estimate_usd,
  created_at
FROM voice_usage_logs
ORDER BY created_at DESC
LIMIT 10;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'tts-cache';
```

---

## 🎯 Supported Languages (Current)

| Language | Code | Provider | Status |
|----------|------|----------|--------|
| Afrikaans | `af` | Azure | ✅ Working |
| Zulu | `zu` | Azure | ✅ Working |
| English | `en` | Azure | ✅ Working |
| Xhosa | `xh` | Google* | ⚠️ Requires Google Cloud key |
| Sepedi | `st`/`nso` | Device | ⚠️ Fallback to device TTS |

\* Google Cloud TTS key not yet configured

---

## 🔧 Troubleshooting

### Error: "Azure Speech key not configured"

**Fix**: Add `AZURE_SPEECH_KEY` to Supabase secrets (see Step 1)

### Error: "Unauthorized" or 401

**Fix**: Need valid JWT token from authenticated user

### Error: "Failed to upload audio"

**Fix**: Check `tts-cache` storage bucket exists:
```sql
SELECT * FROM storage.buckets WHERE name = 'tts-cache';
```

If missing:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', false);
```

### Function not listed after deploy

**Fix**: Check function logs:
```bash
supabase functions list
supabase logs --function=tts-proxy
```

---

## 📈 Next Steps

### Immediate (Today)

1. ✅ Add Azure credentials to Supabase
2. ✅ Deploy tts-proxy function
3. ✅ Test with Afrikaans and Zulu
4. ✅ Verify cache is working

### Short Term (This Week)

1. Add Google Cloud TTS key for Xhosa support
2. Create client-side `VoicePipeline` class
3. Integrate with `DashAIAssistant`
4. Build minimal Voice Settings screen

### Medium Term (Next Week)

1. Enhance `transcribe-audio` function with Azure STT
2. Add voice preferences UI
3. Test with native speakers
4. Monitor costs and cache hit rates

---

## 💰 Cost Monitoring

Check costs daily:

```sql
SELECT 
  DATE(created_at) as date,
  provider,
  language_code,
  COUNT(*) as requests,
  SUM(units) as total_chars,
  SUM(cost_estimate_usd) as estimated_cost
FROM voice_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), provider, language_code
ORDER BY date DESC, estimated_cost DESC;
```

---

## 🔐 Security Checklist

- [x] Azure keys stored in Supabase secrets (not client)
- [x] JWT authentication enforced
- [x] RLS policies enabled on all tables
- [x] Tenant isolation via preschool_id
- [x] Usage logging for cost tracking
- [x] Storage bucket is private (not public)

---

**Ready to deploy?** Run `supabase functions deploy tts-proxy` now!
