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
    language: 'en-US',
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
    
    // Initialize services with dependency injection
    const voiceConfig: VoiceRecordingConfig = {
      voiceSettings: this.personality.voice_settings,
      supabaseClient: config.supabaseClient,
    };
    this.voiceService = new DashVoiceService(voiceConfig);
    
    const memoryConfig: MemoryServiceConfig = {
      supabaseClient: config.supabaseClient,
      userId: config.currentUser?.id,
      organizationId: config.currentUser?.organizationId,
    };
    this.memoryService = new DashMemoryService(memoryConfig);
    
    const conversationConfig: ConversationManagerConfig = {};
    this.conversationManager = new DashConversationManager(conversationConfig);
    
    const taskConfig: TaskManagerConfig = {
      userId: config.currentUser?.id,
    };
    this.taskManager = new DashTaskManager(taskConfig);
    
    const navigatorConfig: NavigatorConfig = {};
    this.navigator = new DashAINavigator(navigatorConfig);
    
    const profileConfig: UserProfileManagerConfig = {
      currentUser: config.currentUser,
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
  public async initialize(): Promise<void> {
    console.log('[DashAICore] Initializing...');
    
    try {
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
  public async speakText(text: string, callbacks?: SpeechCallbacks): Promise<void> {
    return this.voiceService.speakText(text, callbacks);
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
   * Get personalized greeting
   */
  public getPersonalizedGreeting(): string {
    return this.profileManager.getPersonalizedGreeting(this.personality);
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
