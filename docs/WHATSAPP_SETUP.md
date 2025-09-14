# WhatsApp Business API Setup Guide

This guide helps you set up WhatsApp Business API integration for EduDash Pro.

## Prerequisites

1. **WhatsApp Business Account**: You need a verified WhatsApp Business Account
2. **Facebook Developer Account**: Required to access WhatsApp Business API
3. **Phone Number**: A dedicated phone number for your WhatsApp Business

## Setup Steps

### 1. Create WhatsApp Business App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app and select "Business" as the app type
3. Add "WhatsApp" product to your app
4. Complete the app review process

### 2. Get Required Credentials

After setting up your WhatsApp Business app, you'll need these values:

```bash
# WhatsApp Business Cloud API Credentials
EXPO_PUBLIC_WHATSAPP_ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_ID"
EXPO_PUBLIC_WHATSAPP_BUSINESS_ACCOUNT_ID="YOUR_BUSINESS_ACCOUNT_ID"
EXPO_PUBLIC_WHATSAPP_APP_ID="YOUR_APP_ID"
EXPO_PUBLIC_WHATSAPP_APP_SECRET="YOUR_APP_SECRET"

# Webhook Configuration
EXPO_PUBLIC_WHATSAPP_WEBHOOK_VERIFY_TOKEN="YOUR_VERIFY_TOKEN"

# API Configuration (optional)
EXPO_PUBLIC_WHATSAPP_BASE_URL="https://graph.facebook.com"
EXPO_PUBLIC_WHATSAPP_API_VERSION="v18.0"

# Feature Flags (optional)
EXPO_PUBLIC_WHATSAPP_ENABLE_TEMPLATES="true"
EXPO_PUBLIC_WHATSAPP_ENABLE_MEDIA="true"
EXPO_PUBLIC_WHATSAPP_ENABLE_INTERACTIVE="true"
```

### 3. Add to Environment Files

Add these variables to your environment files:

#### Development (.env.local)
```bash
# WhatsApp Business API - Development
EXPO_PUBLIC_WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxxxx"
EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID="1234567890"
EXPO_PUBLIC_WHATSAPP_BUSINESS_ACCOUNT_ID="1234567890"
EXPO_PUBLIC_WHATSAPP_APP_ID="1234567890"
EXPO_PUBLIC_WHATSAPP_APP_SECRET="xxxxxxxxxxxxxxx"
EXPO_PUBLIC_WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_secure_verify_token"
```

#### Production (.env.production)
```bash
# WhatsApp Business API - Production
EXPO_PUBLIC_WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxxxx"
EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID="1234567890"
EXPO_PUBLIC_WHATSAPP_BUSINESS_ACCOUNT_ID="1234567890"
EXPO_PUBLIC_WHATSAPP_APP_ID="1234567890"
EXPO_PUBLIC_WHATSAPP_APP_SECRET="xxxxxxxxxxxxxxx"
EXPO_PUBLIC_WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_secure_verify_token"
```

## Finding Your Credentials

### Access Token
1. Go to your WhatsApp Business app in Facebook Developers
2. Navigate to WhatsApp > Getting Started
3. Generate a temporary access token (24 hours)
4. For production, create a permanent token using system users

### Phone Number ID
1. In WhatsApp > Getting Started
2. Look for "From" dropdown
3. The Phone Number ID is shown next to your phone number

### Business Account ID
1. In WhatsApp > Getting Started
2. Look for "Business Account" in the sidebar
3. Copy the Business Account ID

### App ID and App Secret
1. Go to Settings > Basic in your Facebook app
2. App ID is at the top
3. App Secret is shown below (click "Show")

## Webhook Setup

For receiving messages, set up a webhook:

1. Create an endpoint: `https://your-domain.com/api/webhooks/whatsapp`
2. Configure webhook URL in WhatsApp settings
3. Set the verify token to match your `EXPO_PUBLIC_WHATSAPP_WEBHOOK_VERIFY_TOKEN`

