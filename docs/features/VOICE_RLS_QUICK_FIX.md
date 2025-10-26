# Voice Transcription RLS Policy Quick Fix

## 🚨 Current Issue
```
ERROR [Dash] Transcription failed: Upload failed: new row violates row-level security policy
```

## ✅ Good News
- The progress tracking is working perfectly! (0% → 10% → 20% → 30% → 40% → 50%)
- The error handling is working correctly
- The issue is just with RLS policies

## 🔧 Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
Navigate to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/sql

### Step 2: Copy & Paste the SQL Script
Open the file `FIX_VOICE_RLS_RUN_IN_SUPABASE.sql` and copy all contents, then paste into the SQL editor.

### Step 3: Run the Script
Click "Run" button in the SQL editor.

### Step 4: Verify Success
You should see a result showing 4 policies:
```
policyname           | operation | applies_to
---------------------|-----------|------------------
voice_notes_delete   | DELETE    | voice-notes bucket
voice_notes_insert   | INSERT    | voice-notes bucket
voice_notes_select   | SELECT    | voice-notes bucket
voice_notes_update   | UPDATE    | voice-notes bucket
```

### Step 5: Test Voice Recording
1. Open the app
2. Go to Dash AI Assistant
3. Press and hold microphone button
4. Speak for 5-10 seconds
5. Release button
6. ✅ Should now upload and transcribe successfully!

---

## 📝 What This Fixes

The RLS policies were blocking uploads because:
- Old policies used complex `storage.foldername()` logic
- New simple policies use regex pattern matching: `name ~ ('^' || auth.uid()::text || '/')`
- This matches the path format: `{user_id}/{filename}.m4a`

### Example:
- User ID: `136cf31c-b37c-45c0-9cf7-755bd1b9afbf`
- File path: `136cf31c-b37c-45c0-9cf7-755bd1b9afbf/dash_1728293045123_abc123.m4a`
- Policy check: ✅ Path starts with user's ID

---

## 🧪 Alternative: Use Supabase CLI

If you prefer command line:

```bash
# Navigate to project
cd /home/king/Desktop/edudashpro

# Run the migration
npx supabase db push --db-url "your-connection-string"
```

**OR** use the Studio interface (easiest):
1. Go to Storage settings
2. Click "Policies" tab for voice-notes bucket
3. Delete all existing policies
4. Create new policies with the SQL from `FIX_VOICE_RLS_RUN_IN_SUPABASE.sql`

---

## 🎉 After Fix

Expected log output:
```
LOG  [Dash] Starting recording...
LOG  [Dash] Recording started
LOG  [Dash] Stopping recording...
LOG  [Dash] Recording stopped: file:///.../recording-xxx.m4a
LOG  [Dash] Transcribing audio: file:///.../recording-xxx.m4a
LOG  [VoiceController] Transcription validating: 0%
LOG  [VoiceController] Transcription validating: 10%
LOG  [VoiceController] Transcription validating: 20%
LOG  [VoiceController] Transcription uploading: 30%
LOG  [VoiceController] Transcription uploading: 40%
LOG  [VoiceController] Transcription uploading: 50%
LOG  [VoiceController] Transcription uploading: 70%    ← NEW! Gets past upload
LOG  [VoiceController] Transcription transcribing: 75%
LOG  [VoiceController] Transcription transcribing: 95%
LOG  [VoiceController] Transcription complete: 100%
✅ Success! Transcript: "Hello, this is a test message..."
```

---

## 📞 Need Help?

If the fix doesn't work:

1. **Check you're signed in**: The error could also be authentication-related
2. **Check bucket exists**: Verify `voice-notes` bucket exists in Storage
3. **Check logs**: Look for more detailed error messages in Supabase logs
4. **Try test upload**: Use Supabase Storage UI to manually upload a file to `your-user-id/test.m4a`

---

**File to run:** `FIX_VOICE_RLS_RUN_IN_SUPABASE.sql`  
**Dashboard URL:** https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/sql
