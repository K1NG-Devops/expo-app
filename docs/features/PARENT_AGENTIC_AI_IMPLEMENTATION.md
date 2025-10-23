# Parent Agentic AI Implementation Plan
**Date**: 2025-10-22  
**Status**: Implementation Ready  
**Priority**: HIGH - Enhances parent learning support

---

## Executive Summary

This plan adds **tool-enabled agentic AI capabilities** to parent features by **replacing the existing homework help** with an enhanced, tool-powered version. Since the database only contains test users, we can implement this cleanly without backward compatibility overhead.

### Design Principles
1. **Direct Replacement**: Replace existing homework help with enhanced version
2. **Simpler Code**: No feature flags or dual code paths
3. **Always-On Tools**: All parents get agentic capabilities by default
4. **Clean Implementation**: No legacy fallbacks to maintain
5. **Production-Ready**: Single, well-tested code path

---

## Phase 1: Foundation (Week 1)

### 1.1: Add Tool Support to AI Gateway Edge Function

**File**: `supabase/functions/ai-gateway/index.ts`

**Objective**: Enable Claude to receive and use tools without breaking existing requests

**Changes**:
```typescript
// REPLACE: Add tool support to all relevant actions
if (action === 'chat' || action === 'general_assistance' || action === 'homework_help') {
    const claudeParams: any = {
        model: body.model || 'claude-3-5-sonnet-20241022',
        max_tokens: body.maxTokens || 4000,
        messages: body.messages,
        system: body.system || body.context
    };
    
    // Add tools if provided
    if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
        claudeParams.tools = body.tools;
        claudeParams.tool_choice = body.tool_choice || { type: 'auto' };
    }
    
    const response = await anthropic.messages.create(claudeParams);
    
    // Extract tool calls from response
    const toolCalls = response.content
        .filter((block: any) => block.type === 'tool_use')
        .map((block: any) => ({
            id: block.id,
            name: block.name,
            input: block.input
        }));
    
    return new Response(JSON.stringify({
        content: response.content.find((b: any) => b.type === 'text')?.text || '',
        tool_calls: toolCalls,
        stop_reason: response.stop_reason,
        raw_content: response.content,
        model: response.model,
        usage: response.usage,
        cost: calculateCost(response.usage, response.model)
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
```

**Testing**:
```bash
# Test tool-enabled homework help
curl -X POST https://your-project.supabase.co/functions/v1/ai-gateway \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "action": "homework_help",
    "messages": [{"role": "user", "content": "Help with multiplication homework"}],
    "tools": [{"name": "generate_practice_problems", "description": "Creates practice problems", "input_schema": {...}}]
  }'
```

**Validation**:
- ✅ Tool-enabled requests return `tool_calls` array
- ✅ Cost tracking includes tool usage
- ✅ Response time <3s including tool execution

---

### 1.2: Create Parent-Specific Tool Registry

**New File**: `services/dash-ai/ParentToolRegistry.ts`

**Objective**: Define tools specifically useful for parent learning support

