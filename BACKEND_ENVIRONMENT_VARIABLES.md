# Backend Environment Variables Guide 🔒

This document lists all server-side environment variables needed for EduDashPro backend services.

> ⚠️ **CRITICAL SECURITY WARNING**: These are server-side secrets that should NEVER be committed to git or exposed to clients!

## 🛠️ Supabase Edge Functions

### Required for ALL Functions
```bash
# Automatically provided by Supabase runtime
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

### Service Role Key (High Privilege)
```bash
# Used for bypassing RLS and admin operations
# Set in Supabase Dashboard > Settings > API > service_role secret
SERVICE_ROLE_KEY=your_service_role_key_here
# Alternative name used in some functions:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🤖 AI Gateway Function (`supabase/functions/ai-gateway/`)

### Anthropic Claude API
```bash
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Optional: Default model override
ANTHROPIC_MODEL_DEFAULT=claude-3-5-sonnet-20241022
```

**Where to get**: [Anthropic Console](https://console.anthropic.com/)
**Pricing**: Pay-per-use based on tokens
**Models supported**: claude-3-haiku, claude-3-sonnet, claude-3-opus

## 📱 WhatsApp Functions

### WhatsApp Send Function (`supabase/functions/whatsapp-send/`)
```bash
# Required: WhatsApp Cloud API access token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here

# Required: Your WhatsApp phone number ID
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here

# Optional: Meta API version (defaults to v19.0)
META_API_VERSION=v19.0
```

### WhatsApp Webhook Function (`supabase/functions/whatsapp-webhook/`)
```bash
# Required: Same as whatsapp-send
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

**Where to get**: [Meta for Developers](https://developers.facebook.com/apps/)
1. Create a Facebook App
2. Add WhatsApp Business Platform product
3. Get access token and phone number ID

## 🔔 Notifications Dispatcher (`supabase/functions/notifications-dispatcher/`)

### Expo Push Notifications
```bash
# Required: Expo access token for push notifications
EXPO_ACCESS_TOKEN=your_expo_access_token_here
```

**Where to get**: [Expo Dashboard](https://expo.dev/)
1. Go to your project settings
2. Generate an access token with push notification permissions

### Email Notifications (Optional)
```bash
# Email service configuration (if using custom email provider)
EMAIL_SERVICE_API_KEY=your_email_service_api_key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

## 💰 Payment Functions

### PayFast Webhook (`supabase/functions/payfast-webhook/`)
```bash
# Required: PayFast merchant credentials
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase

# Optional: Test mode
PAYFAST_SANDBOX_MODE=true
```

### RevenueCat Webhook (`supabase/functions/revenuecat-webhook/`)
```bash
# Required: RevenueCat webhook authentication
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

### Payment Bridge (`supabase/functions/payments-create-checkout/`)
```bash
# Required: Payment gateway credentials
PAYMENT_GATEWAY_SECRET_KEY=your_payment_secret_key
PAYMENT_GATEWAY_WEBHOOK_SECRET=your_webhook_secret
```

## 🎤 Audio Transcription (`supabase/functions/transcribe-audio/`)

### Speech-to-Text Service
```bash
# Option 1: OpenAI Whisper API
OPENAI_API_KEY=sk-your-openai-api-key

# Option 2: Google Cloud Speech-to-Text
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Option 3: Azure Cognitive Services
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_region
```

## 📊 Analytics & Monitoring

### System Monitoring
```bash
# Optional: Custom analytics endpoint
ANALYTICS_ENDPOINT=https://your-analytics-service.com/api
ANALYTICS_API_KEY=your_analytics_api_key

# Optional: Performance monitoring
APM_SERVICE_URL=https://your-apm-service.com
APM_SECRET_TOKEN=your_apm_token
```

## 🗄️ External Database Connections (if needed)

### Additional Database Services
```bash
# If connecting to external services
EXTERNAL_DB_CONNECTION_STRING=postgresql://user:pass@host:port/db
REDIS_URL=redis://user:pass@host:port
```

## 🔐 Security Configuration

### JWT & Auth Tokens
```bash
# Custom JWT secrets (if not using Supabase auth exclusively)
JWT_SECRET=your-super-secret-jwt-key
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# API rate limiting
RATE_LIMIT_SECRET=your-rate-limit-secret
```

## 🛡️ How to Set Environment Variables

### In Supabase Dashboard:
1. Go to **Settings** → **Edge Functions**
2. Click **Environment Variables**
3. Add each variable with its value
4. Deploy your functions

### Using Supabase CLI:
```bash
# Set a single variable
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key

# Set multiple variables from file
supabase secrets set --from-file .env.secrets
```

### Environment File Template (`.env.secrets`):
```bash
# Create this file locally, add your secrets, then use:
# supabase secrets set --from-file .env.secrets
# DO NOT commit this file!

SERVICE_ROLE_KEY=eyJ...your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
EXPO_ACCESS_TOKEN=your-expo-token
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret
```

## 🔍 Environment Variable Checklist

### Essential (App won't work without these):
- [ ] `SERVICE_ROLE_KEY` - For database operations
- [ ] `ANTHROPIC_API_KEY` - For AI features
- [ ] `EXPO_ACCESS_TOKEN` - For push notifications

### WhatsApp Integration:
- [ ] `WHATSAPP_ACCESS_TOKEN` - For WhatsApp messaging
- [ ] `WHATSAPP_PHONE_NUMBER_ID` - For WhatsApp phone number

### Payment Processing:
- [ ] `PAYFAST_MERCHANT_ID` - For PayFast payments
- [ ] `PAYFAST_MERCHANT_KEY` - For PayFast authentication
- [ ] `REVENUECAT_WEBHOOK_SECRET` - For subscription webhooks

### Optional Features:
- [ ] `PAYFAST_PASSPHRASE` - Enhanced PayFast security
- [ ] `META_API_VERSION` - WhatsApp API version
- [ ] `EMAIL_SERVICE_API_KEY` - Custom email notifications

## ⚠️ Security Best Practices

1. **Never commit secrets to git** - Use `.gitignore` for any files containing secrets
2. **Rotate keys regularly** - Especially API keys and tokens
3. **Use least privilege** - Only grant necessary permissions
4. **Monitor usage** - Track API calls and costs
5. **Separate environments** - Different secrets for dev/staging/production
6. **Backup secrets securely** - Store in a password manager or secure vault

## 🆘 Troubleshooting

### Common Issues:

**Function fails with "API key not found":**
- Check environment variable name spelling
- Verify the secret is set in Supabase dashboard
- Redeploy the function after setting variables

**WhatsApp messages not sending:**
- Verify `WHATSAPP_ACCESS_TOKEN` is valid
- Check `WHATSAPP_PHONE_NUMBER_ID` format
- Ensure WhatsApp Business account is verified

**Push notifications not working:**
- Verify `EXPO_ACCESS_TOKEN` has correct permissions
- Check Expo project ID matches your configuration

### Getting Help:
1. Check Supabase function logs
2. Verify all required environment variables are set
3. Test API keys independently using curl/Postman
4. Review function deployment logs

---

**🔒 Remember: These environment variables contain sensitive credentials. Keep them secure!**