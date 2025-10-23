/**
 * DashAICore
 * 
 * Central orchestrator and public API for Dash AI Assistant.
 * Coordinates all modular services via dependency injection.
 * 
 * Architecture:
 * - Voice I/O: DashVoiceService
 * - Memory & Context: DashMemoryService  
 * - Conversations: DashConversationManager
 * - Tasks & Reminders: DashTaskManager
 * - Navigation: DashAINavigator
 * - User Profiles: DashUserProfileManager
 * 
 * Design principles:
 * - Composition over inheritance
 * - Dependency injection for testability
 * - Clean public API
 * - Service lifecycle management
 */

import { DashVoiceService, type VoiceRecordingConfig, type TranscriptionResult, type SpeechCallbacks } from './DashVoiceService';
import { DashMemoryService, type MemoryServiceConfig } from './DashMemoryService';
import { DashConversationManager, type ConversationManagerConfig } from './DashConversationManager';
import { DashTaskManager, type TaskManagerConfig } from './DashTaskManager';
import { DashAINavigator, type NavigatorConfig } from './DashAINavigator';
import { DashUserProfileManager, type UserProfileManagerConfig } from './DashUserProfileManager';
import type {
  DashMessage,
  DashConversation,
  DashMemoryItem,
  DashTask,
  DashReminder,
  DashPersonality,
} from './types';

/**
 * Default personality configuration
 */
const DEFAULT_PERSONALITY: DashPersonality = {
  name: 'Dash',
  greeting: "Hi! I'm Dash, your AI teaching assistant. How can I help you today?",
  personality_traits: [
    'helpful',
    'encouraging',
    'knowledgeable',
    'patient',
    'creative',
    'supportive',
    'proactive',
    'adaptive',
    'insightful',
  ],
  response_style: 'adaptive',
  expertise_areas: [
    'education',
    'lesson planning',
    'student assessment',
    'classroom management',
    'curriculum development',
    'educational technology',
    'parent communication',
    'task automation',
    'data analysis',
    'workflow optimization',
  ],
  voice_settings: {
    rate: 0.8,
    pitch: 1.0,
    language: 'en-ZA',
  },
  role_specializations: {
    teacher: {
      greeting: "Hello! I'm Dash, your teaching assistant. Ready to help with lesson planning, grading, and classroom management!",
      capabilities: [
        'lesson_planning',
        'grading_assistance',
        'parent_communication',
        'student_progress_tracking',
        'curriculum_alignment',
        'resource_suggestions',
        'behavior_management_tips',
        'assessment_creation',
      ],
      tone: 'encouraging and professional',
      proactive_behaviors: [
        'suggest_lesson_improvements',
        'remind_upcoming_deadlines',
        'flag_student_concerns',
        'recommend_resources',
      ],
      task_categories: ['academic', 'administrative', 'communication'],
    },
    principal: {
      greeting: "Good day! I'm Dash, here to help you lead your school to success today.",
      capabilities: [
        'staff_management',
        'budget_analysis',
        'policy_recommendations',
        'parent_communication',
        'data_analytics',
        'strategic_planning',
        'crisis_management',
        'compliance_tracking',
      ],
      tone: 'professional and strategic',
      proactive_behaviors: [
        'monitor_school_metrics',
        'suggest_policy_updates',
        'flag_budget_concerns',
        'track_compliance_deadlines',
      ],
      task_categories: ['administrative', 'strategic', 'compliance', 'communication'],
    },
    parent: {
      greeting: "Hi there! I'm Dash, your family's education assistant. I'm here to help with homework, track progress, and keep you connected with school.",
      capabilities: [
        'homework_assistance',
        'progress_tracking',
        'school_communication',
        'learning_resources',
        'study_planning',
        'activity_suggestions',
        'behavioral_support',
        'academic_guidance',
      ],
      tone: 'friendly and supportive',
      proactive_behaviors: [
        'remind_homework_deadlines',
        'suggest_learning_activities',
        'flag_progress_concerns',
        'recommend_parent_involvement',
      ],
      task_categories: ['academic_support', 'communication', 'personal'],
    },
    student: {
      greeting: "Hey! I'm Dash, your study buddy. Ready to help with homework, learning, and making school awesome!",
      capabilities: [
        'homework_help',
        'study_techniques',
        'concept_explanation',
        'practice_problems',
        'goal_setting',
        'time_management',
        'learning_games',
        'motivation_boost',
      ],
      tone: 'friendly and encouraging',
      proactive_behaviors: [
        'remind_study_sessions',
        'suggest_break_times',
        'celebrate_achievements',
        'recommend_study_methods',
      ],
      task_categories: ['academic', 'personal', 'motivational'],
    },
  },
  agentic_settings: {
    autonomy_level: 'medium',
    can_create_tasks: true,
    can_schedule_actions: true,
    can_access_data: true,
    can_send_notifications: false,
    requires_confirmation_for: [
      'send_external_emails',
      'modify_grades',
      'delete_important_data',
      'share_personal_information',
    ],
  },
};