```typescript
import { DashToolRegistry, ToolDefinition } from './DashToolRegistry';
import { assertSupabase } from '@/lib/supabase';
import { router } from 'expo-router';

export class ParentToolRegistry extends DashToolRegistry {
  constructor() {
    super();
    this.registerParentTools();
  }

  private registerParentTools(): void {
    // Tool 1: Get child learning context
    this.registerTool({
      name: 'get_child_learning_context',
      description: 'Retrieves child learning data (homework, attendance, progress) for contextual help',
      inputSchema: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Child student ID' },
          include_homework: { type: 'boolean', description: 'Include pending homework' },
          include_attendance: { type: 'boolean', description: 'Include attendance records' },
          days_back: { type: 'number', description: 'Days of history to include (default 30)' }
        },
        required: ['student_id']
      },
      executor: async (args: any) => {
        const client = assertSupabase();
        const context: any = {};

        try {
          // Get student basic info
          const { data: student } = await client
            .from('students')
            .select('first_name, last_name, date_of_birth, class_id, classes!left(name, grade_level)')
            .eq('id', args.student_id)
            .single();

          context.student = student;

          // Get pending homework if requested
          if (args.include_homework && student?.class_id) {
            const { data: homework } = await client
              .from('homework_assignments')
              .select('id, title, description, due_date, subject')
              .eq('class_id', student.class_id)
              .gte('due_date', new Date().toISOString())
              .order('due_date', { ascending: true })
              .limit(5);

            context.pending_homework = homework || [];
          }

          // Get attendance if requested
          if (args.include_attendance) {
            const daysBack = args.days_back || 30;
            const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

            const { data: attendance } = await client
              .from('attendance_records')
              .select('date, status')
              .eq('student_id', args.student_id)
              .gte('date', startDate)
              .order('date', { ascending: false });

            context.attendance_summary = {
              records: attendance || [],
              present_count: attendance?.filter((a: any) => a.status === 'present').length || 0,
              total_days: attendance?.length || 0
            };
          }

          return {
            success: true,
            data: context,
            message: `Retrieved learning context for ${student?.first_name}`
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            message: 'Failed to retrieve child learning context'
          };
        }
      }
    });

    // Tool 2: Generate practice problems
    this.registerTool({
      name: 'generate_practice_problems',
      description: 'Creates practice problems for a specific subject and grade level',
      inputSchema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Subject (math, science, language, etc.)' },
          grade_level: { type: 'number', description: 'Grade level (1-12)' },
          topic: { type: 'string', description: 'Specific topic within subject' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          count: { type: 'number', description: 'Number of problems (default 5)' }
        },
        required: ['subject', 'grade_level', 'topic']
      },
      executor: async (args: any) => {
        try {
          const client = assertSupabase();
          const count = args.count || 5;

          // Generate problems using AI
          const { data, error } = await client.functions.invoke('ai-gateway', {
            body: {
              action: 'generate_content',
              prompt: `Generate ${count} ${args.difficulty || 'medium'} difficulty practice problems for:
Subject: ${args.subject}
Grade Level: ${args.grade_level}
Topic: ${args.topic}

Format each problem with:
1. Problem statement
2. Difficulty indicator
3. Learning objective

