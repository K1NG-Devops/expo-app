/**
 * DashToolRegistry
 *
 * Registers and executes AI tools/functions available to Dash.
 * Extracted from AgentTools.ts as part of Phase 4.5 modularization.
 */

import { DashAIAssistant } from '../DashAIAssistant';
import { DashTaskAutomation } from '../DashTaskAutomation';
import { WorksheetService } from '../WorksheetService';
import { EducationalPDFService } from '@/lib/services/EducationalPDFService';

export interface AgentTool {
  name: string;
  description: string;
  parameters: any; // JSON Schema
  risk: 'low' | 'medium' | 'high';
  requiresConfirmation?: boolean;
  execute: (args: any, context?: any) => Promise<any>;
}

export class DashToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  // Register a new tool
  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[DashToolRegistry] Registered tool: ${tool.name}`);
  }

  // Get tool specifications for LLM
  getToolSpecs(): Array<{
    name: string;
    description: string;
    input_schema: any;
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }

  // Get a specific tool
  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  // Execute a tool
  async execute(
    toolName: string,
    args: any,
    context?: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, error: `Tool ${toolName} not found` };
    }

    try {
      const result = await tool.execute(args, context);
      return { success: true, result };
    } catch (error) {
      console.error(`[DashToolRegistry] Tool ${toolName} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Register default tools
  private registerDefaultTools(): void {
    const dash = DashAIAssistant.getInstance();
    const taskAutomation = DashTaskAutomation.getInstance();
    const worksheetService = new WorksheetService();

    // Navigation tool
    this.register({
      name: 'navigate_to_screen',
      description: 'Navigate to a specific screen in the app (e.g., students, lessons, worksheets, reports)',
      parameters: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'Screen name: dashboard, students, lessons, worksheets, assignments, reports, settings, chat'
          },
          params: {
            type: 'object',
            description: 'Optional parameters to pass to the screen'
          }
        },
        required: ['screen']
      },
      risk: 'low',
      execute: async (args) => {
        return await dash.navigateToScreen(args.screen, args.params);
      }
    });

    // Lesson generator tool
    this.register({
      name: 'open_lesson_generator',
      description: 'Open the AI lesson generator with pre-filled parameters based on context',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          gradeLevel: { type: 'string' },
          topic: { type: 'string' },
          duration: { type: 'number', description: 'Duration in minutes' },
          objectives: { type: 'string' },
          curriculum: { type: 'string' }
        }
      },
      risk: 'low',
      execute: async (args, context) => {
        const userInput = context?.userInput || '';
        const aiResponse = context?.aiResponse || '';
        dash.openLessonGeneratorFromContext(userInput, aiResponse);
        return { opened: true };
      }
    });

    // Worksheet generation tool
    this.register({
      name: 'generate_worksheet',
      description: 'Generate educational worksheets (math, reading, or activity)',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['math', 'reading', 'activity'],
            description: 'Type of worksheet to generate'
          },
          ageGroup: {
            type: 'string',
            enum: ['3-4 years', '4-5 years', '5-6 years', '6-7 years']
          },
          difficulty: {
            type: 'string',
            enum: ['Easy', 'Medium', 'Hard']
          },
          topic: { type: 'string' },
          problemCount: { type: 'number' }
        },
        required: ['type', 'ageGroup']
      },
      risk: 'medium',
      execute: async (args) => {
        return await dash.generateWorksheetAutomatically(args);
      }
    });

    // Task creation tool
    this.register({
      name: 'create_task',
      description: 'Create an automated task or workflow',
      parameters: {
        type: 'object',
        properties: {
          templateId: {
            type: 'string',
            description: 'Task template ID (e.g., weekly_grade_report, lesson_plan_sequence)'
          },
          customParams: {
            type: 'object',
            description: 'Custom parameters for the task'
          }
        },
        required: ['templateId']
      },
      risk: 'medium',
      execute: async (args) => {
        return await dash.createAutomatedTask(args.templateId, args.customParams);
      }
    });

    // PDF export tool
    this.register({
      name: 'export_pdf',
      description: 'Export content as a PDF document',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['title', 'content']
      },
      risk: 'low',
      execute: async (args) => {
        return await dash.exportTextAsPDFForDownload(args.title, args.content);
      }
    });

    // Message composition tool
    this.register({
      name: 'compose_message',
      description: 'Open message composer with pre-filled content',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' },
          recipient: { type: 'string', description: 'parent or teacher' }
        }
      },
      risk: 'low',
      execute: async (args) => {
        dash.openTeacherMessageComposer(args.subject, args.body);
        return { opened: true };
      }
    });

    // Context analysis tool
    this.register({
      name: 'get_screen_context',
      description: 'Get information about the current screen and available actions',
      parameters: {
        type: 'object',
        properties: {}
      },
      risk: 'low',
      execute: async () => {
        return dash.getCurrentScreenContext();
      }
    });

    // Task status tool
    this.register({
      name: 'get_active_tasks',
      description: 'Get list of active tasks and their status',
      parameters: {
        type: 'object',
        properties: {}
      },
      risk: 'low',
      execute: async () => {
        return dash.getActiveTasks();
      }
    });

    // ========================================
    // NEW: Essential Data Access Tools
    // ========================================

    // Get member/student list
    this.register({
      name: 'get_member_list',
      description: 'Get list of members (students/employees/athletes) with optional filters by group',
      parameters: {
        type: 'object',
        properties: {
          group_id: {
            type: 'string',
            description: 'Filter by specific group/class/team ID'
          },
          include_inactive: {
            type: 'boolean',
            description: 'Include inactive members (default: false)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 50)'
          }
        }
      },
      risk: 'low',
      execute: async (args, context) => {
        try {
          const supabase = (await import('@/lib/supabase')).assertSupabase();
          const profile = await (await import('@/lib/sessionManager')).getCurrentProfile();
          
          if (!profile) {
            return { success: false, error: 'User not authenticated' };
          }

          // Use organization_id (Phase 6D compatible)
          const orgId = (profile as any).organization_id || (profile as any).preschool_id;
          
          if (!orgId) {
            return { success: false, error: 'No organization found for user' };
          }

          let query = supabase
            .from('students')
            .select('id, first_name, last_name, date_of_birth, classroom_id, status')
            .eq('preschool_id', orgId);

          if (args.group_id) {
            query = query.eq('classroom_id', args.group_id);
          }

          if (!args.include_inactive) {
            query = query.eq('status', 'active');
          }

          query = query.limit(args.limit || 50);

          const { data, error } = await query;

          if (error) {
            return { success: false, error: error.message };
          }

          return {
            success: true,
            count: data?.length || 0,
            members: data || [],
            organization_id: orgId
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Get member progress/grades
    this.register({
      name: 'get_member_progress',
      description: 'Get detailed progress and performance data for a specific member',
      parameters: {
        type: 'object',
        properties: {
          member_id: {
            type: 'string',
            description: 'ID of the member to get progress for',
            required: true
          },
          subject: {
            type: 'string',
            description: 'Filter by specific subject (optional)'
          },
          date_range_days: {
            type: 'number',
            description: 'Number of days to look back (default: 30)'
          }
        },
        required: ['member_id']
      },
      risk: 'low',
      execute: async (args) => {
        try {
          const supabase = (await import('@/lib/supabase')).assertSupabase();
          
          // Get student info
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, first_name, last_name, classroom_id')
            .eq('id', args.member_id)
            .single();

          if (studentError || !student) {
            return { success: false, error: 'Member not found' };
          }

          // Get recent grades
          const daysBack = args.date_range_days || 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysBack);

          let gradesQuery = supabase
            .from('grades')
            .select('subject, score, date_recorded, assignment_name')
            .eq('student_id', args.member_id)
            .gte('date_recorded', startDate.toISOString())
            .order('date_recorded', { ascending: false })
            .limit(20);

          if (args.subject) {
            gradesQuery = gradesQuery.eq('subject', args.subject);
          }

          const { data: grades, error: gradesError } = await gradesQuery;

          // Calculate average
          const avgScore = grades && grades.length > 0
            ? grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length
            : null;

          return {
            success: true,
            member: {
              id: student.id,
              name: `${student.first_name} ${student.last_name}`
            },
            progress: {
              average_score: avgScore ? Math.round(avgScore * 10) / 10 : null,
              total_assessments: grades?.length || 0,
              recent_grades: grades || [],
              period_days: daysBack
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Get schedule/calendar
    this.register({
      name: 'get_schedule',
      description: 'Get schedule or calendar events for a date range',
      parameters: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'Start date (ISO format or "today", "tomorrow")'
          },
          days: {
            type: 'number',
            description: 'Number of days to show (default: 7)'
          }
        }
      },
      risk: 'low',
      execute: async (args) => {
        try {
          const supabase = (await import('@/lib/supabase')).assertSupabase();
          const profile = await (await import('@/lib/sessionManager')).getCurrentProfile();
          
          if (!profile) {
            return { success: false, error: 'User not authenticated' };
          }

          const orgId = (profile as any).organization_id || (profile as any).preschool_id;

          // Parse start date
          let startDate = new Date();
          if (args.start_date === 'tomorrow') {
            startDate.setDate(startDate.getDate() + 1);
          } else if (args.start_date && args.start_date !== 'today') {
            startDate = new Date(args.start_date);
          }
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (args.days || 7));

          const { data: events, error } = await supabase
            .from('calendar_events')
            .select('id, title, description, event_date, event_type, location')
            .eq('organization_id', orgId)
            .gte('event_date', startDate.toISOString())
            .lte('event_date', endDate.toISOString())
            .order('event_date', { ascending: true })
            .limit(50);

          if (error) {
            return { success: false, error: error.message };
          }

          return {
            success: true,
            period: {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
              days: args.days || 7
            },
            events: events || [],
            count: events?.length || 0
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Get assignments
    this.register({
      name: 'get_assignments',
      description: 'Get list of assignments with optional filters',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'submitted', 'graded', 'all'],
            description: 'Filter by assignment status (default: all)'
          },
          subject: {
            type: 'string',
            description: 'Filter by subject'
          },
          days_ahead: {
            type: 'number',
            description: 'Number of days to look ahead (default: 30)'
          }
        }
      },
      risk: 'low',
      execute: async (args) => {
        try {
          const supabase = (await import('@/lib/supabase')).assertSupabase();
          const profile = await (await import('@/lib/sessionManager')).getCurrentProfile();
          
          if (!profile) {
            return { success: false, error: 'User not authenticated' };
          }

          const orgId = (profile as any).organization_id || (profile as any).preschool_id;
          const userRole = (profile as any).role;

          const endDate = new Date();
          endDate.setDate(endDate.getDate() + (args.days_ahead || 30));

          let query = supabase
            .from('assignments')
            .select('id, title, description, subject, due_date, status, points_possible')
            .eq('school_id', orgId)
            .lte('due_date', endDate.toISOString())
            .order('due_date', { ascending: true })
            .limit(50);

          if (args.status && args.status !== 'all') {
            query = query.eq('status', args.status);
          }

          if (args.subject) {
            query = query.eq('subject', args.subject);
          }

          const { data: assignments, error } = await query;

          if (error) {
            return { success: false, error: error.message };
          }

          return {
            success: true,
            assignments: assignments || [],
            count: assignments?.length || 0,
            filters: {
              status: args.status || 'all',
              subject: args.subject,
              days_ahead: args.days_ahead || 30
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Analyze class performance
    this.register({
      name: 'analyze_class_performance',
      description: 'Analyze overall class or group performance with insights',
      parameters: {
        type: 'object',
        properties: {
          group_id: {
            type: 'string',
            description: 'ID of the class/group to analyze'
          },
          subject: {
            type: 'string',
            description: 'Filter by specific subject (optional)'
          },
          days_back: {
            type: 'number',
            description: 'Number of days to analyze (default: 30)'
          }
        }
      },
      risk: 'low',
      execute: async (args) => {
        try {
          const supabase = (await import('@/lib/supabase')).assertSupabase();
          const profile = await (await import('@/lib/sessionManager')).getCurrentProfile();
          
          if (!profile) {
            return { success: false, error: 'User not authenticated' };
          }

          const orgId = (profile as any).organization_id || (profile as any).preschool_id;

          // Get class info if group_id provided
          let className = 'All Classes';
          if (args.group_id) {
            const { data: classroom } = await supabase
              .from('classrooms')
              .select('name')
              .eq('id', args.group_id)
              .single();
            if (classroom) {
              className = classroom.name;
            }
          }

          // Get students in group
          let studentsQuery = supabase
            .from('students')
            .select('id, first_name, last_name')
            .eq('preschool_id', orgId)
            .eq('status', 'active');

          if (args.group_id) {
            studentsQuery = studentsQuery.eq('classroom_id', args.group_id);
          }

          const { data: students } = await studentsQuery;

          if (!students || students.length === 0) {
            return { success: false, error: 'No students found in group' };
          }

          // Get grades for analysis
          const daysBack = args.days_back || 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysBack);

          const studentIds = students.map(s => s.id);

          let gradesQuery = supabase
            .from('grades')
            .select('student_id, subject, score, date_recorded')
            .in('student_id', studentIds)
            .gte('date_recorded', startDate.toISOString());

          if (args.subject) {
            gradesQuery = gradesQuery.eq('subject', args.subject);
          }

          const { data: grades } = await gradesQuery;

          // Calculate statistics
          const totalGrades = grades?.length || 0;
          const avgScore = grades && grades.length > 0
            ? grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length
            : 0;

          // Find struggling students (below 60%)
          const studentScores = new Map<string, number[]>();
          grades?.forEach(g => {
            if (!studentScores.has(g.student_id)) {
              studentScores.set(g.student_id, []);
            }
            studentScores.get(g.student_id)?.push(g.score || 0);
          });

          const strugglingStudents = [];
          for (const [studentId, scores] of studentScores) {
            const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            if (avg < 60) {
              const student = students.find(s => s.id === studentId);
              if (student) {
                strugglingStudents.push({
                  id: studentId,
                  name: `${student.first_name} ${student.last_name}`,
                  average: Math.round(avg * 10) / 10
                });
              }
            }
          }

          return {
            success: true,
            group: {
              id: args.group_id,
              name: className,
              student_count: students.length
            },
            performance: {
              average_score: Math.round(avgScore * 10) / 10,
              total_assessments: totalGrades,
              period_days: daysBack,
              subject: args.subject || 'all subjects'
            },
            insights: {
              struggling_students: strugglingStudents,
              needs_attention: strugglingStudents.length > 0
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });
  }

  // Get tools by risk level
  getToolsByRisk(riskLevel: 'low' | 'medium' | 'high'): AgentTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.risk === riskLevel);
  }

  // Get tool names for autocomplete
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  dispose(): void {
    this.tools.clear();
  }
}

// Singleton instance for current architecture
export const ToolRegistry = new DashToolRegistry();
