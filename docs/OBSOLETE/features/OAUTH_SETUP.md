# OAuth Provider Setup Guide

This guide explains how to set up social authentication (Google, Microsoft, Apple) for the EduDash Pro application.

## Quick Start

The Supabase configuration has been updated to support social authentication, but you need to obtain OAuth credentials from each provider and update the environment variables.

## Current Status

✅ **Configured**: Supabase config files updated with OAuth provider settings
✅ **Environment**: Template `.env.local` file created
❌ **Credentials**: You need to obtain actual OAuth app credentials

## Step 1: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - `http://127.0.0.1:54321/auth/v1/callback` (for local development)
   - `https://your-project.supabase.co/auth/v1/callback` (for production)
7. Copy the Client ID and Client Secret to your `.env.local`:
   ```env
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-actual-google-client-secret
   ```

## Step 2: Microsoft Azure OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Set the redirect URI to:
   - `http://127.0.0.1:54321/auth/v1/callback` (for local development)
   - `https://your-project.supabase.co/auth/v1/callback` (for production)
5. After registration, go to "Certificates & secrets" → "New client secret"
6. Copy the Application (client) ID and the secret value to your `.env.local`:
   ```env
   SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID=your-actual-azure-app-id
   SUPABASE_AUTH_EXTERNAL_AZURE_SECRET=your-actual-azure-client-secret
   ```

## Step 3: Apple OAuth Setup (Optional)

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles" → "Keys"
3. Create a new key with "Sign in with Apple" capability
4. Download the key file and note the Key ID
5. Configure in your `.env.local`:
   ```env
   SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=your-apple-key-content
   ```

## Step 4: Test the Setup

1. Restart your Supabase local development server:
   ```bash
   supabase stop
   supabase start
   ```

2. Test social authentication in your app
3. Check the Supabase logs for any authentication errors:
   ```bash
   supabase logs -f
   ```

## Troubleshooting

### "Provider is not enabled" Error

This error occurs when:
- OAuth credentials are not properly configured
- The provider is disabled in Supabase config
- Environment variables are not loaded correctly

**Solution**: Verify that:
1. The provider is enabled in `supabase/config.toml`
2. Environment variables are properly set in `.env.local`
3. Supabase service has been restarted after config changes

### "Invalid redirect URI" Error

This happens when the redirect URI doesn't match what's configured in the OAuth provider.

**Solution**: Ensure redirect URIs match exactly:
- Local: `http://127.0.0.1:54321/auth/v1/callback`
- Production: `https://your-project.supabase.co/auth/v1/callback`

### Testing Without Real OAuth Apps

For development and testing, you can:
1. Use the improved error messages that now show user-friendly notifications
2. Focus on email/password authentication first
3. Set up OAuth providers when ready for production

## Next Steps

After setting up OAuth:
1. Test all social login flows
2. Configure production redirect URIs for your live Supabase project
3. Update client-side OAuth button states based on available providers
4. Consider adding OAuth provider availability checks in the UI

## Security Notes

- Never commit real OAuth secrets to version control
- Use environment variables for all sensitive credentials
- Regularly rotate OAuth client secrets
- Monitor OAuth usage in provider dashboards