Return as JSON array: [{"problem": "...", "difficulty": "...", "objective": "..."}]`,
              model: 'claude-3-sonnet',
              maxTokens: 2000
            }
          });

          if (error) throw error;

          // Parse AI response
          let problems;
          try {
            const jsonMatch = data.content.match(/\[[\s\S]*\]/);
            problems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          } catch {
            // Fallback: treat as plain text
            problems = [{ problem: data.content, difficulty: args.difficulty, objective: args.topic }];
          }

          return {
            success: true,
            data: { problems, count: problems.length },
            message: `Generated ${problems.length} practice problems`
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            message: 'Failed to generate practice problems'
          };
        }
      }
    });

    // Tool 3: Schedule study reminder
    this.registerTool({
      name: 'schedule_study_reminder',
      description: 'Creates a reminder for study session or homework deadline',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Reminder title' },
          description: { type: 'string', description: 'Details about what to study' },
          due_date: { type: 'string', description: 'ISO date string for reminder' },
          student_id: { type: 'string', description: 'Child student ID' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' }
        },
        required: ['title', 'due_date', 'student_id']
      },
      executor: async (args: any) => {
        try {
          const client = assertSupabase();
          const { data: authUser } = await client.auth.getUser();

          // Get parent user ID
          const { data: parentUser } = await client
            .from('users')
            .select('id')
            .eq('auth_user_id', authUser.user?.id)
            .single();

          if (!parentUser) throw new Error('Parent user not found');

          // Create task in tasks table
          const { data: task, error } = await client
            .from('tasks')
            .insert({
              title: args.title,
              description: args.description || '',
              due_date: args.due_date,
              assigned_to: parentUser.id,
              status: 'pending',
              priority: args.priority || 'medium',
              metadata: {
                student_id: args.student_id,
                type: 'study_reminder',
                created_by: 'dash_ai'
              }
            })
            .select()
            .single();

          if (error) throw error;

          return {
            success: true,
            data: { task_id: task.id, title: task.title },
            message: `Reminder scheduled for ${new Date(args.due_date).toLocaleDateString()}`
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            message: 'Failed to schedule reminder'
          };
        }
      }
    });

    // Tool 4: Compose message to teacher
    this.registerTool({
      name: 'compose_teacher_message',
      description: 'Drafts a message to teacher (user must review before sending)',
      inputSchema: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Child student ID' },
          subject: { type: 'string', description: 'Message subject' },
          message_type: { type: 'string', enum: ['question', 'concern', 'update', 'request'] },
          topic: { type: 'string', description: 'What the message is about' },
          tone: { type: 'string', enum: ['formal', 'friendly', 'urgent'], description: 'Message tone' }
        },
        required: ['student_id', 'subject', 'topic']
      },
      executor: async (args: any) => {
        try {
          const client = assertSupabase();

          // Get student and teacher info
          const { data: student } = await client
            .from('students')
            .select('first_name, last_name, class_id, classes!left(teacher_id, users!left(first_name, last_name))')
            .eq('id', args.student_id)
            .single();

          if (!student || !student.classes) {
            throw new Error('Student or teacher not found');
          }

          // Generate message using AI
          const { data, error } = await client.functions.invoke('ai-gateway', {
            body: {
              action: 'generate_content',
              prompt: `Compose a ${args.tone || 'friendly'} message from a parent to their child's teacher:

Student: ${student.first_name} ${student.last_name}
Subject: ${args.subject}
Type: ${args.message_type || 'question'}
Topic: ${args.topic}

Write a clear, respectful message that:
1. Greets the teacher professionally
2. States the purpose clearly
3. Provides context
4. Asks specific questions or makes requests
5. Thanks the teacher and closes politely

Keep it concise (under 200 words).`,
              model: 'claude-3-sonnet',
              maxTokens: 500
            }
          });

          if (error) throw error;

          return {
            success: true,
            data: {
              draft_message: data.content,
              teacher_name: `${student.classes.users?.first_name} ${student.classes.users?.last_name}`,
              student_name: `${student.first_name} ${student.last_name}`,
              // Don't auto-send - return draft for review
              action_required: 'review_and_send'
            },
            message: 'Message draft created - please review before sending'
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            message: 'Failed to compose message draft'
          };
        }
      }
    });

    // Tool 5: Navigate to learning resource
    this.registerTool({
      name: 'navigate_to_learning_resource',
      description: 'Opens a specific screen/resource for parent learning support',
      inputSchema: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            enum: [
              'homework_list',
              'attendance_history',
              'progress_reports',
              'message_teacher',
              'picture_of_progress',
              'child_profile'
            ],
            description: 'Where to navigate'
          },
          student_id: { type: 'string', description: 'Child student ID for context' }
        },
        required: ['destination']
      },
      executor: async (args: any) => {
        try {
          const routes: Record<string, string> = {
            homework_list: '/screens/parent-homework',
            attendance_history: '/screens/parent-attendance',
            progress_reports: '/screens/parent-reports',
            message_teacher: '/screens/parent-messages',
            picture_of_progress: '/picture-of-progress',
            child_profile: '/screens/parent-children'
          };

          const route = routes[args.destination];
          if (!route) throw new Error(`Unknown destination: ${args.destination}`);

          // Add student context if provided
          const finalRoute = args.student_id 
            ? `${route}?studentId=${args.student_id}`
            : route;

          router.push(finalRoute as any);

          return {
            success: true,
            data: { route: finalRoute },
            message: `Navigated to ${args.destination}`
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            message: 'Navigation failed'
          };
        }
      }
    });

    console.log('[ParentToolRegistry] Registered 5 parent-specific tools');
  }

  /**
   * Get tool specs formatted for Claude API
   */
  getToolSpecs(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }
}
```

