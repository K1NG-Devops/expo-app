# Dash AI Fix Guide

## Problems Identified

### 1. **PorcupineManager Initialization Error**
```
ERROR  [DashWakeWord] PorcupineManager initialization failed: 
[Error: unexpected code: undefined, message: Cannot read property 'fromKeywordPaths' of null]
```

**Root Cause**: The Picovoice native module isn't properly loaded or the export structure is different than expected.

### 2. **RLS Policy Violations**

#### a) Voice Notes Storage Upload
```
ERROR  [Dash] Upload failed: new row violates row-level security policy
```
- **Path**: `voice-notes/android/a1fd12d2-5f09-4a23-822d-f3071bfc544b/dash_xxx.m4a`
- **Issue**: Missing or incorrect RLS policies on `storage.objects` for the `voice-notes` bucket

#### b) AI Usage Logs Insert
```
POST | 400 | /rest/v1/ai_usage_logs
```
- **Issue**: Missing INSERT policy for authenticated users on `ai_usage_logs` table
- **This is called from Edge Functions** during transcription/AI operations

---

## Fixes Applied

### Fix 1: Enhanced PorcupineManager Detection

**File Modified**: `components/ai/DashWakeWordListener.tsx`

**Changes**:
- Added debug logging to show module structure
- Enhanced export detection to handle different module patterns
- Added validation checks before calling `fromKeywordPaths`

**What it does now**:
- Logs the actual keys in the Picovoice module for debugging
- Tries multiple export patterns: `PorcupineManager`, `default.PorcupineManager`, `default`
- Validates that `fromKeywordPaths` is actually a function before proceeding
- Provides clear error messages if the module isn't properly loaded

### Fix 2: RLS Policies SQL Script

**Files Created**:
- `fix-dash-rls-policies.sql` - SQL commands to fix policies
- `apply-dash-rls-fix.sh` - Shell script to apply the fix

**What it fixes**:

#### Voice Notes Storage Policies
Creates 4 policies on `storage.objects` for the `voice-notes` bucket:
- **INSERT**: Users can upload files to their own folder
- **SELECT**: Users can read their own files
- **UPDATE**: Users can update their own files  
- **DELETE**: Users can delete their own files

Path pattern support:
- `platform/user_id/filename` (e.g., `android/abc-123/file.m4a`) ✓
- `user_id/filename` (fallback pattern) ✓

#### AI Usage Logs Table Policies
Creates 3 policies on `public.ai_usage_logs`:
- **INSERT (authenticated)**: Users can insert their own usage logs
- **SELECT (authenticated)**: Users can view their own usage logs
- **ALL (service_role)**: Edge Functions have full access (needed for transcription function)

---

## How to Apply the Fixes

### Step 1: Apply Database Policies

You need to run the SQL script against your Supabase database. You have two options:

#### Option A: Using the Shell Script (Recommended)

```bash
# Set your Supabase database connection URL
export SUPABASE_DB_URL='postgresql://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres'

# Run the fix script
./apply-dash-rls-fix.sh
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `fix-dash-rls-policies.sql`
5. Paste and run it

#### Option C: Direct psql Command

```bash
psql "$SUPABASE_DB_URL" -f fix-dash-rls-policies.sql
```

### Step 2: Verify the Fix

After applying the SQL, you should see output showing the policies were created:

```
 tablename    | policyname                    | cmd    
--------------+-------------------------------+--------
 ai_usage_logs| users can insert own ai usage | INSERT
 ai_usage_logs| users can view own ai usage   | SELECT
 ai_usage_logs| service role full access      | ALL
 objects      | insert own voice note         | INSERT
 objects      | select own voice note         | SELECT
 objects      | update own voice note         | UPDATE
 objects      | delete own voice note         | DELETE
```

### Step 3: Restart Your App

The code changes for PorcupineManager are already applied. Restart your Expo dev server:

```bash
npm run start:clear
```

---

## Expected Results After Fix

### 1. Wake Word Detection
You should see one of these outcomes in the logs:

**If working**:
```
LOG  [DashWakeWord] Porcupine module keys: [...]
LOG  [DashWakeWord] PorcupineManager initialized successfully with Hello Dash model
LOG  [DashWakeWord] Wake word listening started successfully
```

**If Picovoice module has issues** (not critical - voice recording still works):
```
LOG  [DashWakeWord] Porcupine module keys: [...]
ERROR [DashWakeWord] PorcupineManager.fromKeywordPaths is not a function
```

### 2. Voice Recording & Upload
When you record and send a voice message:

**Success logs**:
```
LOG  [Dash] Recording stopped successfully: file:///.../recording-xxx.m4a
LOG  [Dash] Audio file validated: 32889 bytes
LOG  [Dash] Uploading audio as Uint8Array: 32889 bytes
LOG  [Dash] Upload path: android/user-id/dash_xxx.m4a
LOG  [Dash] Upload result: {"data": {...}, "error": null}
```

**No more**:
```
ERROR [Dash] Upload failed: new row violates row-level security policy
```

### 3. AI Usage Logging
The 400 error for `/rest/v1/ai_usage_logs` should disappear from your logs.

---

## Troubleshooting

### If Voice Upload Still Fails

1. **Verify the bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'voice-notes';
   ```

2. **Check the bucket is public or has proper settings**:
   ```sql
   UPDATE storage.buckets 
   SET public = false, 
       file_size_limit = 52428800,  -- 50MB
       allowed_mime_types = ARRAY['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
   WHERE id = 'voice-notes';
   ```

3. **Verify user authentication**:
   - Make sure the user is authenticated
   - Check that `auth.uid()` returns the correct user ID

### If PorcupineManager Still Fails

This might be due to:

1. **Native module not linked properly**:
   ```bash
   # Rebuild the app
   npm run android
   ```

2. **Missing Picovoice access key**:
   - Check `.env` file has `EXPO_PUBLIC_PICOVOICE_ACCESS_KEY`
   - Verify the key is valid at https://console.picovoice.ai

3. **Platform compatibility**:
   - Wake word detection only works on Android/iOS
   - Not supported on web platform

**Note**: Even if wake word detection fails, voice recording and transcription will still work - the user just needs to manually press the record button instead of saying "Hello Dash".

### If AI Usage Logs Still Get 400 Error

1. **Check if the table exists**:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'ai_usage_logs';
   ```

2. **Verify RLS is enabled but policies exist**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'ai_usage_logs';
   
   SELECT * FROM pg_policies 
   WHERE tablename = 'ai_usage_logs';
   ```

3. **Check Edge Function service role access**:
   - The transcription Edge Function should be using the service role key, not the anon key
   - Service role bypasses RLS when properly configured

---

## Prevention

To avoid similar issues in the future:

1. **Always create RLS policies when adding storage buckets**
2. **Grant service_role full access for tables used by Edge Functions**
3. **Test uploads with real user authentication before deploying**
4. **Use the SQL verification query** at the end of `fix-dash-rls-policies.sql` to check policies

---

## Summary

**What was broken**:
- ❌ Wake word listener couldn't initialize Picovoice
- ❌ Voice notes couldn't upload due to missing storage RLS
- ❌ AI usage logs couldn't insert due to missing table RLS

**What's fixed**:
- ✅ Better error handling and debugging for Picovoice initialization
- ✅ Voice notes storage RLS policies for authenticated uploads
- ✅ AI usage logs table RLS policies for logging

**Action required**:
- 🔧 Run the SQL fix script (`./apply-dash-rls-fix.sh`)
- 🔧 Restart your app (`npm run start:clear`)
- ✅ Test voice recording and verify no RLS errors