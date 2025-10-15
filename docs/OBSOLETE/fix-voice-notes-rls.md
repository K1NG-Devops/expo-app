# Fix: Voice Notes Upload RLS Error

## Error
```
ERROR [Dash] Upload failed: new row violates row-level security policy
WARN [Dash] RLS policy prevents upload, attempting transcription without storage
```

## Root Cause
The `voice-notes` storage bucket in Supabase doesn't have proper Row Level Security (RLS) policies configured, preventing authenticated users from uploading voice recordings.

## Solution

### 1. Configure Supabase Storage Bucket

Go to your Supabase Dashboard → Storage → voice-notes bucket

### 2. Add RLS Policies

Run these SQL commands in Supabase SQL Editor:

```sql
-- Create voice-notes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own voice notes
CREATE POLICY "Users can upload their own voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own voice notes
CREATE POLICY "Users can read their own voice notes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own voice notes
CREATE POLICY "Users can update their own voice notes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own voice notes
CREATE POLICY "Users can delete their own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Verify Bucket Configuration

1. Go to Storage → voice-notes
2. Check that "Public bucket" is **OFF** (voice notes should be private)
3. Go to Policies tab
4. Verify all 4 policies are enabled:
   - INSERT policy
   - SELECT policy  
   - UPDATE policy
   - DELETE policy

### 4. Test Upload

1. Restart your app
2. Try recording a voice message
3. Check Supabase Storage → voice-notes to see uploaded files

## File Structure

Voice notes are stored with this path pattern:
```
voice-notes/{user_id}/voice-note-{timestamp}.m4a
```

This ensures:
- ✅ Each user can only access their own recordings
- ✅ Files are organized by user
- ✅ Timestamps prevent naming conflicts

## Alternative: Temporary Fix

If you can't modify Supabase policies immediately, the app will fallback to:
1. Attempting local transcription
2. Showing a warning message
3. Processing voice input without storage

However, this means:
- ❌ Voice notes won't be saved
- ❌ No voice history
- ❌ Can't replay recordings

**Recommended: Set up proper RLS policies for full functionality**

## Related Files

- `services/DashAIAssistant.ts` (lines 3685-3795) - Upload logic with RLS fallback
- `hooks/useVoiceController.ts` - Voice recording controller
- `components/ai/VoiceDock.tsx` - Voice UI component

## Troubleshooting

### Still getting RLS errors?

1. **Check user authentication:**
   ```sql
   SELECT auth.uid(); -- Should return your user ID
   ```

2. **Check bucket exists:**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'voice-notes';
   ```

3. **Check policies are active:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects';
   ```

4. **Test with Supabase client:**
   ```javascript
   const { data, error } = await supabase
     .storage
     .from('voice-notes')
     .upload('test.txt', 'test content');
   console.log({ data, error });
   ```

### Common Issues

- **Policy uses wrong user ID field:** Make sure `auth.uid()` matches your user
- **Bucket is public:** Should be private for security
- **Missing WITH CHECK:** INSERT policies need WITH CHECK, not USING
- **Folder structure mismatch:** Path must start with `{user_id}/`

## Security Notes

✅ **Good Practices:**
- Voice notes are private (not public bucket)
- Users can only access their own recordings
- Bucket organized by user ID
- Transcription happens server-side

❌ **Don't:**
- Make voice-notes bucket public
- Allow users to access other users' recordings
- Store sensitive audio without encryption
- Skip authentication checks
