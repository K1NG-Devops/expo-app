# Update WhatsApp Environment Variables

## Required Environment Variables for whatsapp-send Function:

### 1. WHATSAPP_ACCESS_TOKEN
- **Description**: Your new access token from Meta Business
- **Required**: Yes
- **Current Status**: ❌ Needs to be updated with your new token

### 2. WHATSAPP_PHONE_NUMBER_ID  
- **Description**: Phone Number ID from Meta Business Manager
- **Required**: Yes
- **Current Status**: ❓ May need verification

### 3. SERVICE_ROLE_KEY
- **Description**: Supabase service role key for database access
- **Required**: Yes (for bypassing RLS)
- **Current Status**: ✅ Should be set already

### 4. META_API_VERSION
- **Description**: WhatsApp API version
- **Required**: No (defaults to 'v19.0')
- **Current Status**: ✅ Can use default

## Steps to Update:

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/settings/edge-functions
2. Click on "Environment Variables"
3. Update/Add these variables:
   - `WHATSAPP_ACCESS_TOKEN` = your_new_meta_token
   - `WHATSAPP_PHONE_NUMBER_ID` = your_phone_number_id

### Option 2: Via CLI Commands
```bash
# Set new WhatsApp access token
supabase secrets set WHATSAPP_ACCESS_TOKEN=your_new_token_here

# Set phone number ID (if needed)
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Redeploy function to use new variables
supabase functions deploy whatsapp-send
```

## Where to Find Your Meta Credentials:

### Access Token:
1. Go to: https://developers.facebook.com/apps/
2. Select your WhatsApp Business app
3. Go to "WhatsApp" → "API Setup" 
4. Copy the "Temporary access token" (or generate permanent one)

### Phone Number ID:
1. In the same WhatsApp API Setup page
2. Look for "Phone number ID" under your test phone number
3. Copy the numeric ID (not the phone number itself)

## Example Values:
```bash
WHATSAPP_ACCESS_TOKEN=EAAg...very_long_token_here
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```