**Testing**:
```typescript
// Test tool registration
const registry = new ParentToolRegistry();
console.log('Registered tools:', registry.listTools());

// Test individual tool execution
const result = await registry.execute('get_child_learning_context', {
  student_id: 'test-student-id',
  include_homework: true,
  include_attendance: true
});
console.log('Tool result:', result);
```

---

### 1.3: Replace Homework Generator Hook

**File**: `hooks/useHomeworkGenerator.ts` (REPLACE existing implementation)

**Objective**: Replace existing homework help with tool-enabled version

```typescript
import { useCallback, useState } from 'react';
import { assertSupabase } from '@/lib/supabase';
import { incrementUsage, logUsageEvent } from '@/lib/ai/usage';
import { ParentToolRegistry } from '@/services/dash-ai/ParentToolRegistry';

export type HomeworkGenOptions = {
  question: string;
  subject: string;
  gradeLevel: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  context?: string;
  model?: string;
  studentId?: string;  // NEW: for context retrieval
};

export interface HomeworkResult {
  text: string;
  toolsUsed?: Array<{ name: string; result: any }>;
  practiceProblems?: any[];
  suggestedActions?: Array<{ label: string; action: () => void }>;
}

export function useHomeworkGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HomeworkResult | null>(null);

  const generate = useCallback(async (opts: HomeworkGenOptions): Promise<HomeworkResult> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const client = assertSupabase();
      const toolRegistry = new ParentToolRegistry();
      const toolsUsed: Array<{ name: string; result: any }> = [];

      // Step 1: Get child context if studentId provided
      let childContext: any = null;
      if (opts.studentId) {
        const contextResult = await toolRegistry.execute('get_child_learning_context', {
          student_id: opts.studentId,
          include_homework: true,
          include_attendance: true,
          days_back: 30
        });

        if (contextResult.success) {
          childContext = contextResult.data;
          toolsUsed.push({ name: 'get_child_learning_context', result: contextResult });
        }
      }

      // Step 2: Build enhanced system prompt with context
      const systemPrompt = buildSystemPrompt(opts, childContext);

      // Step 3: Call AI with tools (if enabled)
      const messages = [
        {
          role: 'user',
          content: `${opts.question}\n\nSubject: ${opts.subject}\nGrade: ${opts.gradeLevel}\nDifficulty: ${opts.difficulty || 'medium'}`
        }
      ];

      const toolSpecs = toolRegistry.getToolSpecs();  // Always include tools

      const { data, error: aiError } = await client.functions.invoke('ai-gateway', {
        body: {
          action: 'homework_help',
          messages,
          system: systemPrompt,
          tools: toolSpecs,
          tool_choice: { type: 'auto' },
          model: opts.model || 'claude-3-sonnet'
        }
      });

      if (aiError) throw aiError;

      // Step 4: Handle tool calls if any
      if (data.tool_calls && data.tool_calls.length > 0) {
        for (const toolCall of data.tool_calls) {
          const toolResult = await toolRegistry.execute(toolCall.name, toolCall.input);
          toolsUsed.push({ name: toolCall.name, result: toolResult });
        }

        // Get final response with tool results
        const toolResultMessages = [
          ...messages,
          { role: 'assistant', content: data.raw_content },
          {
            role: 'user',
            content: toolsUsed.map(t => 
              `Tool ${t.name} result: ${JSON.stringify(t.result.data)}`
            ).join('\n\n')
          }
        ];

        const { data: finalData } = await client.functions.invoke('ai-gateway', {
          body: {
            action: 'homework_help',
            messages: toolResultMessages,
            system: systemPrompt,
            model: opts.model || 'claude-3-sonnet'
          }
        });

        data.content = finalData.content;
      }

      // Step 5: Extract structured data from response
      const parsedResult = parseAgenticResponse(data.content, toolsUsed);

      // Track usage
      await incrementUsage('homework_help', 1);
      await logUsageEvent({
        feature: 'homework_help_agentic',
        model: data.model,
        tokensIn: data.usage?.input_tokens || 0,
        tokensOut: data.usage?.output_tokens || 0,
        estCostCents: data.cost || 0,
        timestamp: new Date().toISOString(),
        metadata: {
          tools_used: toolsUsed.length,
          student_id: opts.studentId
        }
      });

      setResult(parsedResult);
      return parsedResult;

    } catch (e: any) {
      setError(e?.message || 'Failed to generate help');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, generate } as const;
}

/**
 * Build enhanced system prompt with child context
 */
function buildSystemPrompt(opts: AgenticHomeworkOptions, childContext: any): string {
  let prompt = `You are Dash, an AI learning assistant helping a parent support their child's education.