/**
 * DashAICore configuration
 */
export interface DashAICoreConfig {
  /** Supabase client for backend operations */
  supabaseClient: any;
  /** User session data */
  currentUser?: {
    id: string;
    role: string;
    name?: string;
    email?: string;
    organizationId?: string;
    preschoolId?: string;  // REQUIRED for tenant isolation
  };
  /** Personality customization */
  personality?: Partial<DashPersonality>;
}

/**
 * DashAICore
 * Main orchestrator for Dash AI Assistant
 */
export class DashAICore {
  private static instance: DashAICore | null = null;
  
  // Services
  private voiceService: DashVoiceService;
  private memoryService: DashMemoryService;
  private conversationManager: DashConversationManager;
  private taskManager: DashTaskManager;
  private navigator: DashAINavigator;
  private profileManager: DashUserProfileManager;
  
  // Configuration
  private personality: DashPersonality;
  private supabaseClient: any;
  
  constructor(config: DashAICoreConfig) {
    this.supabaseClient = config.supabaseClient;
    this.personality = { ...DEFAULT_PERSONALITY, ...config.personality };
    
    // Initialize services lazily - will be created on first initialize() call
    this.voiceService = null as any;
    this.memoryService = null as any;
    this.conversationManager = null as any;
    this.taskManager = null as any;
    this.navigator = null as any;
    this.profileManager = null as any;
  }
  
