# Azure Voice Testing - Quick Start

**Time to complete**: ~10 minutes

---

## 🚀 Quick Commands

```bash
# 1. Set your Azure credentials (get these from Azure Portal)
export AZURE_SPEECH_KEY="paste-your-key-here"
export AZURE_SPEECH_REGION="southafricanorth"

# 2. Run the test script
cd /home/king/Desktop/edudashpro
./scripts/test-azure-voices.sh

# 3. Check the results
ls -lh tests/voice/samples/  # Audio samples
cat tests/voice/azure-voices-full.json  # Full voice list (if jq installed)
```

---

## 📝 What You Need

### From Azure Portal (portal.azure.com)

1. **Create Speech Service**:
   - Resource: Speech Services
   - Region: **South Africa North** (recommended)
   - Pricing: F0 (Free) is fine for testing

2. **Get API Key**:
   - Go to Speech Service → Keys and Endpoint
   - Copy KEY 1
   - Note the region

---

## ✅ Expected Output

The script will:
1. ✅ List all SA language voices
2. ✅ Generate 3-4 test audio samples
3. ✅ Check STT support
4. ✅ Save results to `tests/voice/`

**Success looks like**:
```
✅ Using Azure region: southafricanorth
✅ Successfully fetched voice list
✅ Success (45123 bytes) - saved to tests/voice/samples/af-test.mp3
✅ Success (52341 bytes) - saved to tests/voice/samples/zu-test.mp3
✅ Success (48765 bytes) - saved to tests/voice/samples/xh-test.mp3
```

---

## 🎧 Listen to Samples

**Option 1 - VLC/Audio Player**:
```bash
vlc tests/voice/samples/af-test.mp3  # or your preferred player
```

**Option 2 - mpg123** (command line):
```bash
mpg123 tests/voice/samples/*.mp3
```

**Option 3 - Copy to local machine**:
```bash
# Run from your local machine
scp king@your-server:/home/king/Desktop/edudashpro/tests/voice/samples/*.mp3 ~/Downloads/
```

---

## 🐛 Quick Troubleshooting

### "Failed to fetch voices"
→ Check your `AZURE_SPEECH_KEY` is correct (no extra spaces)

### "jq: command not found"
→ Optional. Install with: `sudo apt-get install jq`

### "No audio files generated"
→ Check error messages, verify API key and region

### "Can't play audio"
→ Copy files to a machine with audio or use a GUI file manager

---

## 📊 Document Your Findings

After testing, create a quick report:

```bash
nano tests/voice/AZURE_TEST_RESULTS.md
```

Note:
- ✅ Which voices are available?
- ✅ Voice quality (listen to samples)
- ✅ STT support for each language
- ✅ Preferred voice for each language

---

## 🎯 Next Steps

Once testing is done:

1. ✅ Document findings (see above)
2. ✅ Add Azure credentials to Supabase Dashboard:
   - Project Settings → Edge Functions → Secrets
   - Add `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
3. ✅ **Move to Phase 2**: Create the `tts-proxy` Edge Function

---

## 📚 Full Documentation

- **Detailed Setup**: `docs/features/AZURE_SETUP_GUIDE.md`
- **Full Implementation Plan**: `docs/features/SA_MULTILINGUAL_VOICE_SYSTEM.md`
- **Quick Reference**: `docs/features/SA_VOICE_QUICK_START.md`

---

**Need help?** Check the troubleshooting section in `AZURE_SETUP_GUIDE.md`

**Ready to test?** Run `./scripts/test-azure-voices.sh` now!