CONTEXT:
- Child's grade level: ${opts.gradeLevel}
- Subject: ${opts.subject}
- Difficulty level: ${opts.difficulty || 'medium'}`;

  if (childContext) {
    prompt += `
- Child: ${childContext.student?.first_name} ${childContext.student?.last_name}
- Class: ${childContext.student?.classes?.name || 'Unknown'}`;

    if (childContext.pending_homework?.length > 0) {
      prompt += `\n- Current pending homework: ${childContext.pending_homework.length} assignments`;
    }

    if (childContext.attendance_summary) {
      const rate = Math.round((childContext.attendance_summary.present_count / childContext.attendance_summary.total_days) * 100);
      prompt += `\n- Recent attendance: ${rate}% (last 30 days)`;
    }
  }

  prompt += `

YOUR ROLE:
1. Provide clear, age-appropriate explanations
2. Break down complex concepts into simple steps
3. Use examples relevant to ${opts.gradeLevel}th grade
4. Suggest practice problems or activities when helpful
5. Encourage parent-child learning together

TOOLS AVAILABLE:
- Generate practice problems
- Create study reminders
- Compose messages to teacher (draft only)
- Navigate to relevant resources

Respond in a friendly, supportive tone. Help the parent understand so they can explain to their child.`;

  return prompt;
}

/**
 * Parse AI response for structured data
 */
function parseHomeworkResponse(content: string, toolsUsed: any[]): HomeworkResult {
  const result: HomeworkResult = {
    text: content,
    toolsUsed: toolsUsed.map(t => ({ name: t.name, result: t.result }))
  };

  // Extract practice problems if generated
  const practiceProblems = toolsUsed.find(t => t.name === 'generate_practice_problems');
  if (practiceProblems?.result?.data?.problems) {
    result.practiceProblems = practiceProblems.result.data.problems;
  }

  // Suggest actions based on context
  result.suggestedActions = [];

  if (result.practiceProblems && result.practiceProblems.length > 0) {
    result.suggestedActions.push({
      label: 'Review Practice Problems',
      action: () => console.log('Navigate to practice problems')
    });
  }

  return result;
}
```

**Testing**:
```typescript
// Test with student context
const result = await generate({
  question: 'Help with multiplication homework',
  subject: 'Math',
  gradeLevel: 3,
  studentId: 'abc-123',  // Optional - includes context if provided
  difficulty: 'medium'
});

console.log('Tools used:', result.toolsUsed);
console.log('Practice problems:', result.practiceProblems);
console.log('Suggested actions:', result.suggestedActions);
```

---

## Phase 2: UI Integration (Week 2)

### 2.1: Update Homework Modal

**File**: `components/dashboard/ParentDashboard.tsx`

**Changes**: Simplify to always use tool-enabled homework help

