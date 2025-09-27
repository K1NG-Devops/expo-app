# Fix Push Notifications 400 Error

The push notifications test is failing with a 400 error because the `EXPO_ACCESS_TOKEN` is not configured in Supabase Edge Functions environment.

## Steps to Fix

### 1. Get an Expo Access Token

1. Go to [https://expo.dev/accounts/[your-username]/settings/access-tokens](https://expo.dev/accounts/[your-username]/settings/access-tokens)
2. Click "Create" to generate a new access token
3. Give it a descriptive name like "EduDash Pro Push Notifications"
4. Set the scope to "Read and write" (needed for push notifications)
5. Copy the generated token (it starts with `expo_` - keep this secure!)

### 2. Set the Token in Supabase

You have two options:

#### Option A: Via Supabase Dashboard
1. Go to [https://supabase.com/dashboard/project/qzadqaglvnwxpfgsumec/settings/edge-functions](https://supabase.com/dashboard/project/qzadqaglvnwxpfgsumec/settings/edge-functions)
2. Go to the "Environment Variables" section
3. Click "Add new variable"
4. Set:
   - Name: `EXPO_ACCESS_TOKEN`
   - Value: `your_expo_access_token_here`
5. Click "Save"

#### Option B: Via Supabase CLI
```bash
# In your project directory:
npx supabase secrets set EXPO_ACCESS_TOKEN=your_expo_access_token_here --project-ref qzadqaglvnwxpfgsumec
```

### 3. Deploy the New Migration

Deploy the push_notifications table we just created:

```bash
# Deploy the new migration
npx supabase db push --project-ref qzadqaglvnwxpfgsumec
```

### 4. Redeploy Edge Functions (if needed)

If you modified the notifications-dispatcher function, redeploy it:

```bash
npx supabase functions deploy notifications-dispatcher --project-ref qzadqaglvnwxpfgsumec
```

## Verification

### Test Push Notifications
1. Open the app and go to Settings
2. Scroll down to "Push Testing" section (only visible for superadmin or in dev mode)
3. Enter a test title and message
4. Tap "Send Test Notification"
5. You should see a success message instead of the 400 error

### Check Database Tables
The following tables should exist and have data:
- `push_devices` - Contains registered push tokens for users
- `push_notifications` - Contains records of sent notifications

You can query these in the Supabase dashboard to verify:

```sql
-- Check if push devices are registered
SELECT count(*), platform, is_active 
FROM push_devices 
GROUP BY platform, is_active;

-- Check notification history
SELECT created_at, title, status, notification_type 
FROM push_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

## Current Status

✅ **Fixed Issues:**
- GlobalUpdateBanner is now displayed in the app layout
- push_devices table exists with correct schema  
- push_notifications table migration created
- Push token registration happens on login

⚠️ **Still Needs Setup:**
- EXPO_ACCESS_TOKEN environment variable in Supabase
- Deploy the new push_notifications table migration

## Troubleshooting

If you still get errors:

1. **403 Forbidden**: Check that your Expo token has the right permissions
2. **Invalid Token**: Regenerate the Expo access token
3. **Network Error**: Check your internet connection and Supabase status
4. **Database Error**: Verify the migrations were applied successfully

## Important Security Notes

- Never commit the EXPO_ACCESS_TOKEN to your code repository
- Keep the token secure and only share with authorized team members
- Rotate the token periodically for security best practices
- The token is stored securely in Supabase's encrypted environment variables

Once you complete these steps, both the update banner and push notifications should work correctly!