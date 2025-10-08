# Fix: Voice Notes Upload 400 Error

## Problem

Users are experiencing a 400 error when uploading voice notes to the `voice-notes` storage bucket. The error occurs at path:
```
android/136cf31c-b37c-45c0-9cf7-755bd1b9afbf/dash_1759820452418_m8jldyvsgy.m4a
```

## Root Cause

The RLS (Row Level Security) policies on the `storage.objects` table are not correctly validating the voice note upload path structure. The issue may be related to:

1. **Incorrect array indexing** in the RLS policy
2. **Path structure mismatch** between client and server expectations
3. **MIME type validation** issues

## Current Setup

### Client Code (`services/DashAIAssistant.ts`)
```typescript
const prefix = Platform.OS === 'web' ? 'web' : Platform.OS;
storagePath = `${prefix}/${userId}/${fileName}`;
// Creates: android/136cf31c-b37c-45c0-9cf7-755bd1b9afbf/dash_1759820452418_m8jldyvsgy.m4a
```

### RLS Policy (Expected)
```sql
-- Path: android/user_id/filename
-- storage.foldername splits into array: {android, user_id, filename}
-- PostgreSQL arrays are 1-indexed: [1]=android, [2]=user_id, [3]=filename
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
```

## Solution

### Option 1: Manual Fix via Supabase Dashboard (RECOMMENDED)

1. Go to Supabase Dashboard → Storage → voice-notes bucket → Policies

2. Delete existing policies:
   - `insert own voice note`
   - `select own voice note`
   - `update own voice note`
   - `delete own voice note`

3. Create new INSERT policy:

```sql
CREATE POLICY "insert own voice note"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (
    -- Platform/user_id/filename: check if [2] matches user ID
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Direct user_id/filename fallback: check if [1] matches user ID
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
```

4. Create new SELECT policy:

```sql
CREATE POLICY "select own voice note"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
```

5. Create new UPDATE policy:

```sql
CREATE POLICY "update own voice note"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
```

6. Create new DELETE policy:

```sql
CREATE POLICY "delete own voice note"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
```

### Option 2: Debug Path Structure

If the policies still don't work, debug the exact path structure:

1. In Supabase Dashboard → SQL Editor, run:

```sql
-- Test path parsing
DO $$
DECLARE
  test_path text := 'android/136cf31c-b37c-45c0-9cf7-755bd1b9afbf/dash_1759820452418_m8jldyvsgy.m4a';
  folder_array text[];
BEGIN
  folder_array := storage.foldername(test_path);
  RAISE NOTICE 'Path: %', test_path;
  RAISE NOTICE 'Folder array: %', folder_array;
  RAISE NOTICE 'Index [1]: %', folder_array[1];
  RAISE NOTICE 'Index [2]: %', folder_array[2];
  RAISE NOTICE 'Index [3]: %', folder_array[3];
  RAISE NOTICE 'Array length: %', array_length(folder_array, 1);
END $$;
```

2. Check the output and adjust the policy index accordingly.

### Option 3: Simplify Path Structure (Alternative)

If the above doesn't work, simplify the client path to remove the platform prefix:

**In `services/DashAIAssistant.ts` (line ~2860):**

```typescript
// OLD:
const prefix = Platform.OS === 'web' ? 'web' : Platform.OS;
storagePath = `${prefix}/${userId}/${fileName}`;

// NEW:
storagePath = `${userId}/${fileName}`;
```

Then update RLS policy to:

```sql
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
```

## Verification

After applying the fix, test by:

1. Opening the Dash AI Assistant in the app
2. Recording a voice message
3. Sending the voice message
4. Check that no 400 error occurs
5. Verify the file appears in Supabase Dashboard → Storage → voice-notes

## Additional Checks

- **MIME types**: Ensure bucket allows `audio/mp4` and `audio/m4a`
- **File size**: Default limit is 50MB (52428800 bytes)
- **Auth token**: Ensure user is properly authenticated
- **Service role**: Never use service role key in client-side code

## References

- Migration: `supabase/migrations/20251007045500_voice_notes_storage_policies.sql`
- Client code: `services/DashAIAssistant.ts` line 2779-2900
- Error log timestamp: 2025-10-07T07:00:54Z
