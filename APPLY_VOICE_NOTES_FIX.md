# Quick Fix: Apply Voice Notes RLS Migration

## 🚨 Required Action

The voice transcription feature needs a database migration to work properly.

### Error You're Seeing:
```
ERROR: Upload failed: new row violates row-level security policy
```

---

## ✅ Solution (2 minutes)

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste this migration:**
   - Open file: `supabase/migrations/20251008060100_fix_voice_notes_storage_rls.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the migration**
   - Click "Run" button
   - Wait for success message

5. **Verify it worked:**
   ```sql
   -- Run this query to check:
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'objects' 
   AND policyname LIKE '%voice%';
   ```
   
   You should see 4 policies:
   - Users can upload their own voice notes
   - Users can read their own voice notes
   - Users can update their own voice notes
   - Users can delete their own voice notes

---

### Option 2: Via Supabase CLI

```bash
cd /home/king/Desktop/edudashpro

# Apply the migration
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

---

## 🎤 Test Voice Transcription

After applying the migration:

1. **Restart your app**
2. **Open Dash Assistant**
3. **Try recording a voice message**
4. **Should see:** "Transcription uploading: 50%..."
5. **Success:** Your voice is transcribed!

---

## 🔍 Troubleshooting

### Still getting RLS errors?

**Check 1: Bucket exists**
```sql
SELECT * FROM storage.buckets WHERE id = 'voice-notes';
```
Should return 1 row.

**Check 2: Policies are active**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%voice%';
```
Should return 4 rows (INSERT, SELECT, UPDATE, DELETE).

**Check 3: User is authenticated**
```sql
SELECT auth.uid();
```
Should return your user ID (not null).

### If something went wrong:

1. **Drop and recreate policies:**
   ```sql
   DROP POLICY IF EXISTS "Users can upload their own voice notes" ON storage.objects;
   DROP POLICY IF EXISTS "Users can read their own voice notes" ON storage.objects;
   DROP POLICY IF EXISTS "Users can update their own voice notes" ON storage.objects;
   DROP POLICY IF EXISTS "Users can delete their own voice notes" ON storage.objects;
   ```

2. **Re-run the migration**

---

## 📊 What This Migration Does

✅ Creates the `voice-notes` bucket (if missing)  
✅ Sets 25MB file size limit  
✅ Restricts to audio MIME types only  
✅ Adds RLS policies for authenticated users  
✅ Ensures users can only access their own recordings  
✅ Keeps bucket private (not public)

---

## 🔐 Security

The migration ensures:
- Voice notes are stored in user-specific folders: `voice-notes/{user_id}/filename.m4a`
- Users can **only** access their own recordings
- No public access to voice recordings
- Audio files are validated by MIME type

---

## ⏱️ Estimated Time

- **2 minutes** to apply via dashboard
- **30 seconds** to test
- **Total: 2.5 minutes** 🚀

---

## 📝 Need Help?

If you're still having issues after applying this migration:

1. Check the full error in your app console
2. Review Supabase logs: Dashboard → Logs → Error Logs
3. Verify your user is authenticated before testing

---

**File Location:** `/home/king/Desktop/edudashpro/supabase/migrations/20251008060100_fix_voice_notes_storage_rls.sql`