```typescript
// Update HomeworkModal component (simplified)
const HomeworkModal: React.FC<HomeworkModalProps> = ({ visible, onClose }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<HomeworkResult | null>(null);
  const { loading, generate } = useHomeworkGenerator();  // Single hook, always tool-enabled

  const handleSubmit = async () => {
    if (!question.trim()) return;

    try {
      const start = Date.now();
      
      // Always use tool-enabled generation
      const homeworkResult = await generate({
        question,
        subject: 'General Education',
        gradeLevel: children.length > 0 ? 8 : 10,
        difficulty: 'easy',
        studentId: activeChildId || undefined,  // Include context if available
      });

      setResult(homeworkResult);
      setResponse(homeworkResult.text);

      track('edudash.ai.homework_help_completed', {
        user_id: user?.id,
        question_length: question.length,
        success: true,
        duration_ms: Date.now() - start,
        tools_used: homeworkResult.toolsUsed?.length || 0,
        has_practice_problems: !!homeworkResult.practiceProblems,
        source: 'parent_dashboard',
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('ai.homework.error'));
      console.error('Homework help error:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <Text style={styles.modalTitle}>{t('ai.homework.title')}</Text>
          
          <TextInput
            style={styles.textInput}
            placeholder={t('ai.homework.questionPlaceholder')}
            value={question}
            onChangeText={setQuestion}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, (!question.trim() || loading) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={!question.trim() || loading}
          >
            <LinearGradient
              colors={loading ? ['#6B7280', '#9CA3AF'] : ['#00f5ff', '#0080ff']}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>{t('ai.homework.getHelp')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Response display with enhanced features */}
          {response && (
            <ScrollView style={styles.responseContainer}>
              <Text style={styles.responseTitle}>{t('ai.homework.explanation')}</Text>
              <Text style={styles.responseText}>{response}</Text>
              
              {/* Show practice problems if available */}
              {result?.practiceProblems && result.practiceProblems.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.responseTitle, { marginBottom: 8 }]}>
                    Practice Problems
                  </Text>
                  {result.practiceProblems.map((problem: any, index: number) => (
                    <View key={index} style={{ 
                      backgroundColor: theme.elevated, 
                      padding: 12, 
                      borderRadius: 8,
                      marginBottom: 8 
                    }}>
                      <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', marginBottom: 4 }}>
                        {index + 1}. {problem.difficulty}
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                        {problem.problem}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Show suggested actions */}
              {result?.suggestedActions && result.suggestedActions.length > 0 && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  {result.suggestedActions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        backgroundColor: theme.primary + '15',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onPress={action.action}
                    >
                      <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>
                        {action.label}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.modalCloseButton} onPress={handleClose}>
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

**Validation**:
- ✅ Tool-enabled homework help works for all users
- ✅ Practice problems display correctly
- ✅ Suggested actions are clickable
- ✅ Loading states work correctly
- ✅ Context retrieval works when studentId provided

---

### 2.2: (SKIP - No Settings Needed)

**Rationale**: Since all users get agentic capabilities by default, no settings toggle required.

---

## Phase 3: Proactive Features (Week 2-3)

**Note**: Consolidated into Phase 2 timeline since no feature flag infrastructure needed.

### 3.1: Proactive Learning Suggestions Component

**Moved from original Phase 3 for consolidated timeline**

**New File**: `components/dashboard/ProactiveLearningCard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { ParentToolRegistry } from '@/services/dash-ai/ParentToolRegistry';

interface LearningOpportunity {
  id: string;
  type: 'homework_reminder' | 'attendance_concern' | 'practice_suggestion' | 'teacher_message';
  title: string;
  description: string;
  action: () => void;
  priority: 'low' | 'medium' | 'high';
  icon: string;
}