## Testing Configuration

Test your WhatsApp integration:

```typescript
import { whatsAppService } from '@/lib/services/WhatsAppBusinessService';

// Test connection
const testResult = await whatsAppService.testConnection();
console.log('WhatsApp API Status:', testResult);

// Send test message
const result = await whatsAppService.sendTextMessage(
  '+27821234567', // South African format
  'Hello from EduDash Pro! 🎓'
);

console.log('Message sent:', result);
```

## Usage Examples

### Send Welcome Message to Parent
```typescript
import { whatsAppService } from '@/lib/services/WhatsAppBusinessService';

const sendWelcomeMessage = async (parentPhone: string, childName: string) => {
  const message = `Welcome to EduDash Pro! 🎓\n\nYour child ${childName} has been enrolled successfully. You'll receive updates about their progress, homework, and school activities through WhatsApp.\n\nReply STOP to unsubscribe.`;
  
  const result = await whatsAppService.sendTextMessage(parentPhone, message);
  return result;
};
```

### Send Assignment Notification
```typescript
const notifyAssignment = async (parentPhone: string, childName: string, subject: string, dueDate: string) => {
  const result = await whatsAppService.sendTemplateMessage(
    parentPhone,
    'assignment_notification', // Template name (must be pre-approved)
    'en',
    [
      { text: childName },
      { text: subject },
      { text: dueDate }
    ]
  );
  return result;
};
```

### Send Interactive Menu
```typescript
const sendMenuOptions = async (parentPhone: string) => {
  const result = await whatsAppService.sendButtonMessage(
    parentPhone,
    '📚 EduDash Pro',
    'What would you like to do today?',
    'Powered by EduDash Pro',
    [
      { id: 'view_progress', title: 'View Progress' },
      { id: 'homework_help', title: 'Homework Help' },
      { id: 'contact_teacher', title: 'Contact Teacher' }
    ]
  );
  return result;
};
```

## Compliance and Best Practices

### Message Templates
- All promotional messages must use pre-approved templates
- Templates must be submitted for WhatsApp review
- Use session messages for responses within 24 hours

### Rate Limits
- Start with 250 messages per day
- Rate limits increase based on phone number quality rating
- Monitor rate limit headers in API responses

### Privacy
- Always include opt-out instructions
- Store consent preferences
- Respect user preferences for message types

### South African Compliance
- Include business registration details in welcome messages
- Comply with POPIA (Protection of Personal Information Act)
- Provide clear privacy policy links

## Troubleshooting

### Common Issues

1. **"Phone number not registered"**
   - Verify phone number in WhatsApp Business Manager
   - Ensure phone number is connected to your Business Account

2. **"Access token invalid"**
   - Regenerate access token
   - Check token permissions and expiry

3. **"Template not found"**
   - Submit template for approval in Business Manager
   - Wait for approval before using

4. **"Rate limit exceeded"**
   - Implement exponential backoff
   - Spread messages over time
   - Check phone number quality rating

### Support
- WhatsApp Business API Documentation: https://developers.facebook.com/docs/whatsapp
- Facebook Developer Community: https://developers.facebook.com/community/
- EduDash Pro Support: support@edudash.pro

## Security Considerations

1. **Keep credentials secure**:
   - Never commit credentials to version control
   - Use environment variables
   - Rotate access tokens regularly

2. **Webhook security**:
   - Always verify webhook signatures
   - Use HTTPS endpoints only
   - Validate incoming payloads

3. **User data**:
   - Hash phone numbers for database storage
   - Encrypt sensitive message content
   - Implement proper access controls

## Production Checklist

- [ ] Business verification completed
- [ ] Phone number verified and approved
- [ ] Message templates approved
- [ ] Webhook endpoint configured with HTTPS
- [ ] Rate limiting implemented
- [ ] Error handling and logging set up
- [ ] Compliance requirements met
- [ ] Testing completed with real devices
- [ ] Monitoring and analytics configured