  private initializeServices(config?: { supabaseClient?: any; currentUser?: any }) {
    if (config?.supabaseClient) {
      this.supabaseClient = config.supabaseClient;
    }
    
    // Initialize services with dependency injection
    const voiceConfig: VoiceRecordingConfig = {
      voiceSettings: this.personality.voice_settings,
      supabaseClient: this.supabaseClient,
    };
    this.voiceService = new DashVoiceService(voiceConfig);
    
    const memoryConfig: MemoryServiceConfig = {
      supabaseClient: this.supabaseClient,
      userId: config?.currentUser?.id,
      organizationId: config?.currentUser?.organizationId,
    };
    this.memoryService = new DashMemoryService(memoryConfig);
    
    // CRITICAL: Pass userId and preschoolId for tenant isolation
    if (!config?.currentUser?.id || !config?.currentUser?.preschoolId) {
      console.warn('[DashAICore] Missing userId or preschoolId - conversation isolation disabled');
    }
    
    const conversationConfig: ConversationManagerConfig = {
      userId: config?.currentUser?.id || 'unknown',
      preschoolId: config?.currentUser?.preschoolId || 'unknown',
    };
    this.conversationManager = new DashConversationManager(conversationConfig);
    
    const taskConfig: TaskManagerConfig = {
      userId: config?.currentUser?.id,
    };
    this.taskManager = new DashTaskManager(taskConfig);
    
    const navigatorConfig: NavigatorConfig = {};
    this.navigator = new DashAINavigator(navigatorConfig);
    
    const profileConfig: UserProfileManagerConfig = {
      currentUser: config?.currentUser,
    };
    this.profileManager = new DashUserProfileManager(profileConfig);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DashAICore | null {
    return DashAICore.instance;
  }
  
  /**
   * Set singleton instance
   */
  public static setInstance(instance: DashAICore): void {
    DashAICore.instance = instance;
  }
  
  /**
   * Initialize all services
   */
  public async initialize(config?: { supabaseClient?: any; currentUser?: any }): Promise<void> {
    console.log('[DashAICore] Initializing...');
    
    try {
      // Initialize services if not already done or if config provided
      if (!this.voiceService || config) {
        this.initializeServices(config);
      }
      
      await Promise.all([
        this.voiceService.initializeAudio(),
        this.memoryService.initialize(),
        this.conversationManager.initialize(),
        this.taskManager.initialize(),
        this.profileManager.initialize(),
      ]);
      
      console.log('[DashAICore] Initialization complete');
    } catch (error) {
      console.error('[DashAICore] Initialization failed:', error);
      throw error;
    }
  }
  
  // ==================== VOICE API ====================
  
  /**
   * Start voice recording
   */
  public async startRecording(): Promise<void> {
    return this.voiceService.startRecording();
  }
  
  /**
   * Stop voice recording and return audio URI
   */
  public async stopRecording(): Promise<string> {
    return this.voiceService.stopRecording();
  }
  
  /**
   * Check if currently recording
   */
  public isCurrentlyRecording(): boolean {
    return this.voiceService.isCurrentlyRecording();
  }
  
  /**
   * Transcribe audio to text
   */
  public async transcribeAudio(audioUri: string, userId?: string): Promise<TranscriptionResult> {
    return this.voiceService.transcribeAudio(audioUri, userId);
  }
  
  /**
   * Speak text using TTS
   */
  public async speakText(text: string, callbacks?: SpeechCallbacks, opts?: { language?: string }): Promise<void> {
    return this.voiceService.speakText(text, callbacks, opts);
  }
  
  /**
   * Stop current speech playback
   */
  public async stopSpeaking(): Promise<void> {
    return this.voiceService.stopSpeaking();
  }
  
  // ==================== CONVERSATION API ====================
  
  /**
   * Start a new conversation
   */
  public async startNewConversation(title?: string): Promise<string> {
    return this.conversationManager.startNewConversation(title);
  }
  
  
  /**
   * Get conversation by ID
   */
  public async getConversation(conversationId: string): Promise<DashConversation | null> {
    return this.conversationManager.getConversation(conversationId);
  }
  
  /**
   * Get all conversations
   */
  public async getAllConversations(): Promise<DashConversation[]> {
    return this.conversationManager.getAllConversations();
  }
  
  /**
   * Delete conversation
   */
  public async deleteConversation(conversationId: string): Promise<void> {
    return this.conversationManager.deleteConversation(conversationId);
  }
  
  /**
   * Get current conversation ID
   */
  public getCurrentConversationId(): string | null {
    return this.conversationManager.getCurrentConversationId();
  }
  
  /**
   * Set current conversation ID
   */
  public setCurrentConversationId(conversationId: string): void {
    this.conversationManager.setCurrentConversationId(conversationId);
  }
  
  /**
   * Add message to conversation
   */
  public async addMessageToConversation(
    conversationId: string,
    message: DashMessage
  ): Promise<void> {
    return this.conversationManager.addMessageToConversation(conversationId, message);
  }
  
  /**
   * Export conversation as text
   */
  public async exportConversation(conversationId: string): Promise<string> {
    return this.conversationManager.exportConversation(conversationId);
  }
  
  // ==================== MEMORY API ====================
  
  /**
   * Add memory item
   */
  public async addMemoryItem(
    item: Omit<DashMemoryItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DashMemoryItem> {
    return this.memoryService.addMemoryItem(item);
  }
  
  /**
   * Get memory items (optionally filtered)
   */
  public getMemoryItems(filter?: {
    type?: DashMemoryItem['type'];
    tags?: string[];
    minConfidence?: number;
  }): DashMemoryItem[] {
    return this.memoryService.getMemoryItems(filter);
  }
  
  /**
   * Get relevant memories for a query
   */
  public getRelevantMemories(query: string, limit?: number): DashMemoryItem[] {
    return this.memoryService.getRelevantMemories(query, limit);
  }
  
  /**
   * Clear all memory
   */
  public async clearMemory(): Promise<void> {
    return this.memoryService.clearMemory();
  }
  
  /**
   * Redact PII from text
   */
  public redactPII(text: string): { redacted: string; hadPII: boolean } {
    return this.memoryService.redactPII(text);
  }
  
  // ==================== TASK & REMINDER API ====================
  
  /**
   * Create a task
   */
  public async createTask(
    title: string,
    description: string,
    type?: DashTask['type'],
    assignedTo?: string
  ): Promise<DashTask> {
    return this.taskManager.createTask(title, description, type, assignedTo);
  }
  
  /**
   * Get active tasks
   */
  public getActiveTasks(): DashTask[] {
    return this.taskManager.getActiveTasks();
  }
  
  /**
   * Create a reminder
   */
  public async createReminder(
    title: string,
    message: string,
    triggerAt: number,
    priority?: DashReminder['priority']
  ): Promise<DashReminder> {
    return this.taskManager.createReminder(title, message, triggerAt, priority);
  }
  
  /**
   * Get active reminders
   */
  public getActiveReminders(): DashReminder[] {
    return this.taskManager.getActiveReminders();
  }
  
  // ==================== NAVIGATION API ====================
  
  /**
   * Navigate to a screen
   */
  public async navigateToScreen(
    route: string,
    params?: Record<string, any>
  ): Promise<{ success: boolean; screen?: string; error?: string }> {
    return this.navigator.navigateToScreen(route, params);
  }
  
  /**
   * Navigate using voice command
   */
  public async navigateByVoice(command: string): Promise<{ success: boolean; screen?: string; error?: string }> {
    return this.navigator.navigateByVoice(command);
  }
  
  /**
   * Open lesson generator with parameters
   */
  public openLessonGenerator(params: Record<string, string>): void {
    this.navigator.openLessonGenerator(params);
  }
  
  /**
   * Open worksheet demo with parameters
   */
  public openWorksheetDemo(params: Record<string, string>): void {
    this.navigator.openWorksheetDemo(params);
  }
  
  // ==================== USER PROFILE API ====================
  
  /**
   * Get user profile
   */
  public getUserProfile() {
    return this.profileManager.getUserProfile();
  }
  
  /**
   * Update user preferences
   */
  public async updateUserPreferences(
    preferences: Partial<any>
  ): Promise<void> {
    return this.profileManager.updatePreferences(preferences);
  }
  
  /**
   * Set language preference
   */
  public async setLanguage(language: string): Promise<void> {
    await this.profileManager.setLanguage(language);
    
    // Update voice settings
    this.voiceService.updateConfig({
      voiceSettings: {
        ...this.personality.voice_settings,
        language,
      },
      supabaseClient: this.supabaseClient,
    });
  }
  
  /**
   * Get language preference
   */
  public getLanguage(): string | undefined {
    return this.profileManager.getLanguage();
  }
  
  // ==================== PERSONALITY & SETTINGS ====================
  
  /**
   * Get personality
   */
  public getPersonality(): DashPersonality {
    return this.personality;
  }
  
  /**
   * Update personality settings
   */
  public updatePersonality(personality: Partial<DashPersonality>): void {
    this.personality = { ...this.personality, ...personality };
    
    // Update voice service if voice settings changed
    if (personality.voice_settings) {
      this.voiceService.updateConfig({
        voiceSettings: this.personality.voice_settings,
        supabaseClient: this.supabaseClient,
      });
    }
  }
  
  /**
   * Save personality settings (alias for updatePersonality for backward compatibility)
   */
  public async savePersonality(personality: Partial<DashPersonality>): Promise<void> {
    this.updatePersonality(personality);
  }
  
  /**
   * Get personalized greeting
   */
  public getPersonalizedGreeting(): string {
    return this.profileManager.getPersonalizedGreeting(this.personality);
  }
  
  // ==================== AI INTEGRATION ====================
  
  /**
   * Send a message and get AI response with optional streaming
   * @param content Message content
   * @param conversationId Optional conversation ID
   * @param attachments Optional file attachments
   * @param onStreamChunk Optional callback for streaming chunks
   */
  public async sendMessage(
    content: string,
    conversationId?: string,
    attachments?: any[],
    onStreamChunk?: (chunk: string) => void
  ): Promise<DashMessage> {
    const convId = conversationId || this.getCurrentConversationId();
    if (!convId) {
      throw new Error('No active conversation');
    }
    
    // Create user message
    const userMessage: DashMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    };
    
    // Add user message to conversation
    await this.addMessageToConversation(convId, userMessage);
    
    // Generate AI response
    const assistantMessage = await this.generateAIResponse(
      content,
      convId,
      attachments,
      onStreamChunk
    );
    
    // Add assistant message to conversation
    await this.addMessageToConversation(convId, assistantMessage);
    
    return assistantMessage;
  }
  
  /**
   * Generate AI response (private helper)
   */
  private async generateAIResponse(
    userInput: string,
    conversationId: string,
    attachments?: any[],
    onStreamChunk?: (chunk: string) => void
  ): Promise<DashMessage> {
    try {
      // Get conversation history for context
      const conversation = await this.getConversation(conversationId);
      const recentMessages = conversation?.messages?.slice(-5) || [];
      
      // Build context for AI
      const context = {
        userInput,
        conversationHistory: recentMessages,
        personality: this.personality,
        attachments,
      };
      
      // Reply language directive based on current voice settings
      const replyLocale = (this.personality?.voice_settings?.language || 'en-ZA') as string;
      const langMap: Record<string, string> = {
        'en-ZA': 'English (South Africa)',
        'af-ZA': 'Afrikaans',
        'zu-ZA': 'Zulu (isiZulu)',
        'xh-ZA': 'Xhosa (isiXhosa)',
        'nso-ZA': 'Northern Sotho (Sepedi)',
      };
      const langDirective = `REPLY LANGUAGE: Reply strictly in ${langMap[replyLocale] || 'English (South Africa)'} (${replyLocale}). If the user switches language, switch accordingly.`;
      
      // Call AI service with streaming support
      const shouldStream = typeof onStreamChunk === 'function';
      const response = await this.callAIService({
        action: 'general_assistance',
        messages: this.buildMessageHistory(recentMessages, userInput),
        context: `User role: ${this.profileManager.getUserProfile()?.role || 'educator'}\n${langDirective}`,
        attachments,
        stream: shouldStream,
        onChunk: onStreamChunk,
      });
      
      // Create assistant message
      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: response.content || 'I apologize, but I encountered an issue processing your request.',
        timestamp: Date.now(),
        metadata: response.metadata,
      };
    } catch (error) {
      console.error('[DashAICore] Failed to generate response:', error);
      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: "I'm sorry, I'm having trouble processing that right now. Could you please try again?",
        timestamp: Date.now(),
      };
    }
  }
  
  /**
   * Build system prompt with CAPS awareness
   */
  private buildSystemPrompt(): string {
    const userRole = this.profileManager.getUserProfile()?.role || 'educator';
    const roleSpec = this.personality.role_specializations[userRole];
    const capabilities = roleSpec?.capabilities || [];
    
    return `You are Dash, an AI Teaching Assistant specialized in early childhood education and preschool management.

CORE PERSONALITY: ${this.personality.personality_traits.join(', ')}

RESPONSE GUIDELINES:
- Be concise, practical, and directly helpful
- Provide specific, actionable advice
- Reference educational best practices when relevant
- Use a warm but professional tone
- If the user request is ambiguous, ASK ONE brief clarifying question before proceeding

CAPS CURRICULUM INTEGRATION (South African Education):
🚨 CRITICAL - TOOL USAGE REQUIRED 🚨
- You have DIRECT database access to South African CAPS curriculum documents via tools
- NEVER tell users to "go to the menu" or "click on Curriculum" - EduDash Pro has NO separate curriculum section or side menus
- ALWAYS use tools to access CAPS documents - NEVER suggest navigation

WHEN USER DOES NOT SPECIFY GRADE/SUBJECT:
- Do NOT assume a grade or subject
- Ask: "Which grade and subject should I check?" and provide a short example (e.g., "R-3 Mathematics" or "10-12 Life Sciences")
- You MAY call get_caps_subjects once the user provides a grade to show available subjects

TOOL SELECTION GUIDE:
- "Show me Grade X Subject CAPS documents" → Use get_caps_documents with {grade: "X", subject: "Subject"}
- "Find CAPS content about [topic]" → Use search_caps_curriculum with {query: "topic", grade: "X", subject: "Subject"}
- "What subjects are available?" → Use get_caps_subjects with {grade: "X"}

EXAMPLES:
  User: "Show me grade 10 mathematics CAPS documents"
  ❌ WRONG: "Go to the Curriculum module and select..."
  ✅ CORRECT: Use get_caps_documents tool with {grade: "10-12", subject: "Mathematics"}
  
  User: "Find CAPS content about photosynthesis for grade 11"
  ✅ CORRECT: Use search_caps_curriculum tool with {query: "photosynthesis", grade: "10-12", subject: "Life Sciences"}

- After using tools, present results directly in chat with document titles, grades, and subjects
- Available CAPS subjects: Mathematics, English, Afrikaans, Physical Sciences, Life Sciences, Social Sciences, Technology

ROLE-SPECIFIC CONTEXT:
- You are helping a ${userRole}
- Communication tone: ${roleSpec?.tone || 'professional'}
- Your specialized capabilities: ${capabilities.join(', ')}

🚨 CRITICAL LIMITATIONS 🚨:
- You CANNOT send emails or messages directly
- You CANNOT make phone calls or send SMS
- You CANNOT create or modify database records without explicit user confirmation
- When asked to send communications, use the compose_message tool to OPEN A COMPOSER UI
- NEVER claim you sent an email/message unless a tool explicitly confirmed it was sent
- If you don't have a tool for a task, tell the user honestly: "I can't do that, but I can help you with..."

IMPORTANT: Always use tools to access real data. Never make up information. Never claim to perform actions you cannot do.`
  }
  
  /**
   * Build message history for AI context
   */
  private buildMessageHistory(recentMessages: DashMessage[], currentInput: string): any[] {
    const messages = [];
    
    for (const msg of recentMessages) {
      if (msg.type === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.type === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }
    
    messages.push({ role: 'user', content: currentInput });
    return messages;
  }
  
  /**
   * Call AI service with tool support (non-streaming)
   */
  private async callAIService(params: any): Promise<any> {
    try {
      // Build prompt text and call ai-proxy (compliant path)
      // Tool registry not used with ai-proxy standardization
      const toolSpecs = undefined as any;
      
      // Tools enabled - Anthropic API key configured
      const ENABLE_TOOLS = false;
      
      console.log('[DashAICore] Calling AI service:', {
        action: params.action,
        streaming: params.stream || false,
        toolsAvailable: ENABLE_TOOLS ? toolSpecs?.length || 0 : 0,
        toolsDisabled: !ENABLE_TOOLS,
      });
      
      // Build system prompt with CAPS awareness
      const systemPrompt = undefined as any;
      
      // If streaming requested, use streaming endpoint
      if (params.stream && params.onChunk) {
        // Build prompt from messages and delegate to streaming path
        const messagesArr = Array.isArray(params.messages) ? params.messages : [];
        const promptText = messagesArr.length > 0
          ? messagesArr.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content || ''}`).join('\n')
          : String(params.content || params.userInput || '');
        return await this.callAIServiceStreaming({ promptText, context: params.context || undefined }, params.onChunk);
      }
      
      // Non-streaming call to ai-proxy
      const messagesArr = Array.isArray(params.messages) ? params.messages : [];
      const promptText = messagesArr.length > 0
        ? messagesArr.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content || ''}`).join('\n')
        : String(params.content || params.userInput || '');
      const role = (this.profileManager.getUserProfile()?.role || 'teacher').toString().toLowerCase();
      const scope: 'teacher' | 'principal' | 'parent' = (['teacher', 'principal', 'parent'].includes(role) ? role : 'teacher') as any;
      const { data, error } = await this.supabaseClient.functions.invoke('ai-proxy', {
        body: {
          scope,
          service_type: 'dash_conversation',
          payload: {
            prompt: promptText,
            context: params.context || undefined,
          },
          stream: false,
        },
      });
      
      if (error) {
        console.error('[DashAICore] AI service error:', error);
        throw error;
      }
      
      // Tool use not supported via ai-proxy in this path
      const toolUse = null;
      const assistantContent = data?.content || '';

      if (!data?.success) {
        return { content: assistantContent };
      }
      return { content: data.content, metadata: { usage: data.usage } };
    } catch (error) {
      console.error('[DashAICore] AI service call failed:', error);
      return {
        content: 'I apologize, but I encountered an issue. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Call AI service with streaming support (SSE)
   * 
   * Note: Streaming is not supported on React Native due to fetch limitations.
   * For Phase 0, we fall back to non-streaming which is acceptable.
   * 
   * TODO (Phase 2): Implement WebSocket streaming for React Native
   * See: docs/features/DASH_AI_STREAMING_UPGRADE_PLAN.md
   */
  private async callAIServiceStreaming(params: any, onChunk: (chunk: string) => void): Promise<any> {
    try {
      const { data: sessionData } = await this.supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('No auth session for streaming');
      }
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('EXPO_PUBLIC_SUPABASE_URL not configured');
      }
      
      const url = `${supabaseUrl}/functions/v1/ai-proxy`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scope: (['teacher','principal','parent'].includes((this.profileManager.getUserProfile()?.role || 'teacher').toString().toLowerCase())
            ? (this.profileManager.getUserProfile()?.role || 'teacher').toString().toLowerCase()
            : 'teacher'),
          service_type: 'dash_conversation',
          payload: {
            prompt: params.promptText,
            context: params.context || undefined,
          },
          stream: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.status}`);
      }
      
      // React Native fetch doesn't support streaming ReadableStream
      // Fall back to reading the entire response and parsing SSE format
      if (!response.body || typeof response.body.getReader !== 'function') {
        console.warn('[DashAICore] Streaming not supported in this environment, parsing SSE from full response');
        const sseText = await response.text();
        
        // Parse SSE format to extract content_block_delta text chunks
        let accumulated = '';
        const lines = sseText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                accumulated += parsed.delta.text;
                onChunk(parsed.delta.text); // Send only the clean text
              }
            } catch (e) {
              console.warn('[DashAICore] Failed to parse SSE line:', line.substring(0, 100));
            }
          }
        }
        
        if (__DEV__) {
          console.log('[DashAICore] SSE fallback parsed, accumulated length:', accumulated.length);
        }
        
        return {
          content: accumulated || 'No content extracted from SSE stream',
          metadata: {},
        };
      }
      
      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                accumulated += parsed.delta.text;
                onChunk(parsed.delta.text);
              }
            } catch (e) {
              console.warn('[DashAICore] Failed to parse SSE chunk:', e);
            }
          }
        }
      }
      
      return {
        content: accumulated,
        metadata: {},
      };
    } catch (error) {
      console.error('[DashAICore] Streaming failed:', error);
      throw error;
    }
  }
  
  // ==================== LIFECYCLE ====================
  
  /**
   * Dispose and clean up all resources
   */
  public dispose(): void {
    console.log('[DashAICore] Disposing...');
    
    this.voiceService.dispose();
    this.memoryService.dispose();
    this.conversationManager.dispose();
    this.taskManager.dispose();
    this.profileManager.dispose();
    
    console.log('[DashAICore] Disposal complete');
  }
}

export default DashAICore;
