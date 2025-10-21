# Email Sending Setup Guide

## Overview

EduDash Pro now supports sending emails through Dash AI using **Resend** as the email provider. This is a **high-security** feature with:
- ✅ User confirmation required before sending
- ✅ Role-based access (principals and teachers only)
- ✅ Rate limiting (50 emails/hour per organization)
- ✅ Full audit logging
- ✅ Test mode for development

## Prerequisites

1. **Resend Account** (https://resend.com)
   - Free tier: 100 emails/day
   - Paid plans available for higher volume

2. **Domain Verification** (Required for production)
   - You must verify your domain in Resend
   - Default sender: `noreply@edudashpro.com`
   - You can use your own domain (recommended)

## Setup Steps

### 1. Get Resend API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it: `edudashpro-production`
4. Permission: **Sending access**
5. Copy the API key (starts with `re_...`)

### 2. Verify Your Domain (Production Only)

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `edudashpro.com`)
4. Follow DNS verification steps
5. Wait for verification (usually 5-10 minutes)

### 3. Configure Supabase Secrets

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY="re_YOUR_API_KEY_HERE" \\
  --project-ref YOUR_PROJECT_REF

# Set FROM email (use your verified domain)
supabase secrets set FROM_EMAIL="noreply@yourdomain.com" \\
  --project-ref YOUR_PROJECT_REF

# Set environment (optional - defaults to 'production')
supabase secrets set ENVIRONMENT="production" \\
  --project-ref YOUR_PROJECT_REF

# Verify secrets are set
supabase secrets list --project-ref YOUR_PROJECT_REF
```

### 4. Run Database Migration

```bash
# Apply the email_logs table migration
supabase db push

# Verify table was created
supabase db inspect --project-ref YOUR_PROJECT_REF
```

### 5. Deploy Edge Function

```bash
# Deploy the send-email Edge Function
supabase functions deploy send-email \\
  --project-ref YOUR_PROJECT_REF \\
  --no-verify-jwt

# Check deployment
supabase functions list --project-ref YOUR_PROJECT_REF
```

### 6. Enable Tools in Dash AI

In `services/dash-ai/DashAICore.ts`, change:

```typescript
// Line 775
const ENABLE_TOOLS = true;  // Change from false to true
```

### 7. Test Email Sending

#### Development/Test Mode
If `RESEND_API_KEY` is not set or `ENVIRONMENT=development`, emails won't actually send but will be logged:

```bash
# In your app, ask Dash:
"Send a test email to test@example.com with subject 'Test' and body 'Hello'"
```

Expected response:
```
✅ TEST MODE: Email logged but not actually sent
Rate limit: 1/50 emails used this hour
```

#### Production Mode
Once API key is configured and domain verified:

```bash
# Ask Dash (requires user confirmation):
"Send an email to john@example.com with subject 'Welcome' and body 'Hello John!'"
```

Dash will:
1. Show confirmation prompt
2. After confirmation, send email via Resend
3. Return success with message ID
4. Log to `email_logs` table

## Architecture

### Security Model

```
┌─────────────┐
│   User      │ "Send email to..."
│  (Teacher/  │
│  Principal) │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Dash AI    │ Calls send_email tool
│   (Client)  │ (requiresConfirmation: true)
└──────┬──────┘
       │
       v
┌─────────────┐
│ DashTool    │ User confirms action
│  Registry   │
└──────┬──────┘
       │
       v
┌─────────────┐
│ send-email  │ 1. Authenticates user
│ Edge Func   │ 2. Checks permissions
│             │ 3. Checks rate limit
│             │ 4. Calls Resend API
│             │ 5. Logs to email_logs
└─────────────┘
```

### Rate Limiting

- **Limit**: 50 emails per hour per organization
- **Scope**: Organization-wide (not per-user)
- **Reset**: Rolling 1-hour window
- **Exceeded**: Returns 429 with rate_limit info

### Permissions

**Who can send emails:**
- ✅ `principal`
- ✅ `principal_admin`
- ✅ `superadmin`
- ✅ `teacher`

**Who cannot:**
- ❌ `parent`
- ❌ Unauthenticated users

### Audit Logging

All email attempts are logged to `email_logs` table:

```sql
SELECT 
  created_at,
  user_id,
  recipient,
  subject,
  status,  -- 'sent', 'failed', 'test_mode'
  message_id,
  error_message
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;
```

## Email Templates

### Basic Text Email

```typescript
// Ask Dash:
"Send an email to parent@example.com with subject 'Reminder' and message 'Don't forget the school event tomorrow!'"
```

### HTML Email

```typescript
// Ask Dash:
"Send an HTML email to teacher@example.com with subject 'Report' and body '<h1>Monthly Report</h1><p>See attached...</p>'"
```

### Multiple Recipients

```typescript
// Ask Dash:
"Send an email to parent1@example.com, parent2@example.com with subject 'Class Update' and message 'Important announcement...'"
```

## Troubleshooting

### Problem: "Unauthorized" Error

**Cause**: User not authenticated or insufficient permissions

**Solution**:
- Ensure user is logged in
- Check user role is principal/teacher/admin
- Verify Supabase auth session is active

### Problem: "Rate limit exceeded"

**Cause**: Organization sent >50 emails in past hour

**Solution**:
- Wait for rate limit window to reset
- Consider upgrading Resend plan for higher limits
- Check email_logs table for unexpected usage

### Problem: "TEST MODE" - Emails not actually sending

**Cause**: `RESEND_API_KEY` not configured or `ENVIRONMENT=development`

**Solution**:
```bash
# Set production API key
supabase secrets set RESEND_API_KEY="re_YOUR_KEY" --project-ref YOUR_REF

