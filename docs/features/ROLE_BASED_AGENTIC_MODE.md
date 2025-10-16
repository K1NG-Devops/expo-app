# Role-Based Agentic Mode

## Overview

EduDash Pro's Dash AI Assistant now supports **role-based agentic capabilities**, where the level of AI autonomy and system access is determined by the user's role. This ensures that powerful administrative features are only accessible to authorized superadmin users, while maintaining a safe, helpful assistant mode for teachers, principals, and parents.

## Architecture

### Agentic Capabilities by Role

#### Superadmin (Full Agentic Mode)
- **Mode**: Agent (Autonomous)
- **Autonomy Level**: Full
- **Can Run Diagnostics**: ✅ Yes
- **Can Make Code Changes**: ✅ Yes (with confirmation)
- **Can Access System Level**: ✅ Yes
- **Can Auto-Execute High Risk**: ✅ Yes (with safeguards)

**Capabilities:**
- Run comprehensive app diagnostics
- Execute database health checks
- Inspect and modify system configurations
- Access and analyze logs and telemetry
- Suggest and implement code-level fixes
- Execute administrative commands

**Available Commands:**
- `"run diagnostics"` - Full app health check
- `"check database"` - Verify database integrity
- `"inspect logs"` - Review error logs and telemetry
- `"system status"` - Overall system health report
- `"fix [issue]"` - Suggest and apply fixes

#### Other Roles (Teacher, Principal, Parent)
- **Mode**: Assistant
- **Autonomy Level**: Limited
- **Can Run Diagnostics**: ❌ No
- **Can Make Code Changes**: ❌ No
- **Can Access System Level**: ❌ No
- **Can Auto-Execute High Risk**: ❌ No

**Capabilities:**
- Help with educational tasks
- Answer questions about the app
- Navigate to appropriate screens
- Generate educational content
- Assist with homework and lesson planning

## Implementation

### Core Components

1. **DashAgenticIntegration** (`services/DashAgenticIntegration.ts`)
   - `getAgenticCapabilities(role: string)`: Returns role-specific capabilities
   - `isAgenticEnabled(context)`: Checks if agentic mode is active
   - `buildEnhancedSystemPrompt()`: Injects role-based context into AI prompts

2. **Utility Functions** (`lib/utils/agentic-mode.ts`)
   - `isAgenticModeEnabled(role)`: Client-side capability check
   - `canRunDiagnostics(role)`: Check diagnostic permissions
   - `getAgenticCapabilitiesDescription(role)`: User-friendly capability description

### Configuration

Environment variables:
```env
# Enable agentic features (role-restricted)
EXPO_PUBLIC_AGENTIC_ENABLED=true
EXPO_PUBLIC_AGENTIC_AUTONOMY=assistant  # Default mode
EXPO_PUBLIC_AGENTIC_PREDICTIVE=false
EXPO_PUBLIC_AGENTIC_SEMANTIC_MEMORY=false
```

## Usage

### For Superadmin Users

When logged in as superadmin, Dash automatically operates in **agent mode** with full system access.

**Example Interactions:**

1. **Run Diagnostics**
   ```
   User: "Run full app diagnostics"
   Dash: "Running comprehensive diagnostics as superadmin...
          [Executes health checks, reports detailed findings]"
   ```

2. **Database Health Check**
   ```
   User: "Check database integrity"
   Dash: "Analyzing database health...
          [Runs RLS checks, migration status, table stats]"
   ```

3. **System Analysis**
   ```
   User: "What's causing the slow performance?"
   Dash: "Analyzing system performance...
          [Checks query patterns, cache status, API latency]"
   ```

4. **Code-Level Fixes**
   ```
   User: "Fix the authentication issue"
   Dash: "I've identified the issue. Here's the fix:
          [Provides code example with explanation]
          Shall I apply this change?"
   ```

### For Other Roles

Teachers, principals, and parents interact with Dash in **assistant mode**, focused on educational tasks without system-level access.

**Example Interactions:**
```
User: "Help me create a lesson plan"
Dash: "I'd be happy to help! What subject and grade level?"
```

## Security

### Safeguards

1. **Role Verification**: All agentic actions verify user role at runtime
2. **Confirmation Required**: High-risk actions require explicit user approval
3. **Audit Trail**: All superadmin actions are logged for accountability
4. **RLS Enforcement**: Database operations respect Row-Level Security
5. **No Client Exposure**: Service role keys never exposed to client

### Risk Levels

- **Low Risk**: Read-only operations, navigation, simple queries
- **Medium Risk**: Data modifications, batch operations
- **High Risk**: Schema changes, system configuration, code deployment

## Development

### Adding New Agentic Capabilities

1. Update `AgenticCapabilities` interface in `DashAgenticIntegration.ts`
2. Add capability check in `getAgenticCapabilities()` method
3. Update system prompt in `buildEnhancedSystemPrompt()`
4. Implement feature with proper role verification

### Testing

Test both modes:

```typescript
// Test superadmin mode
const superadminCaps = DashAgenticIntegration.getAgenticCapabilities('superadmin');
expect(superadminCaps.mode).toBe('agent');
expect(superadminCaps.canRunDiagnostics).toBe(true);

// Test teacher mode
const teacherCaps = DashAgenticIntegration.getAgenticCapabilities('teacher');
expect(teacherCaps.mode).toBe('assistant');
expect(teacherCaps.canRunDiagnostics).toBe(false);
```

## Monitoring

Track agentic mode usage via PostHog:
- `dash.agentic.diagnostics_run`
- `dash.agentic.code_change_suggested`
- `dash.agentic.high_risk_action`
- `dash.mode.switched` (if mode toggling is added)

## Future Enhancements

1. **Granular Permissions**: More fine-grained capability control
2. **Principal Diagnostics**: Limited diagnostic access for principals
3. **Action History**: Detailed log of all agentic actions
4. **Rollback Support**: Undo system-level changes
5. **Multi-Factor Auth**: Additional verification for high-risk actions

## Related Documentation

- `docs/security/` - Security and RLS policies
- `docs/architecture/ai-flow.md` - AI system architecture
- `services/DashAIAssistant.ts` - Core AI assistant implementation
- `WARP.md` - Development rules and constraints

---

**Status**: ✅ Implemented  
**Version**: 1.0  
**Last Updated**: 2025-10-15
