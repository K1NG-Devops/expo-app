# Invoice Notification Preferences Feature

This document provides a comprehensive guide to the Invoice Notification Preferences feature implementation.

## 🎯 Feature Overview

The Invoice Notification Preferences feature allows users to:
- **Configure notification preferences** for invoice-related events (new invoice, sent, overdue, paid, viewed)
- **Upload and manage digital signatures** that can be included in email notifications
- **Test notifications** to verify settings work correctly
- **Role-based customization** with appropriate defaults for parents, teachers, and principals

## 📋 Table of Contents

- [Database Setup](#database-setup)
- [Backend Services](#backend-services)
- [Frontend Implementation](#frontend-implementation)
- [Deployment Guide](#deployment-guide)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Security Considerations](#security-considerations)

## 🗄️ Database Setup

### Migration Files

Run these migration files in order:

1. **`20250918_add_invoice_notification_preferences.sql`**
   - Adds notification preferences columns to profiles table
   - Creates JSONB index for efficient queries
   - Sets up RLS policies

2. **`20250918_create_signatures_storage_bucket.sql`**
   - Creates private storage bucket for digital signatures
   - Sets up storage policies restricting access to user's own files

3. **`20250918_add_merge_notification_prefs_function.sql`**
   - Creates RPC function for safe JSONB merging
   - Includes deep merge functionality for nested updates

### Running Migrations

```bash
# Apply migrations to your database
supabase migration up

# Or run them individually
psql -d your_database -f supabase/migrations/20250918_add_invoice_notification_preferences.sql
psql -d your_database -f supabase/migrations/20250918_create_signatures_storage_bucket.sql
psql -d your_database -f supabase/migrations/20250918_add_merge_notification_prefs_function.sql
```

### Database Schema

After migrations, the `profiles` table will have these new columns:

```sql
-- Notification preferences stored as JSONB
invoice_notification_preferences JSONB NOT NULL DEFAULT '{...}';

-- Digital signature metadata
signature_url TEXT;
signature_public_id TEXT;
signature_updated_at TIMESTAMPTZ DEFAULT NOW();
```

## 🔧 Backend Services

### ProfileSettingsService

The main service for managing preferences and signatures:

```typescript
import ProfileSettingsService from '@/lib/services/profileSettingsService';

// Get user's notification settings
const settings = await ProfileSettingsService.getInvoiceNotificationSettings();

// Update preferences
await ProfileSettingsService.updateInvoiceNotificationPreferences({
  preferences: {
    events: {
      new_invoice: { email: true, push: false }
    }
  }
});

// Upload signature
const signature = await ProfileSettingsService.uploadSignature(localFileUri);

// Send test notification
await ProfileSettingsService.sendTestNotification({
  event: 'new_invoice',
  channel: 'email'
});
```

### InvoiceService Integration

The existing `InvoiceService` now automatically triggers notifications:

```typescript
// These methods now automatically send notifications:
await InvoiceService.createInvoice(data);      // → new_invoice
await InvoiceService.sendInvoiceEmail(id);     // → invoice_sent
await InvoiceService.markAsPaid(id);           // → payment_confirmed
await InvoiceService.updateInvoice({           // → overdue_reminder (if status = 'overdue')
  id,
  status: 'overdue'
});
await InvoiceService.getInvoiceById(id);       // → invoice_viewed
```

### Notifications Dispatcher

The edge function automatically:
- **Resolves recipients** based on invoice relationships and user roles
- **Filters by user preferences** (respects event/channel toggles)
- **Includes digital signatures** in emails when enabled
- **Tracks analytics** for sent/skipped notifications
- **Handles test notifications** for preference verification

## 🎨 Frontend Implementation

### React Query Hooks

Use the provided hooks for UI state management:

```typescript
import {
  useInvoiceNotificationSettings,
  useUpdateInvoiceNotificationSettings,
  useSignatureUpload,
  useSignatureDelete,
  useTestNotification,
} from '@/lib/hooks/useProfileSettings';

function NotificationSettingsUI() {
  const { data: settings, isLoading } = useInvoiceNotificationSettings();
  const updateMutation = useUpdateInvoiceNotificationSettings();
  const uploadMutation = useSignatureUpload();
  
  const toggleNotification = (event: string, channel: string, enabled: boolean) => {
    updateMutation.mutate({
      preferences: {
        events: {
          [event]: { [channel]: enabled }
        }
      }
    });
  };

  // ... UI implementation
}
```

### Settings Component Example

```typescript
import React from 'react';
import { View, Text, Switch } from 'react-native';
import {
  useInvoiceNotificationSettings,
  useUpdateInvoiceNotificationSettings,
} from '@/lib/hooks/useProfileSettings';

export function InvoiceNotificationSettings() {
  const { data, isLoading } = useInvoiceNotificationSettings();
  const updateMutation = useUpdateInvoiceNotificationSettings();

  if (isLoading) return <Text>Loading...</Text>;

  const togglePreference = (path: string, value: boolean) => {
    const pathParts = path.split('.');
    const update = pathParts.reduceRight((acc, key, index) => {
      return index === pathParts.length - 1 
        ? { [key]: value }
        : { [key]: acc };
    }, {} as any);

    updateMutation.mutate({ preferences: update });
  };

  return (
    <View>
      <Text>Invoice Notifications</Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>New Invoice (Email)</Text>
        <Switch
          value={data?.preferences.events.new_invoice.email}
          onValueChange={(value) => togglePreference('events.new_invoice.email', value)}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Overdue Reminders (Email)</Text>
        <Switch
          value={data?.preferences.events.overdue_reminder.email}
          onValueChange={(value) => togglePreference('events.overdue_reminder.email', value)}
        />
      </View>

      {/* Add more controls as needed */}
    </View>
  );
}
```

## 🚀 Deployment Guide

### 1. Database Migration

```bash
# Run all migrations
supabase migration up

# Verify migrations applied correctly
supabase db diff
```

### 2. Edge Function Deployment

```bash
# Deploy the enhanced notifications-dispatcher
supabase functions deploy notifications-dispatcher

# Verify function is working
supabase functions invoke notifications-dispatcher --data '{"test":true,"event_type":"new_invoice","channel":"email","target_user_id":"YOUR_USER_ID"}'
```

### 3. Frontend Deployment

1. Update your app's dependencies if needed
2. Build and deploy your mobile/web app
3. Test the settings UI in your staging environment

### 4. Feature Flag (Optional)

Gate the feature behind a feature flag for controlled rollout:

```typescript
// In your settings screen
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

function SettingsScreen() {
  const { data: showInvoiceNotifications } = useFeatureFlag('invoice-notifications');
  
  return (
    <View>
      {/* Other settings */}
      
      {showInvoiceNotifications && (
        <InvoiceNotificationSettings />
      )}
    </View>
  );
}
```

## 💡 Usage Examples

### Role-Based Customization

```typescript
import { useUserRole } from '@/lib/hooks/useProfileSettings';
import { getRoleBasedDefaults } from '@/lib/types/profile';

function RoleAwareSettings() {
  const { data: role } = useUserRole();
  const roleDefaults = getRoleBasedDefaults(role || 'parent');
  
  // Customize UI based on role
  if (role === 'parent') {
    // Show parent-focused notifications (new invoices, overdue, payments)
  } else if (role === 'principal') {
    // Show digest options for principals
  }
}
```

### Testing Notifications

```typescript
import { useTestNotification } from '@/lib/hooks/useProfileSettings';

function TestNotificationButton() {
  const testMutation = useTestNotification();
  
  const sendTest = () => {
    testMutation.mutate({
      event: 'new_invoice',
      channel: 'email'
    });
  };
  
  return (
    <Button 
      onPress={sendTest}
      disabled={testMutation.isPending}
      title={testMutation.isPending ? 'Sending...' : 'Send Test'}
    />
  );
}
```

### Signature Management

```typescript
import * as ImagePicker from 'expo-image-picker';
import { useSignatureUpload, useSignatureDelete } from '@/lib/hooks/useProfileSettings';

function SignatureManager() {
  const uploadMutation = useSignatureUpload();
  const deleteMutation = useSignatureDelete();
  
  const pickSignature = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    
    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  };
  
  return (
    <View>
      <Button title="Upload Signature" onPress={pickSignature} />
      <Button title="Delete Signature" onPress={() => deleteMutation.mutate()} />
    </View>
  );
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Preferences Update**: Toggle notification settings and verify they persist
- [ ] **Signature Upload**: Upload, view, and delete digital signatures
- [ ] **Test Notifications**: Send test emails and verify they arrive
- [ ] **Role-Based Defaults**: Verify different roles get appropriate defaults
- [ ] **Invoice Triggers**: Create/send/pay invoices and verify notifications are sent
- [ ] **Security**: Verify users can't modify other users' preferences
- [ ] **Storage**: Verify signature files are private and accessible only to owners

### Unit Testing

```typescript
// Example test for ProfileSettingsService
describe('ProfileSettingsService', () => {
  test('should update preferences correctly', async () => {
    const result = await ProfileSettingsService.updateInvoiceNotificationPreferences({
      preferences: {
        events: {
          new_invoice: { email: false }
        }
      }
    });
    
    expect(result.events.new_invoice.email).toBe(false);
  });
});
```

## 🔒 Security Considerations

### Row Level Security (RLS)

- ✅ **Profiles Updates**: Users can only update their own notification preferences
- ✅ **Storage Access**: Signature files are restricted to the owner's folder
- ✅ **Function Security**: RPC functions verify user identity before operations

### Data Privacy

- **Digital signatures** are stored in private buckets with time-limited signed URLs
- **Preferences** are user-specific and not shared across accounts
- **Test notifications** can only be sent to self unless user is admin

### Best Practices

1. **Validate inputs** before saving preferences
2. **Sanitize file uploads** for signatures
3. **Use signed URLs** for temporary signature access
4. **Audit logs** track all preference changes
5. **Rate limiting** on test notifications to prevent abuse

## 📊 Analytics & Monitoring

The system tracks these analytics events:

- `edudash.profile.notify_prefs_updated` - When preferences are changed
- `edudash.signature.uploaded` - When signatures are uploaded
- `edudash.signature.deleted` - When signatures are deleted
- `edudash.notification.test_sent` - When test notifications are sent
- `edudash.invoice.notification_triggered` - When invoice events trigger notifications
- `edudash.notifications.sent` - When notifications are successfully sent
- `edudash.notifications.skipped` - When notifications are skipped due to preferences

Monitor these events to:
- Track feature adoption
- Identify notification delivery issues
- Understand user preference patterns
- Debug notification problems

## 🤝 Support

For implementation questions or issues:

1. Check the TypeScript types in `lib/types/profile.ts` for reference
2. Review service methods in `lib/services/profileSettingsService.ts`
3. Use React Query hooks from `lib/hooks/useProfileSettings.ts`
4. Test with the edge function at `supabase/functions/notifications-dispatcher`

## 🔄 Updates & Migrations

When updating the feature:

1. **Database changes**: Create new migration files
2. **Type updates**: Update `lib/types/profile.ts`
3. **Service changes**: Update `ProfileSettingsService`
4. **Hook updates**: Update React Query hooks as needed
5. **Function updates**: Deploy edge function changes

The system is designed to be backward-compatible - new preference fields should have sensible defaults.