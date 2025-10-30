# Agentic Tool System Implementation

**Date**: 2025-10-30  
**Status**: ✅ Phase 1 Complete (Tool Registry + Database Query Tool)  
**Next**: Testing & UI Feedback

---

## 🎯 Overview

Dash AI can now **autonomously call tools** to accomplish tasks, making it truly agentic. When a user asks "Show me my students", Dash automatically queries the database, retrieves results, and formats a response—all without manual intervention.

### What Changed

From **reactive assistant** → **proactive agent**:
- ❌ Before: Dash could only answer based on its training
- ✅ After: Dash can query databases, navigate, generate reports, send notifications

---

## 🏗️ Architecture

### Components Built

1. **Tool Registry** (`services/dash-ai/DashToolRegistry.ts`)
   - Central registry for all agentic tools
   - Role-based access control
   - Tier-based feature gating
   - Parameter validation
   - Execution tracking

2. **Tool Types** (`services/dash-ai/types.ts`)
   - `Tool` interface
   - `ToolExecutionContext`
   - `ToolExecutionResult`
   - `ToolParameter` with validation rules

3. **Database Query Tool** (`services/dash-ai/tools/DatabaseQueryTool.ts`)
   - 7 safe, predefined queries
   - RLS enforcement (always filters by `preschool_id`)
   - Read-only operations
   - Row limits (max 100 rows)
   - Query types:
     - `list_students`
     - `list_teachers`
     - `list_classes`
     - `list_assignments`
     - `list_attendance`
     - `get_student_progress`
     - `get_class_summary`

4. **AI Proxy Updates** (`supabase/functions/ai-proxy/index.ts`)
   - Claude tool use API integration
   - Tool loading based on role/tier
   - Tool execution with RLS protection
   - Multi-turn conversation support (tool results → Claude → response)

---

## 🔒 Security Model

### Multi-Layered Protection

1. **Role-Based Access Control**
   ```typescript
   allowedRoles: ['parent', 'teacher', 'principal', 'superadmin']
   ```

2. **Tier-Based Feature Gating**
   ```typescript
   requiredTier: 'starter'  // Optional - defaults to free
   ```

3. **RLS Enforcement**
   - Every query **always** filters by `preschool_id`
   - Uses Supabase RLS policies
   - Service role operations isolated to Edge Function

4. **Query Allowlist**
   - No arbitrary SQL execution
   - Only predefined, safe queries
   - Read-only operations (SELECT only)

5. **Row Limits**
   - Maximum 100 rows per query
   - Configurable per query type

---

## 📝 Usage Example

### User Request
```
User: "Show me all my students"
```

### What Happens (Automatic)

1. **Client** sends request to `ai-proxy`:
   ```typescript
   {
     scope: 'parent',
     service_type: 'homework_help',
     enable_tools: true,  // Enable agentic mode
     payload: {
       prompt: 'Show me all my students'
     },
     metadata: {
       role: 'teacher'
     }
   }
   ```

2. **AI Proxy** loads tools for role:
   ```typescript
   const tools = getToolsForRole('teacher', 'starter')
   // Returns: [DatabaseQueryTool]
   ```

3. **Claude** decides to call tool:
   ```json
   {
     "type": "tool_use",
     "id": "toolu_123",
     "name": "query_database",
     "input": {
       "query_type": "list_students",
       "limit": 20
     }
   }
   ```

4. **AI Proxy** executes tool:
   ```typescript
   const result = await executeTool('query_database', {...}, context)
   // Queries database with RLS enforcement
   ```

5. **Response** sent to client:
   ```json
   {
     "success": true,
     "content": "Here are your students:",
     "tool_use": [{
       "id": "toolu_123",
       "name": "query_database",
       "input": {...}
     }],
     "tool_results": [{
       "type": "tool_result",
       "tool_use_id": "toolu_123",
       "content": "{\"rows\": [...], \"row_count\": 12}"
     }],
     "requires_continuation": true
   }
   ```

6. **Client** (optional) sends tool results back for final response formatting

---

## 🔧 Tool Definition Example

```typescript
export const DatabaseQueryTool: Tool = {
  id: 'query_database',
  name: 'Query Database',
  description: 'Execute safe, read-only database queries...',
  category: 'database',
  riskLevel: 'low',
  allowedRoles: ['parent', 'teacher', 'principal', 'superadmin'],
  parameters: [
    {
      name: 'query_type',
      type: 'string',
      required: true,
      enum: ['list_students', 'list_teachers', ...]
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      default: 20,
      validation: { min: 1, max: 100 }
    }
  ],
  claudeToolDefinition: {
    name: 'query_database',
    description: 'Execute safe queries...',
    input_schema: {
      type: 'object',
      properties: {...},
      required: ['query_type']
    }
  },
  execute: async (params, context) => {
    // Safe execution with RLS
    const { data, error } = await context.supabaseClient
      .from('students')
      .select('*')
      .eq('preschool_id', context.preschoolId)
    
    return { success: !error, data }
  }
}
```