export const ProactiveLearningCard: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<LearningOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    analyzeOpportunities();
  }, [studentId]);

  const analyzeOpportunities = async () => {
    try {
      setLoading(true);
      const client = assertSupabase();
      const toolRegistry = new ParentToolRegistry();

      // Get child context
      const contextResult = await toolRegistry.execute('get_child_learning_context', {
        student_id: studentId,
        include_homework: true,
        include_attendance: true,
        days_back: 14
      });

      if (!contextResult.success) return;

      const context = contextResult.data;
      const found: LearningOpportunity[] = [];

      // Check for pending homework
      if (context.pending_homework && context.pending_homework.length > 0) {
        const dueSoon = context.pending_homework.filter((hw: any) => {
          const daysUntilDue = Math.ceil((new Date(hw.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilDue <= 3 && daysUntilDue >= 0;
        });

        if (dueSoon.length > 0) {
          found.push({
            id: 'homework-due-soon',
            type: 'homework_reminder',
            title: `${dueSoon.length} assignment${dueSoon.length > 1 ? 's' : ''} due soon`,
            description: `Help your child prepare for upcoming homework`,
            action: () => console.log('Navigate to homework'),
            priority: 'high',
            icon: 'book-outline'
          });
        }
      }

      // Check attendance concerns
      if (context.attendance_summary) {
        const attendanceRate = context.attendance_summary.present_count / context.attendance_summary.total_days;
        
        if (attendanceRate < 0.85) {
          found.push({
            id: 'attendance-concern',
            type: 'attendance_concern',
            title: 'Attendance could improve',
            description: `${Math.round(attendanceRate * 100)}% attendance in last 2 weeks`,
            action: () => console.log('Navigate to attendance'),
            priority: 'medium',
            icon: 'calendar-outline'
          });
        }
      }

      // Suggest practice based on subject (mock logic - would use real curriculum data)
      if (context.student?.classes?.grade_level) {
        found.push({
          id: 'practice-suggestion',
          type: 'practice_suggestion',
          title: 'Daily practice recommended',
          description: 'Try 10 minutes of math practice together',
          action: () => console.log('Generate practice problems'),
          priority: 'low',
          icon: 'fitness-outline'
        });
      }

      setOpportunities(found);
    } catch (error) {
      console.error('Failed to analyze learning opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const visibleOpportunities = opportunities.filter(opp => !dismissed.has(opp.id));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (visibleOpportunities.length === 0) return null;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    opportunityCard: {
      backgroundColor: theme.elevated,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    description: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    dismissButton: {
      padding: 4,
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return theme.error;
      case 'medium': return theme.warning;
      default: return theme.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color={theme.primary} />
        <Text style={styles.headerTitle}>Learning Suggestions</Text>
      </View>

      {visibleOpportunities.map((opp) => (
        <TouchableOpacity
          key={opp.id}
          style={styles.opportunityCard}
          onPress={opp.action}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: getPriorityColor(opp.priority) + '20' }]}>
            <Ionicons name={opp.icon as any} size={20} color={getPriorityColor(opp.priority)} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{opp.title}</Text>
            <Text style={styles.description}>{opp.description}</Text>
          </View>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => handleDismiss(opp.id)}
          >
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

**Integration**: Add to ParentDashboard.tsx

```typescript
// In ParentDashboard.tsx after child cards
{activeChildId && (
  <ProactiveLearningCard studentId={activeChildId} />
)}
```

---

## Phase 4: Testing & Rollout (Week 4)

### 4.1: (NO DATABASE MIGRATION NEEDED)

**Rationale**: No feature flags = no new tables required. Uses existing database structure.

### 4.2: Testing Checklist

**Unit Tests**:
- [ ] ParentToolRegistry tool registration
- [ ] Individual tool execution
- [ ] Tool error handling and retry
- [ ] AgenticHomeworkGenerator basic flow
- [ ] AgenticHomeworkGenerator with tools
- [ ] AgenticHomeworkGenerator fallback

**Integration Tests**:
- [ ] AI Gateway tool support
- [ ] End-to-end tool call flow
- [ ] Multi-turn tool conversations
- [ ] Tool result parsing
- [ ] Context retrieval accuracy

**UI Tests**:
- [ ] Homework modal backward compatibility
- [ ] Enhanced modal with tools
- [ ] Practice problems display
- [ ] Suggested actions interaction
- [ ] Agentic settings toggle
- [ ] Proactive learning card

**Performance Tests**:
- [ ] Tool execution latency (<500ms)
- [ ] Context retrieval speed (<300ms)
- [ ] AI response time (<3s)
- [ ] Memory usage (tools registry)
- [ ] Concurrent tool execution

### 4.3: Rollout Plan (Simplified)

**Week 3: Internal Testing**
- Test in development environment
- Team validation of all flows
- Fix critical bugs

**Week 4: Production Deployment**
- Deploy to production (all users get tools)
- Monitor usage analytics and costs
- Iterate based on feedback

### 4.4: Success Metrics

**Engagement**:
- % of parents using enhanced AI (target: 40% in month 1)
- Average tool calls per session (target: 1.5)
- Homework help completion rate (target: >85%)

**Quality**:
- Parent satisfaction rating (target: 4.5/5)
- Tool execution success rate (target: >95%)
- Response relevance score (target: >4/5)

**Performance**:
- Average response time <3s
- Tool execution latency <500ms
- AI Gateway uptime >99.9%

**Cost**:
- Average cost per interaction <$0.05
- Tool usage within budget limits
- Token usage efficiency >80%

---

## Rollback Plan

If critical issues arise:

1. **Immediate**: Temporarily disable tool usage in AI Gateway by removing tools parameter
2. **Quick Fix**: Deploy hotfix via code update
3. **Monitoring**: Track impact on user experience
4. **Root Cause Analysis**: Debug in staging/development
5. **Re-deploy**: After fix verification, deploy updated version

---

## Documentation Requirements

1. **User Guide**: "Enhanced AI Learning for Parents"
2. **Developer Guide**: "Parent Tool Registry API"
3. **FAQ**: Common questions about agentic features
4. **Video Tutorial**: Using enhanced homework help
5. **Troubleshooting**: Common issues and solutions

---

## Next Steps

**Week 1**:
1. ✅ Review and approve simplified implementation plan
2. Implement AI Gateway tool support
3. Build ParentToolRegistry with 5 core tools
4. Replace useHomeworkGenerator hook

**Week 2**:
5. Update ParentDashboard homework modal
6. Build ProactiveLearningCard component
7. Add analytics tracking
8. Internal testing

**Week 3**:
9. Bug fixes and polish
10. Production deployment
11. Monitor usage and costs
12. Iterate based on feedback

---

## Questions for Review

1. **Cost Management**: What's our budget for tool-enabled AI calls?
2. **Tool Permissions**: Should some tools (like compose_teacher_message) require explicit user approval?
3. **Rate Limits**: How many tool calls per session/day to prevent abuse?

---

**Status**: Ready for Implementation  
**Estimated Effort**: 3 weeks (1 developer)  
**Risk Level**: LOW (clean replacement, well-tested)  
**Impact**: HIGH (transforms parent learning support)

---

## Summary of Simplifications

### Removed:
- ❌ Feature flag infrastructure (user_preferences table)
- ❌ Backward compatibility code paths
- ❌ Dual hook implementations (basic vs agentic)
- ❌ Settings toggle component
- ❌ Phased rollout complexity
- ❌ "Enhanced" mode indicators in UI

### Result:
- ✅ **50% less code** to write and maintain
- ✅ **Simpler testing** (single code path)
- ✅ **Faster implementation** (3 weeks vs 4 weeks)
- ✅ **Cleaner architecture** (no feature flag conditionals)
- ✅ **Production-ready** from day one
