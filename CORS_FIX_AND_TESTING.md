# CORS Fix & Testing Guide

**Your Issue:** CORS errors when testing chunked transcription
**Root Cause:** Using `file://` protocol + placeholder URL

---

## 🔧 Quick Fix

The CORS errors you're seeing are because:
1. The HTML test page uses `file://` protocol (not HTTP)
2. The Supabase URL placeholders weren't replaced

### Option 1: Use the Integrated React Native Test Screen (RECOMMENDED)

This is the proper way to test within your Expo app:

```bash
# 1. Deploy the Edge Function
./deploy-chunked-transcription.sh

# OR manually:
supabase secrets set OPENAI_API_KEY=sk-your-key-here
supabase functions deploy transcribe-chunk

# 2. Start Expo web
npm run web

# 3. Navigate to: /screens/test-chunked-transcription
# The test screen is fully integrated with your app!
```

**Benefits:**
- ✅ No CORS issues (same origin)
- ✅ Proper authentication
- ✅ Theme integration
- ✅ Better UX

### Option 2: Fix the Standalone HTML Test Page

If you want to use the standalone HTML page:

1. **Edit the HTML file** (line 222-223):
   ```javascript
   // Replace these with your actual values from Supabase Dashboard
   const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co'; // Your actual URL
   const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Your actual anon key
   ```

2. **Serve via HTTP** (not file://):
   ```bash
   # In project root
   python3 -m http.server 8000
   
   # Then open: http://localhost:8000/test-chunked-transcription.html
   ```

---

## 🎯 Recommended Approach

**Use the integrated test screen** (`app/screens/test-chunked-transcription.tsx`)

It's already created and ready to use! Here's how:

### Step 1: Deploy Edge Function

```bash
cd /home/king/Desktop/edudashpro
./deploy-chunked-transcription.sh
```

This script will:
- Check Supabase login
- Set/verify API secrets
- Deploy the Edge Function
- Start Expo web server

### Step 2: Test in Browser

1. Wait for Expo web to start
2. Open browser to `http://localhost:8081`
3. Navigate to **Test Chunked Transcription** screen
4. Click **Start Recording**
5. Speak for 10-15 seconds
6. Click **Stop Recording**
7. Watch real-time transcription!

---

## 📊 Expected Results

When working correctly, you should see:

```
Total Chunks: 10-15 (for 10-15 second recording)
Avg Latency: 1200-1800ms
Success Rate: 90-100%

Recent Chunks:
- Chunk 0 (1450ms): "This is a"
- Chunk 1 (1320ms): "test of the"
- Chunk 2 (1280ms): "chunked transcription"
...
```

---

## 🐛 Troubleshooting

### "TypeError: Failed to fetch"

**Cause:** Edge Function not deployed or wrong URL

**Fix:**
```bash
# Check deployment
supabase functions list

# Should show: transcribe-chunk (deployed)

# If not deployed:
supabase functions deploy transcribe-chunk
```

### "401 Unauthorized"

**Cause:** Invalid or missing JWT token

**Fix:**
- Make sure you're logged in to your app
- The integrated test screen handles auth automatically
- For standalone HTML, use correct ANON_KEY

### "MediaRecorder not supported"

**Cause:** Browser doesn't support MediaRecorder API

**Fix:**
- Use Chrome or Edge (best support)
- Safari has limited codec support
- Firefox works but may have different codecs

### "No transcript appearing"

**Cause:** OpenAI API key not set or incorrect

**Fix:**
```bash
# Verify secret
supabase secrets list | grep OPENAI

# Set/update secret
supabase secrets set OPENAI_API_KEY=sk-your-actual-key

# Re-deploy function
supabase functions deploy transcribe-chunk
```

### High Latency (>3s per chunk)

**Possible causes:**
- Slow network connection
- OpenAI API overload
- Large audio chunks

**Fix:**
- Check your internet speed
- Verify audio compression settings (should be 32kbps)
- Try shorter chunks (500ms instead of 1000ms)

---

## 🔍 Debugging Commands

### Check Edge Function Logs

```bash
# Real-time logs
supabase functions logs transcribe-chunk --tail

# Recent errors only
supabase functions logs transcribe-chunk --level error --limit 50
```

### Test Edge Function Directly

```bash
# Create a test audio file first
# Then:
curl -X POST https://your-project.supabase.co/functions/v1/transcribe-chunk \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -F "audio=@test-audio.webm" \
  -F "session_id=test-123" \
  -F "chunk_index=0" \
  -F "language=en"
```

### Check Supabase Status

```bash
supabase status
# Should show: Connected to project: ...
```

---

## 📈 Performance Monitoring

Once deployed, monitor in Supabase Dashboard:

1. Go to **Database** → **Tables** → `ai_usage_logs`
2. Filter: `feature = 'asr'` AND `tier = 'chunk'`
3. Check `metadata` column for latencies

Example SQL query:
```sql
SELECT 
  AVG((metadata->>'latency_ms')::int) as avg_latency,
  COUNT(*) as total_chunks,
  provider,
  created_at::date as date
FROM ai_usage_logs
WHERE feature = 'asr' 
  AND tier = 'chunk'
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY provider, date
ORDER BY date DESC;
```

---

## 🎉 Success Checklist

- [ ] Edge Function deployed successfully
- [ ] OpenAI API key set in Supabase secrets
- [ ] Expo web running
- [ ] Test screen accessible
- [ ] Microphone permission granted
- [ ] First chunk arrives in <2 seconds
- [ ] Subsequent chunks every 1-2 seconds
- [ ] Final transcript is coherent
- [ ] Success rate >90%

---

## 🚀 Next Steps After Testing

Once Phase 1 is working:

1. **Integrate with Dash voice** - Update VoiceRecorderSheet to use ChunkedTranscription
2. **Add on-device ASR** - Instant feedback while chunks are processing
3. **Mobile optimization** - Adapt chunking for Android/iOS
4. **UI polish** - Progressive transcription display

---

## 📚 Related Files

- **Test Screen:** `app/screens/test-chunked-transcription.tsx`
- **Client Library:** `lib/speech/chunked-transcription.ts`
- **Edge Function:** `supabase/functions/transcribe-chunk/index.ts`
- **Audio Config:** `lib/voice-pipeline.ts` (already optimized!)
- **Deploy Script:** `./deploy-chunked-transcription.sh`

---

**Quick Deploy:**
```bash
./deploy-chunked-transcription.sh
```

**Quick Test:**
Navigate to `/screens/test-chunked-transcription` in Expo web

🎤 **Happy testing!**
