# 🔧 IMMEDIATE FIX INSTRUCTIONS

## Issues Identified
1. **Voice notes upload fails** - RLS policy blocks uploads to `voice-notes/android/user_id/file.m4a`
2. **AI usage logging fails** - Edge Function can't insert into `ai_usage_logs` table
3. **Wake word fails** (non-critical) - Porcupine module not initializing properly

## ✅ SOLUTION: Apply via Supabase Dashboard

### Step 1: Go to Supabase SQL Editor
1. Open https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Paste This SQL
Copy ALL the content from `QUICK_FIX_RLS.sql` file and paste it into the SQL editor.

Or copy this directly:

```sql
-- ================================================
-- QUICK FIX: Voice Notes & AI Usage Logs RLS
-- ================================================

-- 1. Fix voice-notes storage
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "insert own voice note" ON storage.objects;
    DROP POLICY IF EXISTS "select own voice note" ON storage.objects;
    DROP POLICY IF EXISTS "update own voice note" ON storage.objects;
    DROP POLICY IF EXISTS "delete own voice note" ON storage.objects;
    
    CREATE POLICY "insert own voice note" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'voice-notes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
    
    CREATE POLICY "select own voice note" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'voice-notes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
    
    CREATE POLICY "update own voice note" ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'voice-notes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'voice-notes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
    
    CREATE POLICY "delete own voice note" ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'voice-notes' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
    
    RAISE NOTICE 'Voice-notes storage policies created';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- 2. Fix ai_usage_logs table
DO $$
BEGIN
    ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "users can insert own ai usage" ON public.ai_usage_logs;
    DROP POLICY IF EXISTS "users can view own ai usage" ON public.ai_usage_logs;
    DROP POLICY IF EXISTS "service role full access" ON public.ai_usage_logs;
    
    CREATE POLICY "users can insert own ai usage" ON public.ai_usage_logs 
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
    
    CREATE POLICY "users can view own ai usage" ON public.ai_usage_logs 
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
    
    CREATE POLICY "service role full access" ON public.ai_usage_logs 
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
    
    RAISE NOTICE 'AI usage logs policies created';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- 3. Verify
SELECT policyname, cmd FROM pg_policies 
WHERE (schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%voice note%')
   OR (schemaname = 'public' AND tablename = 'ai_usage_logs');
```

### Step 3: Run the Query
1. Click **Run** or press `Cmd/Ctrl + Enter`
2. You should see:
   - "Voice-notes storage policies created"
   - "AI usage logs policies created"
   - A list of created policies

### Step 4: Restart Your App
```bash
# Kill current process with Ctrl+C, then:
npm run start:clear
```

## 🎯 Expected Results

### ✅ Voice Recording Works
- No more `ERROR [Dash] Upload failed: new row violates row-level security policy`
- Files upload successfully to `voice-notes/android/user_id/filename.m4a`

### ✅ AI Usage Logs Work
- No more 400 errors for `/rest/v1/ai_usage_logs`
- Usage is properly tracked

### ⚠️ Wake Word (Optional)
The Porcupine wake word may still not work, but this is NON-CRITICAL.
Voice recording works with manual button press.

## 🔍 Verify It Worked

### Check in Supabase Dashboard:
1. Go to **Storage** → **voice-notes** bucket
2. Click **Policies** tab
3. You should see 4 policies: insert, select, update, delete

### Check in Database:
1. Go to **Table Editor** → **ai_usage_logs**
2. Click **RLS Policies** 
3. You should see 3 policies

## 📝 Alternative Methods

### Method A: Using TypeScript Script
```bash
npx tsx scripts/fix-dash-rls.ts
```

### Method B: Direct psql (if connection works)
```bash
psql "$SUPABASE_DB_URL" < QUICK_FIX_RLS.sql
```

## 🚨 Still Not Working?

### Check Authentication
```sql
-- Run this in SQL Editor to verify auth is working
SELECT auth.uid();
```

### Check Bucket Exists
```sql
-- Verify voice-notes bucket exists
SELECT * FROM storage.buckets WHERE id = 'voice-notes';
```

### Manual Policy Creation
If the script fails, manually create policies in:
1. **Storage** → Select `voice-notes` → **Policies** → Add policies
2. **Database** → `ai_usage_logs` → **RLS Policies** → Add policies

## Summary
**Primary Fix**: Run `QUICK_FIX_RLS.sql` in Supabase SQL Editor
**Time Required**: 2 minutes
**No Database Reset**: ✅ Safe to run on existing data