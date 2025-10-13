/**
 * AgentTools - Registry of all capabilities available to the AI agent
 * Maps existing app functionality to LLM-callable tools
 */

import { DashAIAssistant } from './DashAIAssistant';
import { DashTaskAutomation } from './DashTaskAutomation';
import { WorksheetService } from './WorksheetService';
import { EducationalPDFService } from '@/lib/services/EducationalPDFService';

export interface AgentTool {
  name: string;
  description: string;
  parameters: any; // JSON Schema
  risk: 'low' | 'medium' | 'high';
  requiresConfirmation?: boolean;
  execute: (args: any, context?: any) => Promise<any>;
}

class ToolRegistryClass {
  private static instance: ToolRegistryClass;
  private tools: Map<string, AgentTool> = new Map();

  static getInstance(): ToolRegistryClass {
    if (!ToolRegistryClass.instance) {
      ToolRegistryClass.instance = new ToolRegistryClass();
      ToolRegistryClass.instance.registerDefaultTools();
    }
    return ToolRegistryClass.instance;
  }

  /**
   * Register a new tool
   */
  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Get tool specifications for LLM
   */
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

  /**
   * Get a specific tool
   */
  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool
   */
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
      console.error(`[ToolRegistry] Tool ${toolName} failed:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Register default tools
   */
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
  }

  /**
   * Get tools by risk level
   */
  getToolsByRisk(riskLevel: 'low' | 'medium' | 'high'): AgentTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.risk === riskLevel);
  }

  /**
   * Get tool names for autocomplete
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

export const ToolRegistry = ToolRegistryClass.getInstance();