# Ensure environment is production
supabase secrets set ENVIRONMENT="production" --project-ref YOUR_REF

# Redeploy function
supabase functions deploy send-email --project-ref YOUR_REF --no-verify-jwt
```

### Problem: "Domain not verified"

**Cause**: Sending from unverified domain in Resend

**Solution**:
1. Go to https://resend.com/domains
2. Add and verify your domain
3. Update `FROM_EMAIL` secret to use verified domain
4. Redeploy Edge Function

### Problem: Email goes to spam

**Solutions**:
- Verify SPF, DKIM, and DMARC records in Resend dashboard
- Use a professional `FROM_EMAIL` (not gmail.com or personal domains)
- Include unsubscribe links for bulk emails
- Build sender reputation gradually

## Monitoring

### Check Email Logs

```sql
-- Recent emails
SELECT * FROM email_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Failed emails
SELECT * FROM email_logs 
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Usage by hour
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as emails_sent,
  COUNT(DISTINCT user_id) as unique_senders
FROM email_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Monitor Rate Limits

```sql
-- Current hour usage per organization
SELECT 
  organization_id,
  COUNT(*) as emails_sent_this_hour
FROM email_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY organization_id
ORDER BY emails_sent_this_hour DESC;
```

### Resend Dashboard

Monitor deliverability in Resend:
- https://resend.com/emails
- View sent/failed/bounced emails
- Check domain reputation
- Review bounce/complaint rates

## Cost Estimates

### Resend Pricing

| Plan | Price | Emails/Month | Rate |
|------|-------|--------------|------|
| Free | $0 | 3,000 | Free |
| Pro | $20/mo | 50,000 | $0.0004/email |
| Scale | $80/mo | 500,000 | $0.00016/email |

**For typical usage:**
- Small school (10 emails/day): **Free tier**
- Medium school (100 emails/day): **Pro plan** ($20/mo)
- Large school (500 emails/day): **Scale plan** ($80/mo)

## Best Practices

1. **Use Templates**: Create reusable email templates for common scenarios
2. **Personalization**: Include recipient name and context
3. **Opt-Out**: Respect unsubscribe requests
4. **Testing**: Use test mode in development
5. **Monitoring**: Regularly check email_logs for failures
6. **Domain Reputation**: Send consistently to build trust
7. **Confirmation**: Always require user confirmation for bulk emails

## Security Considerations

🔒 **Built-in Protections:**
- ✅ Authentication required
- ✅ Role-based access control
- ✅ Rate limiting per organization
- ✅ Explicit confirmation required
- ✅ Full audit trail
- ✅ RLS policies on email_logs
- ✅ Service role for Edge Function logging

⚠️ **Important Notes:**
- Never send passwords or sensitive data via email
- Use reply_to for two-way communication
- Monitor for abuse (check email_logs regularly)
- Consider adding daily limits for teachers

## Related Files

**Edge Function:**
- `supabase/functions/send-email/index.ts`

**Database:**
- `supabase/migrations/20251020141820_email_logs_table.sql`

**Tool Registration:**
- `services/modules/DashToolRegistry.ts` (line 310-389)

**System Prompt:**
- `services/dash-ai/DashAICore.ts` (lines 744-750)

## Support

For Resend-specific issues:
- Documentation: https://resend.com/docs
- Support: support@resend.com

For EduDash Pro integration issues:
- Check Supabase Edge Function logs
- Review email_logs table
- Verify tool execution in DashToolRegistry

---

**Last Updated**: October 20, 2025
**Feature Status**: ✅ Ready for production (after setup)
**Security Review**: ✅ Approved
