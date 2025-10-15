# WhatsApp Integration Architecture Guide

## 🏗️ Current Architecture Issue

### Problem: Single vs Multi-Tenant Phone Numbers

**Current Implementation:**
- Single `WHATSAPP_PHONE_NUMBER_ID` environment variable
- All schools send messages from the same WhatsApp Business number
- Parents receive messages from a central number regardless of their school

**Intended Design (from database schema):**
- Each school has their own WhatsApp number in `preschools.settings.whatsapp_number`
- Messages should come from school-specific numbers
- True multi-tenant WhatsApp integration

## 🔧 Immediate Fix (Shared Number Approach)

### Step 1: Update Environment Variables
```bash
# Use the provided script
./set-whatsapp-token.sh

# Or manually:
supabase secrets set WHATSAPP_ACCESS_TOKEN="your_new_meta_token"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id"
supabase functions deploy whatsapp-send
```

### Step 2: Configure in UI
In your teacher dashboard, the WhatsApp integration will:
- Show "Connected" if a contact exists in database
- Use the global phone number ID for all outgoing messages
- All schools will appear to message from your configured number

### How Parents See It:
```
From: +27 64 884 3832 (your configured number)
Message: "Hello Jane! This is Little Stars Preschool..."
```

## 🚀 Proper Multi-Tenant Solution (Future)

### Database Schema (Already Exists)
```sql
-- Each preschool stores their WhatsApp configuration
preschools.settings = {
  "whatsapp_number": "+27111234567",
  "whatsapp_business_id": "school_specific_id",
  "whatsapp_access_token": "encrypted_token_for_school"
}
```

### Proposed Edge Function Enhancement
```typescript
// Instead of single global token
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')

// Should be dynamic per school
async function getSchoolWhatsAppConfig(preschoolId: string) {
  const { data: school } = await supabase
    .from('preschools')
    .select('settings')
    .eq('id', preschoolId)
    .single()
    
  return {
    accessToken: school.settings?.whatsapp_access_token,
    phoneNumberId: school.settings?.whatsapp_phone_number_id,
    businessNumber: school.settings?.whatsapp_number
  }
}
```

### Benefits of Multi-Tenant Approach:
- ✅ **School Branding**: Messages come from school's own number
- ✅ **Parent Trust**: Parents recognize their school's number  
- ✅ **Compliance**: Each school manages their own Meta Business account
- ✅ **Scalability**: Independent WhatsApp limits per school
- ✅ **Flexibility**: Schools can customize templates and messaging

## 📋 Implementation Roadmap

### Phase 1 (Current - Quick Fix)
1. ✅ Fix 500 errors with updated token
2. ✅ All schools use shared WhatsApp number
3. ✅ System functional for testing and small deployments

### Phase 2 (Enhanced - Multi-Tenant)
1. 🔄 Add school WhatsApp configuration UI
2. 🔄 Encrypt and store per-school tokens in database
3. 🔄 Update Edge Function to use dynamic configurations
4. 🔄 Add school onboarding flow for WhatsApp Business setup

### Phase 3 (Advanced - Full Platform)
1. 🔄 WhatsApp template management per school
2. 🔄 Advanced analytics and message tracking
3. 🔄 Integration with other communication channels
4. 🔄 Parent communication preferences and automation

## 🎯 Current Status & Next Steps

### For Testing (Now):
1. **Set your Meta token** using `./set-whatsapp-token.sh`
2. **All schools will use your number** for testing
3. **Focus on core functionality** - messaging works end-to-end

### For Production (Later):
1. **Each school needs their own WhatsApp Business account**
2. **Implement dynamic phone number routing**
3. **Add school-specific configuration management**

## 💡 Recommendations

### For MVP/Testing:
- ✅ Use shared number approach (current fix)
- ✅ Focus on core messaging functionality
- ✅ Ensure parents understand messages come from "EduDash Pro on behalf of [School Name]"

### For Production Scale:
- 🎯 Implement per-school WhatsApp configuration
- 🎯 Add school onboarding flow for WhatsApp Business
- 🎯 Create admin panel for WhatsApp management

---

**Current Priority: Fix the 500 errors with your new token, then decide on long-term architecture based on your deployment needs.**
