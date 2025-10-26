# 🚨 URGENT: Avatar Storage Setup Required

## Problem Identified

The Supabase `avatars` storage bucket **does not exist**, which is why you're seeing local file URI errors like:

```
Not allowed to load local resource: file:///data/user/0/com.edudashpro/cache/ImageManipulator/29880b8e-7677-43e4-ba1a-effc5c903cce.jpg
```

When the upload to Supabase fails (because the bucket doesn't exist), the app falls back to trying to display local processed image URIs, which browsers don't allow for security reasons.

## Quick Fix: Create the Avatars Bucket

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `edudashpro`

2. **Navigate to Storage:**
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

3. **Create the avatars bucket:**
   ```
   Bucket Name: avatars
   Public bucket: ✅ Yes (checked)
   File size limit: 5242880 (5MB)
   Allowed MIME types: image/jpeg,image/jpg,image/png,image/webp,image/avif
   ```

4. **Click "Create bucket"**

### Option 2: Via SQL Editor

1. **Go to SQL Editor:**
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

2. **Run this SQL:**
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'avatars',
     'avatars', 
     true,
     5242880, -- 5MB limit
     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
   ) ON CONFLICT (id) DO NOTHING;
   ```

### Option 3: Complete Migration (Advanced)

Run the complete SQL migration from `migrations/20250917_setup_avatars_storage.sql` in your Supabase SQL Editor. This includes:
- ✅ Bucket creation
- ✅ RLS policies for secure access
- ✅ Helper functions
- ✅ Automatic cleanup triggers

## Verify the Fix

After creating the bucket, run this to verify:

```bash
npx tsx scripts/check-avatar-storage.ts
```

You should see:
```
✅ Buckets found: avatars
✅ Avatars bucket exists
✅ Can access avatars bucket
✅ Can generate public URLs
```

## Expected Result

Once the bucket is created:

1. **Profile image uploads will work** - images will be stored in Supabase Storage
2. **Public URLs will be generated** - like `https://your-project.supabase.co/storage/v1/object/public/avatars/profile_user-id_timestamp.jpg`
3. **No more local URI errors** - because images will use proper HTTP URLs
4. **Images will display on all platforms** - including web browsers

## Why This Happened

The `avatars` bucket was never created during the initial setup. The ProfileImageService code is correctly configured to use Supabase Storage, but it can't upload without the bucket existing first.

## Next Steps

1. ✅ Create the `avatars` bucket (using Option 1 above)
2. ✅ Test profile image upload in the app
3. ✅ Verify images display properly on web and mobile
4. ✅ Check that old local URIs are replaced with Supabase URLs

This should completely resolve the "Not allowed to load local resource" error!