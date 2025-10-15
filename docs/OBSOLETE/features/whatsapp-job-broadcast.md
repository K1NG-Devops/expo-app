# WhatsApp Job Posting Broadcast Feature

## Overview
This feature enables schools to broadcast job postings via WhatsApp to their opted-in contact list immediately after creating a job posting. This is part of the multi-channel job distribution strategy for the Hiring Hub.

## Implementation Date
October 2, 2025

## Components Modified

### 1. Frontend: Job Posting Creation Screen
**File:** `app/screens/job-posting-create.tsx`

#### Changes Made
- Added `handleWhatsAppShare()` function to format and send job postings via WhatsApp
- Modified success flow after job creation to prompt user with WhatsApp sharing option
- Integrated with WhatsApp broadcast API endpoint

#### Key Features
- **Smart Message Formatting**: Automatically formats job details into WhatsApp-friendly message:
  - Job title
  - Employment type (Full-Time, Part-Time, Contract)
  - Location
  - Salary range
  - Application link
  - Professional branding

- **User Confirmation**: After successful job posting creation, users receive an alert with two options:
  - "Share on WhatsApp" - Broadcasts to all opted-in contacts
  - "Not Now" - Returns to previous screen without broadcasting

- **Error Handling**: Graceful fallback if broadcast fails, allowing manual sharing

#### Message Format Example
```
🎓 *New Teaching Opportunity!*

*Position:* Early Childhood Teacher
*Type:* Full-Time
*Location:* Cape Town, South Africa
*Salary:* R15000 - R20000

📝 *Apply Now:* https://edudashpro.app/jobs/[job-id]/apply

Posted via EduDash Pro Hiring Hub
```

### 2. Backend: WhatsApp Send Edge Function
**File:** `supabase/functions/whatsapp-send/index.ts`

#### Changes Made
- Extended `SendMessageRequest` interface to support broadcast mode
- Added `broadcastMessage()` function for multi-recipient messaging
- Integrated with `job_distributions` table for tracking

#### New Interface Properties
```typescript
interface SendMessageRequest {
  // ... existing properties
  broadcast?: boolean          // Enable broadcast mode
  preschool_id?: string        // School ID for contact filtering
  job_posting_id?: string      // Track distribution by job
}
```

#### Broadcast Function Logic
1. **Contact Retrieval**: Queries `whatsapp_contacts` table filtered by:
   - `preschool_id` matches the school
   - `consent_status = 'opted_in'` (GDPR/POPIA compliance)

2. **Parallel Sending**: Uses `Promise.allSettled()` to send messages to all contacts concurrently
   - Non-blocking: failures don't stop other messages
   - Each contact gets individual message (not group chat)

3. **Results Tracking**: Returns detailed statistics:
   - Total contacts found
   - Successfully sent count
   - Failed count
   - Individual results per contact

4. **Distribution Tracking**: Updates `job_distributions` table with actual recipient count

#### API Response Format
```json
{
  "success": true,
  "broadcast": true,
  "sent_count": 45,
  "failed_count": 2,
  "total_contacts": 47,
  "results": [
    {
      "contact_id": "uuid",
      "status": "fulfilled",
      "success": true,
      "phone": "+27..."
    }
  ]
}
```

### 3. Service Layer: HiringHubService
**File:** `lib/services/HiringHubService.ts`

#### New Method: `trackJobDistribution()`

Tracks job distribution events across all channels (WhatsApp, email, SMS, social media, public board).

```typescript
static async trackJobDistribution(data: {
  job_posting_id: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'social_media' | 'public_board';
  distributed_by: string;
  recipients_count?: number;
  metadata?: Record<string, any>;
}): Promise<void>
```

**Purpose:**
- Analytics: Track which distribution channels are most effective
- Compliance: Maintain audit trail of all job posting communications
- Optimization: Identify best times/channels for job distribution

**Database Schema:**
Uses the `job_distributions` table (created in migration `20251001223000_add_geolocation_to_hiring_hub.sql`):