---

## 🚀 Next Steps

### Immediate (This Week)
- [ ] **Test tool execution flow**
  - Parent role: list_students, get_student_progress
  - Teacher role: list_classes, list_assignments
  - Principal role: list_teachers, get_class_summary
- [ ] **Add UI feedback** (`web/src/components/dashboard/AskAIWidget.tsx`)
  - Show tool execution status
  - Display tool results inline
  - Handle multi-turn conversations

### Phase 2 (Week 2)
- [ ] **Navigation Tool**
  - Navigate to screens (dashboard, attendance, reports)
  - Deep links with parameters
- [ ] **Report Generation Tool**
  - Generate PDF reports
  - Email reports to parents/teachers
- [ ] **Notification Tool**
  - Send push notifications
  - Schedule reminders

### Phase 3 (Week 3)
- [ ] **Proactive Behavior**
  - Database triggers
  - Time-based suggestions
  - Pattern detection
- [ ] **Multi-Step Planning**
  - Break complex requests into steps
  - Sequential execution
  - Progress tracking

### Phase 4 (Week 4)
- [ ] **Learning & Feedback**
  - Track tool success rates
  - Adjust based on user preferences
  - Self-correction on failures

---

## 📊 Current Status

### ✅ Completed
- Tool Registry infrastructure
- Type definitions
- Database Query Tool (7 queries)
- AI Proxy tool use integration
- Role-based access control
- RLS enforcement
- Tool execution framework

### 🚧 In Progress
- Testing tool execution flow
- UI feedback implementation

### 📋 Planned
- Additional tools (navigation, reports, notifications)
- Multi-step planning
- Proactive suggestions
- Learning & feedback loops

---

## 🔍 Testing

### Manual Test Scenarios

1. **Basic Query**
   ```
   User: "How many students do I have?"
   Expected: Dash calls query_database with list_students
   ```

2. **Filtered Query**
   ```
   User: "Show me Grade 2 students"
   Expected: Dash calls query_database with filters
   ```

3. **Complex Query**
   ```
   User: "What's the attendance rate for Class A this week?"
   Expected: Dash calls query_database with list_attendance + class_id
   ```

4. **Permission Test**
   ```
   User (as parent): "Show me all teachers"
   Expected: Success - parents can view teachers
   ```

5. **RLS Test**
   ```
   User (preschool A): Request students
   Expected: Only see students from preschool A
   ```

### Test Script
```typescript
// TODO: Create automated test suite
// File: tests/agentic-tools-test.ts

import { DashToolRegistry } from '@/services/dash-ai/DashToolRegistry'
import { DatabaseQueryTool } from '@/services/dash-ai/tools/DatabaseQueryTool'

describe('Agentic Tool System', () => {
  it('should register database query tool', () => {
    DashToolRegistry.registerTool(DatabaseQueryTool)
    const tools = DashToolRegistry.getAllTools()
    expect(tools.length).toBe(1)
  })
  
  it('should filter tools by role', () => {
    const teacherTools = DashToolRegistry.getAvailableTools('teacher', 'starter')
    expect(teacherTools).toContainEqual(DatabaseQueryTool)
  })
  
  it('should enforce RLS in queries', async () => {
    const result = await DashToolRegistry.executeTool(
      'query_database',
      { query_type: 'list_students' },
      {
        userId: 'test-user',
        preschoolId: 'preschool-a',
        role: 'teacher',
        tier: 'starter',
        supabaseClient: mockClient
      }
    )
    
    expect(result.success).toBe(true)
    // Verify all returned students have preschool_id = 'preschool-a'
  })
})
```

---

## 📚 Related Documentation

- **Tool Registry**: `services/dash-ai/DashToolRegistry.ts`
- **Tool Types**: `services/dash-ai/types.ts`
- **Database Tool**: `services/dash-ai/tools/DatabaseQueryTool.ts`
- **AI Proxy**: `supabase/functions/ai-proxy/index.ts`
- **WARP.md**: Development standards and security rules
- **Roadmap**: `docs/features/ROLE_BASED_AGENTIC_MODE.md`

---

## 🎓 Key Learnings

1. **Security First**: Every tool must enforce RLS and tenant isolation
2. **Explicit Control**: Tools are opt-in via `enable_tools: true`
3. **Multi-Turn**: Tool use requires conversation continuation
4. **Role-Based**: Access control at tool registration and execution
5. **Observability**: Log all tool executions for debugging and audit

---

**Version**: 1.0  
**Last Updated**: 2025-10-30  
**Contributors**: Warp AI Agent
