# User Blocking System

## Overview

The EduDash Pro user blocking system provides comprehensive functionality for users to block other users and user-generated content, ensuring COPPA and GDPR compliance for child safety in educational environments.

## Features Implemented

### ✅ User Blocking Functionality
- **Full User Blocking**: Complete blocking of user interaction and content visibility
- **Communication Blocking**: Block only messages/communications while allowing other content
- **Content Blocking**: Block specific content items from users
- **Temporal Blocking**: Support for blocks with expiration dates
- **Reason Tracking**: Required reason selection for compliance auditing

### ✅ COPPA/GDPR Compliance
- **School-Scoped Blocking**: Users can only block within their school context
- **Audit Trail**: Complete logging of all blocking actions with timestamps
- **Data Retention**: Proper cascade deletion for GDPR compliance
- **Privacy Protection**: Row-level security policies for data access
- **Parental Controls**: Age-appropriate blocking mechanisms

### ✅ User Interface Components
- **UserBlockingMenu**: Modal component for blocking/unblocking users
- **Blocked Users Management**: Screen for viewing and managing blocked users
- **Message Integration**: Blocking options in parent-teacher messaging
- **Action Sheets**: Contextual blocking options in user interfaces

## Database Schema

### Tables Created

#### `user_blocks`
- Stores user-to-user blocking relationships
- Supports different block types (user, communication, content)
- Includes reason, details, and expiration tracking
- School-scoped with proper foreign key relationships

#### `blocked_content`
- Stores specific content blocking records
- Links to content types (messages, lessons, homework, etc.)
- Tracks blocker, content author, and reason

### RPC Functions

#### `block_user(userId, blockType, reason, details, expiresAt)`
- Creates or updates a user block
- Validates school context for COPPA compliance
- Sends notifications to blocked user

#### `unblock_user(userId, blockType)`
- Removes user block by setting inactive
- Maintains audit trail

#### `get_blocked_users()`
- Returns list of users blocked by current user
- Includes user details, block reasons, and dates

#### `is_user_blocked(userId, blockType)`
- Checks if specific user is blocked
- Used for UI filtering and access control

#### `block_content(contentType, contentId, authorId, reason)`
- Blocks specific content items
- Supports all content types in the platform

## Implementation Files

### Core Files
- `supabase/migrations/20250926231545_user_blocking_system.sql` - Database schema and functions
- `hooks/useUserBlocking.ts` - React hook for blocking functionality
- `components/UserBlockingMenu.tsx` - UI component for blocking actions
- `app/screens/blocked-users-management.tsx` - Management screen

### Integration Files
- `app/screens/parent-messages.tsx` - Updated with blocking integration
- `app/screens/teacher-messages.tsx` - Updated with blocking management
- `scripts/verify-blocking-system.ts` - Verification script

## Usage Examples

### Blocking a User
```typescript
import { useUserBlocking } from '@/hooks/useUserBlocking';

const { blockUser } = useUserBlocking();

await blockUser({
  userId: 'user-uuid',
  blockType: 'communication',
  reason: 'inappropriate_content',
  details: 'Additional context...'
});
```

### Checking if User is Blocked
```typescript
const { checkIsUserBlocked } = useUserBlocking();

const isBlocked = await checkIsUserBlocked('user-uuid', 'communication');
```

### Using the Blocking Menu Component
```tsx
import UserBlockingMenu from '@/components/UserBlockingMenu';

<UserBlockingMenu
  userId={userId}
  userName={userName}
  userRole={userRole}
  visible={menuVisible}
  onClose={() => setMenuVisible(false)}
  onBlock={handleUserBlocked}
  onUnblock={handleUserUnblocked}
  isBlocked={isUserBlocked}
/>
```

## Security and Compliance

### COPPA Compliance
- **Age-Appropriate Design**: Block types suitable for educational environments
- **Parental Oversight**: Transparent blocking with notification systems
- **School Context**: Blocking limited to school community boundaries
- **Data Protection**: Minimal data collection with clear purposes

### GDPR Compliance
- **Data Subject Rights**: Users can view and manage their blocks
- **Audit Trails**: Complete logging for regulatory compliance
- **Data Retention**: Automatic cleanup of expired blocks
- **Privacy by Design**: Row-level security and access controls

### Security Features
- **Authentication Required**: All functions require valid user authentication
- **Input Validation**: SQL injection protection and parameter validation
- **Access Control**: Role-based permissions and school scoping
- **Audit Logging**: Comprehensive logging of all blocking actions

## Performance Optimizations

### Database Indexes
- `idx_user_blocks_blocker` - Fast lookups for user's blocked list
- `idx_user_blocks_blocked` - Fast checks for being blocked
- `idx_user_blocks_active` - Efficient active block filtering
- `idx_blocked_content_blocker` - Content blocking lookups

### Query Optimization
- Efficient RPC functions with minimal database calls
- Proper use of prepared statements and parameterized queries
- Cached results in React hooks with appropriate stale times

## Testing and Verification

### Verification Script
Run `scripts/verify-blocking-system.ts` to verify:
- Database tables are accessible
- RPC functions are deployed
- TypeScript integration is working
- UI components are available

### Manual Testing Checklist
- [ ] Block/unblock users from message threads
- [ ] View blocked users in management screen
- [ ] Verify blocked users don't appear in message lists
- [ ] Test different block types (user, communication)
- [ ] Verify block reasons are tracked
- [ ] Test unblocking functionality

## Migration Notes

The user blocking system was added via migration `20250926231545_user_blocking_system.sql`. This migration:
- Creates new tables with proper constraints
- Implements RPC functions with security
- Sets up Row Level Security policies
- Creates performance indexes
- Logs completion for audit purposes

## Google Play Policy Compliance

This implementation addresses the Google Play Families policy requirements:

✅ **User Blocking**: Complete user blocking functionality implemented
✅ **Content Reporting**: Integrated with existing content reporting system
✅ **Chat Moderation**: Works with existing moderation queue system
✅ **Child Safety**: COPPA-compliant design with school scoping
✅ **Audit Trail**: Complete logging for regulatory compliance

The system is now ready to meet Google Play's content policy requirements for apps targeting children and families.