```sql
CREATE TABLE job_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'social_media', 'public_board')),
  distributed_by UUID NOT NULL REFERENCES auth.users(id),
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  recipients_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

## User Flow

### Happy Path
1. Principal creates a new job posting through the form
2. Validates and submits the form
3. Job posting is saved to database successfully
4. Alert appears: "Job Posted Successfully! 🎉"
5. Principal clicks "Share on WhatsApp"
6. Backend broadcasts message to all opted-in contacts
7. Success confirmation: "Job posting has been shared via WhatsApp to your contact list."
8. Returns to previous screen

### Alternative Path (No Sharing)
1-4. Same as happy path
5. Principal clicks "Not Now"
6. Returns to previous screen immediately

### Error Path
1-4. Same as happy path
5. Principal clicks "Share on WhatsApp"
6. Broadcast fails (network, credentials, etc.)
7. Alert: "Could not share job posting via WhatsApp. You can still share it manually."
8. Returns to previous screen

## Privacy & Compliance

### GDPR/POPIA Compliance
- **Opt-In Required**: Only contacts with `consent_status = 'opted_in'` receive broadcasts
- **Audit Trail**: All distributions tracked in `job_distributions` table
- **Unsubscribe**: Contacts can opt-out anytime (handled by existing WhatsApp contact management)

### Data Protection
- Phone numbers never exposed to frontend
- Messages sent individually (no group chats revealing contact lists)
- Application links are public but job applications require authentication

## Technical Considerations

### Rate Limiting
- WhatsApp Business API has rate limits (typically 1000 messages/second)
- Current implementation uses `Promise.allSettled()` for parallel sending
- **Future Enhancement**: Implement batching for schools with >1000 contacts

### Cost Implications
- **WhatsApp Business API Pricing**: ~$0.005-0.01 per message (varies by region)
- **Example Cost**: 50 contacts = ~$0.50 per job posting broadcast
- Schools should be aware of costs for large contact lists

### Error Handling
- Network failures: Gracefully handled with user-friendly error messages
- Individual send failures: Logged but don't block entire broadcast
- Missing credentials: Returns clear error with setup instructions

## Testing Checklist

### Frontend Testing
- [ ] Job posting creation without WhatsApp share
- [ ] Job posting creation with WhatsApp share (success)
- [ ] Job posting creation with WhatsApp share (failure)
- [ ] Message formatting with various job details
- [ ] Message formatting with missing optional fields

### Backend Testing
- [ ] Broadcast to 1 contact
- [ ] Broadcast to multiple contacts (10+)
- [ ] Broadcast with no opted-in contacts
- [ ] Broadcast with invalid preschool_id
- [ ] Broadcast with missing WhatsApp credentials
- [ ] Distribution tracking updates recipient count

### Integration Testing
- [ ] End-to-end: Create job → Share → Verify contacts received message
- [ ] Verify distribution recorded in database
- [ ] Verify only opted-in contacts receive messages
- [ ] Verify application links work correctly

## Future Enhancements

### Phase 2: Advanced Distribution
- **Scheduled Broadcasting**: Allow posting creation now, broadcast later
- **Template Support**: Use approved WhatsApp message templates for compliance
- **Rich Media**: Include school logo or job images in broadcasts
- **Segmentation**: Target specific contact types (teachers only, parents, etc.)

### Phase 3: Analytics
- **Click Tracking**: Monitor application link clicks from WhatsApp
- **Conversion Metrics**: Track applications originated from WhatsApp
- **A/B Testing**: Test different message formats for effectiveness
- **Best Time Analysis**: Identify optimal broadcast times

### Phase 4: Two-Way Communication
- **Reply Handling**: Process questions from candidates via WhatsApp
- **Dash AI Integration**: Automated responses to common questions
- **Interview Scheduling**: Schedule interviews directly through WhatsApp

## Related Documentation
- [Hiring Hub Geo-Location Strategy](./hiring-hub-geolocation.md)
- [WhatsApp Architecture Guide](../integration/WHATSAPP_ARCHITECTURE_GUIDE.md)
- [Job Distribution Channels](./job-distribution-channels.md)

## Database Migration
This feature relies on the database schema created in:
- `supabase/migrations/20251001223000_add_geolocation_to_hiring_hub.sql`

Specifically the `job_distributions` table and related indexes.

## Environment Variables Required
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key for frontend
- `EXPO_PUBLIC_APP_WEB_URL`: Base URL for application links (default: https://edudashpro.app)
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp Business API access token (edge function)
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp Business phone number ID (edge function)

## Security Notes
- Frontend only sends broadcast request; backend handles all contact lookups
- Authorization header ensures only authenticated users can trigger broadcasts
- RLS policies on `job_distributions` prevent cross-school data access
- Phone numbers never exposed in API responses to frontend
