/**
 * Dash AI Assistant Service
 * 
 * A comprehensive AI assistant with voice capabilities, persistent memory,
 * and deep integration with EduDash Pro services.
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assertSupabase } from '@/lib/supabase';
import { getCurrentSession, getCurrentProfile } from '@/lib/sessionManager';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { EducationalPDFService } from '@/lib/services/EducationalPDFService';
import { AIInsightsService } from '@/services/aiInsightsService';
import { WorksheetService } from './WorksheetService';
import { DashTaskAutomation } from './DashTaskAutomation';

// Dynamically import SecureStore for cross-platform compatibility
let SecureStore: any = null;
try {
  if (Platform.OS !== 'web') {
    SecureStore = require('expo-secure-store');
  }
} catch (e) {
  console.debug('SecureStore import failed (web or unsupported platform)', e);
}

export interface DashMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'task_result';
  content: string;
  timestamp: number;
  voiceNote?: {
    audioUri: string;
    duration: number;
    transcript?: string;
    storagePath?: string;
    bucket?: string;
    contentType?: string;
    language?: string;
    provider?: string;
  };
  metadata?: {
    context?: string;
    confidence?: number;
    suggested_actions?: string[];
    references?: Array<{
      type: 'lesson' | 'student' | 'assignment' | 'resource' | 'parent' | 'class' | 'task';
      id: string;
      title: string;
      url?: string;
    }>;
    dashboard_action?: {
      type: 'switch_layout' | 'open_screen' | 'execute_task' | 'create_reminder' | 'send_notification';
      layout?: 'classic' | 'enhanced';
      route?: string;
      params?: any;
      taskId?: string;
      task?: DashTask;
      reminder?: DashReminder;
    };
    emotions?: {
      sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
      detected_emotions: string[];
    };
    user_intent?: {
      primary_intent: string;
      secondary_intents: string[];
      confidence: number;
    };
    task_progress?: {
      taskId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
      progress: number;
      next_steps: string[];
    };
  };
}

export interface DashTask {
  id: string;
  title: string;
  description: string;
  type: 'one_time' | 'recurring' | 'workflow';
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string; // user role or specific user
  createdBy: string; // Dash or user
  createdAt: number;
  dueDate?: number;
  estimatedDuration?: number; // in minutes
  steps: DashTaskStep[];
  dependencies?: string[]; // other task IDs
  context: {
    conversationId: string;
    userRole: string;
    relatedEntities: Array<{
      type: 'student' | 'parent' | 'class' | 'lesson' | 'assignment';
      id: string;
      name: string;
    }>;
  };
  automation?: {
    triggers: string[];
    conditions: Record<string, any>;
    actions: DashAction[];
  };
  progress: {
    currentStep: number;
    completedSteps: string[];
    blockers?: string[];
    notes?: string;
  };
}

export interface DashTaskStep {
  id: string;
  title: string;
  description: string;
  type: 'manual' | 'automated' | 'approval_required';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  estimatedDuration?: number;
  requiredData?: Record<string, any>;
  validation?: {
    required: boolean;
    criteria: string[];
  };
  actions?: DashAction[];
}

export interface DashAction {
  id: string;
  type: 'navigate' | 'api_call' | 'notification' | 'data_update' | 'file_generation' | 'email_send';
  parameters: Record<string, any>;
  condition?: Record<string, any>;
  retries?: number;
  timeout?: number;
}

export interface DashReminder {
  id: string;
  title: string;
  message: string;
  type: 'one_time' | 'recurring';
  triggerAt: number;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: number;
  };
  userId: string;
  conversationId?: string;
  relatedTaskId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'triggered' | 'dismissed' | 'snoozed';
}

export interface DashConversation {
  id: string;
  title: string;
  messages: DashMessage[];
  created_at: number;
  updated_at: number;
  summary?: string;
  tags?: string[];
}

export interface DashMemoryItem {
  id: string;
  type: 'preference' | 'fact' | 'context' | 'skill' | 'goal' | 'interaction' | 'relationship' | 'pattern' | 'insight';
  key: string;
  value: any;
  confidence: number;
  created_at: number;
  updated_at: number;
  expires_at?: number;
  relatedEntities?: Array<{
    type: 'user' | 'student' | 'parent' | 'class' | 'subject';
    id: string;
    name: string;
  }>;
  embeddings?: number[]; // For semantic search
  reinforcement_count?: number;
  emotional_weight?: number; // How emotionally significant this memory is
  retrieval_frequency?: number; // How often this memory is accessed
  tags?: string[];
}

export interface DashUserProfile {
  userId: string;
  role: 'teacher' | 'principal' | 'parent' | 'student' | 'admin';
  name: string;
  preferences: {
    communication_style: 'formal' | 'casual' | 'friendly';
    notification_frequency: 'immediate' | 'daily_digest' | 'weekly_summary';
    preferred_subjects?: string[];
    working_hours?: {
      start: string;
      end: string;
      timezone: string;
    };
    task_management_style: 'detailed' | 'summary' | 'minimal';
    ai_autonomy_level: 'high' | 'medium' | 'low'; // How much Dash can act independently
  };
  context: {
    current_classes?: string[];
    current_students?: string[];
    current_subjects?: string[];
    organization_id?: string;
    grade_levels?: string[];
    responsibilities?: string[];
  };
  goals: {
    short_term: DashGoal[];
    long_term: DashGoal[];
    completed: DashGoal[];
  };
  interaction_patterns: {
    most_active_times: string[];
    preferred_task_types: string[];
    common_requests: Array<{
      pattern: string;
      frequency: number;
      last_used: number;
    }>;
    success_metrics: Record<string, number>;
  };
  memory_preferences: {
    remember_personal_details: boolean;
    remember_work_patterns: boolean;
    remember_preferences: boolean;
    auto_suggest_tasks: boolean;
    proactive_reminders: boolean;
  };
}

export interface DashGoal {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'administrative' | 'personal' | 'professional_development';
  priority: 'low' | 'medium' | 'high';
  target_date?: number;
  progress: number; // 0-100
  metrics: Array<{
    name: string;
    target: number;
    current: number;
    unit: string;
  }>;
  related_tasks: string[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: number;
  updated_at: number;
}

export interface DashInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'prediction' | 'alert' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  data_sources: string[];
  created_at: number;
  expires_at?: number;
  actionable: boolean;
  suggested_actions?: string[];
  impact_estimate?: {
    type: 'time_saved' | 'efficiency_gained' | 'problem_prevented';
    value: number;
    unit: string;
  };
}

export interface DashPersonality {
  name: string;
  greeting: string;
  personality_traits: string[];
  response_style: 'formal' | 'casual' | 'encouraging' | 'professional' | 'adaptive';
  expertise_areas: string[];
  voice_settings: {
    rate: number;
    pitch: number;
    language: string;
    voice?: string;
  };
  role_specializations: {
    [role: string]: {
      greeting: string;
      capabilities: string[];
      tone: string;
      proactive_behaviors: string[];
      task_categories: string[];
    };
  };
  agentic_settings: {
    autonomy_level: 'low' | 'medium' | 'high';
    can_create_tasks: boolean;
    can_schedule_actions: boolean;
    can_access_data: boolean;
    can_send_notifications: boolean;
    requires_confirmation_for: string[];
  };
}

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
    'insightful'
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
    'workflow optimization'
  ],
  voice_settings: {
    rate: 0.8,
    pitch: 1.0,
    language: 'en-US'
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
        'assessment_creation'
      ],
      tone: 'encouraging and professional',
      proactive_behaviors: [
        'suggest_lesson_improvements',
        'remind_upcoming_deadlines',
        'flag_student_concerns',
        'recommend_resources'
      ],
      task_categories: ['academic', 'administrative', 'communication']
    },
    principal: {
      greeting: "Good morning! I'm Dash, your administrative assistant. Here to help with school management, staff coordination, and strategic planning.",
      capabilities: [
        'staff_management',
        'budget_analysis',
        'policy_recommendations',
        'parent_communication',
        'data_analytics',
        'strategic_planning',
        'crisis_management',
        'compliance_tracking'
      ],
      tone: 'professional and strategic',
      proactive_behaviors: [
        'monitor_school_metrics',
        'suggest_policy_updates',
        'flag_budget_concerns',
        'track_compliance_deadlines'
      ],
      task_categories: ['administrative', 'strategic', 'compliance', 'communication']
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
        'academic_guidance'
      ],
      tone: 'friendly and supportive',
      proactive_behaviors: [
        'remind_homework_deadlines',
        'suggest_learning_activities',
        'flag_progress_concerns',
        'recommend_parent_involvement'
      ],
      task_categories: ['academic_support', 'communication', 'personal']
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
        'motivation_boost'
      ],
      tone: 'friendly and encouraging',
      proactive_behaviors: [
        'remind_study_sessions',
        'suggest_break_times',
        'celebrate_achievements',
        'recommend_study_methods'
      ],
      task_categories: ['academic', 'personal', 'motivational']
    }
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
      'share_personal_information'
    ]
  }
};

export class DashAIAssistant {
  private static instance: DashAIAssistant;
  private currentConversationId: string | null = null;
  private memory: Map<string, DashMemoryItem> = new Map();
  private personality: DashPersonality = DEFAULT_PERSONALITY;
  private isRecording = false;
  private recordingObject: Audio.Recording | null = null;
  private soundObject: Audio.Sound | null = null;
  
  // Enhanced agentic capabilities
  private userProfile: DashUserProfile | null = null;
  private activeTasks: Map<string, DashTask> = new Map();
  private activeReminders: Map<string, DashReminder> = new Map();
  private pendingInsights: Map<string, DashInsight> = new Map();
  private proactiveTimer: NodeJS.Timeout | null = null;
  private contextCache: Map<string, any> = new Map();
  private interactionHistory: Array<{
    timestamp: number;
    type: string;
    data: any;
  }> = [];
  
  // Storage keys
  private static readonly CONVERSATIONS_KEY = 'dash_conversations';
  private static readonly CURRENT_CONVERSATION_KEY = '@dash_ai_current_conversation_id';
  private static readonly MEMORY_KEY = 'dash_memory';
  private static readonly PERSONALITY_KEY = 'dash_personality';
  private static readonly SETTINGS_KEY = 'dash_settings';
  private static readonly USER_PROFILE_KEY = 'dash_user_profile';
  private static readonly TASKS_KEY = 'dash_active_tasks';
  private static readonly REMINDERS_KEY = 'dash_active_reminders';
  private static readonly INSIGHTS_KEY = 'dash_pending_insights';

  public static getInstance(): DashAIAssistant {
    if (!DashAIAssistant.instance) {
      DashAIAssistant.instance = new DashAIAssistant();
    }
    return DashAIAssistant.instance;
  }

  /**
   * Initialize Dash AI Assistant
   */
  public async initialize(): Promise<void> {
    try {
      console.log('[Dash] Initializing AI Assistant...');
      
      // Initialize audio
      await this.initializeAudio();
      
      // Load persistent data
      await this.loadMemory();
      await this.loadPersonality();
      
      // Load user context
      await this.loadUserContext();
      
      console.log('[Dash] AI Assistant initialized successfully');
    } catch (error) {
      console.error('[Dash] Failed to initialize AI Assistant:', error);
      throw error;
    }
  }

  /**
   * Initialize audio system
   */
  private async initializeAudio(): Promise<void> {
    try {
      // On web, expo-av audio mode options are not applicable; skip configuration
      if (Platform.OS === 'web') {
        console.debug('[Dash] Skipping audio mode configuration on web');
        return;
      }

      // Request permissions with proper error handling
      const permissionResult = await Audio.requestPermissionsAsync();
      if (!permissionResult.granted) {
        console.warn('[Dash] Audio recording permission denied');
        // Don't throw here - let the recording attempt handle permission request
        return;
      }

      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } else if (Platform.OS === 'android') {
        await Audio.setAudioModeAsync({
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        } as any);
      }
      
      console.log('[Dash] Audio initialized with permissions');
    } catch (error) {
      console.error('[Dash] Audio initialization failed:', error);
      // Don't throw here - allow the app to continue without audio
    }
  }

  /**
   * Start a new conversation
   */
  public async startNewConversation(title?: string): Promise<string> {
    const conversationId = `dash_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentConversationId = conversationId;
    
    const conversation: DashConversation = {
      id: conversationId,
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    await this.saveConversation(conversation);
    try {
      await AsyncStorage.setItem(DashAIAssistant.CURRENT_CONVERSATION_KEY, conversationId);
    } catch { /* Intentional: non-fatal */ }
    return conversationId;
  }

  /**
   * Send a text message to Dash
   */
  public async sendMessage(content: string, conversationId?: string): Promise<DashMessage> {
    const convId = conversationId || this.currentConversationId;
    if (!convId) {
      throw new Error('No active conversation');
    }

    // Create user message
    const userMessage: DashMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content,
      timestamp: Date.now()
    };

    // Add to conversation
    await this.addMessageToConversation(convId, userMessage);

    // Generate AI response
    const assistantResponse = await this.generateResponse(content, convId);
    await this.addMessageToConversation(convId, assistantResponse);

    return assistantResponse;
  }

  /**
   * Send a voice message to Dash
   */
  public async sendVoiceMessage(audioUri: string, conversationId?: string): Promise<DashMessage> {
    const convId = conversationId || this.currentConversationId;
    if (!convId) {
      throw new Error('No active conversation');
    }

    // Transcribe audio
    const tr = await this.transcribeAudio(audioUri);
    const transcript = tr.transcript;
    
    // Get audio duration
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    const status = await sound.getStatusAsync();
    const duration = status.isLoaded ? status.durationMillis || 0 : 0;
    await sound.unloadAsync();

    // Create user message with voice note
    const userMessage: DashMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: transcript,
      timestamp: Date.now(),
      voiceNote: {
        audioUri,
        duration,
        transcript,
        storagePath: tr.storagePath,
        bucket: tr.storagePath ? 'voice-notes' : undefined,
        contentType: tr.contentType,
        language: tr.language,
        provider: tr.provider
      }
    };

    // Add to conversation
    await this.addMessageToConversation(convId, userMessage);

    // Generate AI response
    const assistantResponse = await this.generateResponse(transcript, convId);
    await this.addMessageToConversation(convId, assistantResponse);

    return assistantResponse;
  }

  /**
   * Start voice recording
   */
  public async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      // Check and request permissions first
      if (Platform.OS !== 'web') {
        const permissionResult = await Audio.requestPermissionsAsync();
        if (!permissionResult.granted) {
          throw new Error('Microphone permission is required for voice recording. Please enable microphone access in your device settings and try again.');
        }
      }

      // Web compatibility checks for recording support and secure context
      if (Platform.OS === 'web') {
        try {
          const w: any = typeof window !== 'undefined' ? window : null;
          const nav: any = typeof navigator !== 'undefined' ? navigator : null;

          const isSecure = w && (w.isSecureContext || w.location?.protocol === 'https:' || w.location?.hostname === 'localhost' || w.location?.hostname === '127.0.0.1');
          if (!isSecure) {
            throw new Error('Microphone requires a secure context (HTTPS or localhost).');
          }

          if (!nav?.mediaDevices?.getUserMedia) {
            throw new Error('Your browser does not support microphone capture (mediaDevices.getUserMedia missing). Please use Chrome or Edge.');
          }

          if (w?.MediaRecorder && typeof (w as any).MediaRecorder.isTypeSupported === 'function') {
            const preferred = 'audio/webm';
            if (!(w as any).MediaRecorder.isTypeSupported(preferred)) {
              console.warn(`[Dash] ${preferred} not fully supported; the browser may record using a different container/codec.`);
            }
          } else {
            console.warn('[Dash] MediaRecorder is not available; recording may not work in this browser (e.g., Safari).');
          }
        } catch (compatErr) {
          console.error('[Dash] Web recording compatibility error:', compatErr);
          throw compatErr;
        }
      }

      console.log('[Dash] Starting recording...');
      this.recordingObject = new Audio.Recording();

      // Use the Expo AV recording API: prepareToRecordAsync + startAsync
      await this.recordingObject.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      } as Audio.RecordingOptions);

      await this.recordingObject.startAsync();
      this.isRecording = true;
      console.log('[Dash] Recording started');
    } catch (error) {
      console.error('[Dash] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop voice recording and return audio URI
   */
  public async stopRecording(): Promise<string> {
    if (!this.isRecording || !this.recordingObject) {
      throw new Error('Not recording');
    }

    try {
      console.log('[Dash] Stopping recording...');
      await this.recordingObject.stopAndUnloadAsync();
      const recordingUri = this.recordingObject.getURI();
      
      this.recordingObject = null;
      this.isRecording = false;
      
      console.log('[Dash] Recording stopped:', recordingUri);
      return recordingUri || '';
    } catch (error) {
      console.error('[Dash] Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Pre-warm the recorder for faster start times
   */
  public async preWarmRecorder(): Promise<void> {
    // Pre-warming logic can go here if needed
    // For now, this is a no-op as startRecording handles initialization
    return Promise.resolve();
  }

  /**
   * Transcribe audio only without sending to AI
   */
  public async transcribeOnly(audioUri: string): Promise<{
    transcript: string;
    duration: number;
    storagePath?: string;
    contentType?: string;
    language?: string;
    provider?: string;
  }> {
    return this.transcribeAudio(audioUri);
  }

  /**
   * Send a pre-prepared voice message (already transcribed)
   */
  public async sendPreparedVoiceMessage(
    audioUri: string,
    transcript: string,
    duration: number,
    conversationId?: string
  ): Promise<DashMessage> {
    const convId = conversationId || this.currentConversationId;
    if (!convId) {
      throw new Error('No active conversation');
    }

    // Create user message with voice note
    const userMessage: DashMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: transcript,
      timestamp: Date.now(),
      voiceNote: {
        audioUri,
        duration,
        transcript,
        contentType: 'audio/m4a',
        language: 'en-US',
        provider: 'local'
      }
    };

    // Add to conversation
    await this.addMessageToConversation(convId, userMessage);

    // Generate AI response
    const assistantResponse = await this.generateResponse(transcript, convId);
    await this.addMessageToConversation(convId, assistantResponse);

    return assistantResponse;
  }

  /**
   * Extract lesson parameters from user input and AI response (enhanced)
   */
  private extractLessonParameters(userInput: string, aiResponse: string): Record<string, string> {
    const params: Record<string, string> = {};
    const fullTextRaw = `${userInput || ''} ${aiResponse || ''}`;
    const fullText = fullTextRaw.toLowerCase();

    // Language hints (e.g., "in Spanish", "respond in Afrikaans")
    const languageHints: Record<string, RegExp> = {
      en: /(in\s+english|respond\s+in\s+english)/i,
      es: /(in\s+spanish|en\s+español|responde\s+en\s+español)/i,
      fr: /(in\s+french|en\s+français)/i,
      pt: /(in\s+portuguese|em\s+portugu[eê]s)/i,
      de: /(in\s+german|auf\s+deutsch)/i,
      af: /(in\s+afrikaans)/i,
      zu: /(in\s+zulu|ngesi[zs]ulu)/i,
      st: /(in\s+sesotho|sesotho)/i,
    };
    for (const [code, rx] of Object.entries(languageHints)) {
      if (rx.test(fullTextRaw)) { params.language = code; break; }
    }

    // Curriculum hints
    if (/caps/i.test(fullTextRaw)) params.curriculum = 'CAPS';
    else if (/common\s*core/i.test(fullTextRaw)) params.curriculum = 'Common Core';
    else if (/cambridge|igcse/i.test(fullTextRaw)) params.curriculum = 'Cambridge';
    else if (/(uk\s*national\s*curriculum|uk\s*curriculum)/i.test(fullTextRaw)) params.curriculum = 'UK';
    else if (/ib\s*(pyp|myp|dp)?/i.test(fullTextRaw)) params.curriculum = 'IB';

    // Model hints ("use haiku/sonnet/opus", or speed words)
    if (/\b(haiku|fast)\b/i.test(fullTextRaw)) params.model = 'claude-3-haiku';
    else if (/\b(sonnet|smart|balanced)\b/i.test(fullTextRaw)) params.model = 'claude-3-sonnet';
    else if (/\b(opus|expert|advanced)\b/i.test(fullTextRaw)) params.model = 'claude-3-opus';

    // Grade level
    const gradeMatch = fullText.match(/grade\s*(\d{1,2})|year\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)?\s*grade/i);
    if (gradeMatch) {
      const grade = gradeMatch[1] || gradeMatch[2] || gradeMatch[3];
      if (grade && parseInt(grade) >= 1 && parseInt(grade) <= 12) {
        params.gradeLevel = grade;
      }
    }

    // Subject synonyms
    const subjectPatterns = {
      'Mathematics': /(math|mathematics|maths|arithmetic|algebra|geometry|calculus|numbers?\s*sense|fractions?)/i,
      'Science': /(science|biology|chemistry|physics|life\s*science|natural\s*science)/i,
      'English': /(english|language\s*arts?|reading|writing|literature)/i,
      'Afrikaans': /(afrikaans)/i,
      'Life Skills': /(life\s*skills?)/i,
      'Geography': /(geography|social\s*studies)/i,
      'History': /(history)/i,
      'Art': /(art|creative|drawing|painting)/i,
      'Music': /(music|singing)/i,
      'Physical Education': /(physical\s*education|pe|sports?|fitness)/i
    } as const;
    for (const [subject, pattern] of Object.entries(subjectPatterns)) {
      if (pattern.test(fullTextRaw)) { params.subject = subject; break; }
    }

    // Topic/theme: allow quoted phrases or after keywords
    const topicQuoted = fullTextRaw.match(/topic\s*[:\-]?\s*"([^"]{3,80})"|"([^"]{3,80})"\s*(lesson|plan)/i);
    if (topicQuoted && (topicQuoted[1] || topicQuoted[2])) {
      const t = (topicQuoted[1] || topicQuoted[2] || '').trim();
      if (t) params.topic = t;
    } else {
      const topicMatch = fullText.match(/(?:about|on|teaching|topic|theme)\s+([^.,;!?]+?)(?:\s+(?:for|to|with)|[.,;!?]|$)/i);
      if (topicMatch && topicMatch[1]) {
        const t = topicMatch[1].trim();
        if (t.length > 2 && t.length < 80) params.topic = t;
      }
    }

    // Duration: handle "one and a half hours", "half an hour", "90-minute"
    let durationMins: number | null = null;
    const numMatch = fullText.match(/(\d{1,3})\s*\-?\s*(?:minute|min)s?\b/i);
    const hourMatch = fullText.match(/(\d(?:\.\d)?)\s*(?:hour|hr)s?/i);
    const ninetyLike = /\b(90\s*minute|one\s+and\s+a\s+half\s+hours?)\b/i.test(fullTextRaw);
    const halfHour = /\b(half\s+an\s+hour|30\s*minutes?)\b/i.test(fullTextRaw);
    if (numMatch) durationMins = parseInt(numMatch[1]);
    else if (hourMatch) durationMins = Math.round(parseFloat(hourMatch[1]) * 60);
    else if (ninetyLike) durationMins = 90;
    else if (halfHour) durationMins = 30;
    if (durationMins && durationMins >= 15 && durationMins <= 180) params.duration = String(durationMins);

    // Objectives: capture bullet points and sentences
    const lines = fullTextRaw.split(/\n|;|•|\-/).map(s => s.trim()).filter(Boolean);
    const objectiveCandidates: string[] = [];
    const objectiveVerbs = /(objective|goal|aim|learn|understand|analyze|evaluate|create|apply|compare|describe|identify)/i;
    for (const ln of lines) {
      if (objectiveVerbs.test(ln) && ln.length > 5 && ln.length < 140) {
        objectiveCandidates.push(ln.replace(/^[^:]*:?\s*/, ''))
      }
    }
    if (objectiveCandidates.length) params.objectives = objectiveCandidates.slice(0, 4).join('; ');

    // Assessment hints
    const assess = fullTextRaw.match(/(quiz|exit\s*ticket|rubric|project|worksheet)/i);
    if (assess) params.assessmentType = assess[1].toLowerCase();

    // Autogenerate if we have enough
    const paramCount = Object.keys(params).length;
    // IMPORTANT: Do not auto-trigger generation. We only prefill.
    // We explicitly avoid setting any autogenerate flag so the user must confirm
    // and press Generate in the UI.
    // if (paramCount >= 2) params.autogenerate = 'true';

    console.log('[Dash] Extracted lesson parameters (enhanced):', params);
    return params;
  }

  /**
   * Build and open a deep link to Lesson Generator using extracted params
   */
  public openLessonGeneratorFromContext(userInput: string, aiResponse: string): void {
    try {
      const params = this.extractLessonParameters(userInput, aiResponse);
      const query = new URLSearchParams(params as any).toString();
      router.push({ pathname: '/screens/ai-lesson-generator', params });
    } catch (e) {
      console.warn('[Dash] Failed to open Lesson Generator from context:', e);
    }
  }
  
  /**
   * Extract worksheet parameters from user input and AI response
   */
  private extractWorksheetParameters(userInput: string, aiResponse: string): Record<string, string> {
    const params: Record<string, string> = {};
    const fullText = `${userInput} ${aiResponse}`.toLowerCase();
    
    // Extract worksheet type
    if (fullText.includes('math') || fullText.includes('arithmetic') || fullText.includes('addition') || fullText.includes('subtraction') || fullText.includes('multiplication') || fullText.includes('division')) {
      params.type = 'math';
      params.title = 'Math Practice Worksheet';
    } else if (fullText.includes('reading') || fullText.includes('comprehension') || fullText.includes('vocabulary') || fullText.includes('spelling')) {
      params.type = 'reading';
      params.title = 'Reading Activity Worksheet';
    } else {
      params.type = 'activity';
      params.title = 'Learning Activity Worksheet';
    }
    
    // Extract age group
    const ageMatch = fullText.match(/(\d+)\s*[-–to]\s*(\d+)\s*year|age\s*(\d+)|grade\s*(\d+)/i);
    if (ageMatch) {
      const age1 = ageMatch[1] ? parseInt(ageMatch[1]) : null;
      const age2 = ageMatch[2] ? parseInt(ageMatch[2]) : null;
      const age3 = ageMatch[3] ? parseInt(ageMatch[3]) : null;
      const grade = ageMatch[4] ? parseInt(ageMatch[4]) : null;
      
      if (age1 && age2) {
        if (age1 >= 3 && age2 <= 4) params.ageGroup = '3-4 years';
        else if (age1 >= 4 && age2 <= 5) params.ageGroup = '4-5 years';
        else if (age1 >= 5 && age2 <= 6) params.ageGroup = '5-6 years';
        else if (age1 >= 6 && age2 <= 7) params.ageGroup = '6-7 years';
        else params.ageGroup = '5-6 years';
      } else if (age3) {
        if (age3 <= 4) params.ageGroup = '3-4 years';
        else if (age3 <= 5) params.ageGroup = '4-5 years';
        else if (age3 <= 6) params.ageGroup = '5-6 years';
        else params.ageGroup = '6-7 years';
      } else if (grade) {
        if (grade <= 1) params.ageGroup = '5-6 years';
        else if (grade <= 2) params.ageGroup = '6-7 years';
        else params.ageGroup = '6-7 years';
      }
    }
    
    // Extract difficulty level
    if (fullText.includes('easy') || fullText.includes('simple') || fullText.includes('beginner')) {
      params.difficulty = 'Easy';
    } else if (fullText.includes('hard') || fullText.includes('difficult') || fullText.includes('challenging') || fullText.includes('advanced')) {
      params.difficulty = 'Hard';
    } else {
      params.difficulty = 'Medium';
    }
    
    // Extract number of problems for math worksheets
    if (params.type === 'math') {
      const numberMatch = fullText.match(/(\d+)\s*(?:problem|question|exercise|item)/i);
      if (numberMatch) {
        const count = parseInt(numberMatch[1]);
        if (count >= 5 && count <= 50) {
          params.problemCount = count.toString();
        }
      }
      
      // Default values for math worksheets
      if (!params.problemCount) params.problemCount = '15';
      
      // Math operation type
      if (fullText.includes('addition') || fullText.includes('add')) {
        params.operation = 'addition';
      } else if (fullText.includes('subtraction') || fullText.includes('subtract') || fullText.includes('minus')) {
        params.operation = 'subtraction';
      } else if (fullText.includes('multiplication') || fullText.includes('multiply') || fullText.includes('times')) {
        params.operation = 'multiplication';
      } else {
        params.operation = 'mixed'; // Default to mixed operations
      }
    }
    
    // Extract color preference
    if (fullText.includes('color') || fullText.includes('colour') || fullText.includes('colorful') || fullText.includes('colourful')) {
      params.colorMode = 'Color';
    } else if (fullText.includes('black') && fullText.includes('white')) {
      params.colorMode = 'Black & White';
    }
    
    // Extract paper size
    if (fullText.includes('a4') || fullText.includes('letter')) {
      params.paperSize = fullText.includes('a4') ? 'A4' : 'Letter';
    }
    
    // Add auto-generation flag if we have enough parameters
    if (Object.keys(params).length >= 2) {
      params.autoGenerate = 'true';
    }
    
    console.log('[Dash] Extracted worksheet parameters:', params);
    return params;
  }
  
  /**
   * Intelligent text normalization for smart reading
   * Handles numbers, dates, special characters, and formatting
   */
  private normalizeTextForSpeech(text: string): string {
    let normalized = text;
    
    // Handle bullet points and list formatting FIRST (before other transformations)
    normalized = this.normalizeBulletPoints(normalized);
    
    // Handle numbers intelligently
    normalized = this.normalizeNumbers(normalized);
    
    // Handle dates and time formats
    normalized = this.normalizeDatesAndTime(normalized);
    
    // Handle underscores and special formatting
    normalized = this.normalizeSpecialFormatting(normalized);
    
    // Handle abbreviations and acronyms
    normalized = this.normalizeAbbreviations(normalized);
    
    // Handle mathematical expressions (only in math contexts)
    normalized = this.normalizeMathExpressions(normalized);
    
    // Remove emojis and special characters (simplified for ES5 compatibility)
    normalized = normalized
      .replace(/[\u2600-\u26FF]/g, '')  // Misc symbols
      .replace(/[\u2700-\u27BF]/g, '')  // Dingbats
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Surrogate pairs (emojis)
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalized;
  }
  
  /**
   * Normalize numbers for intelligent reading
   */
  private normalizeNumbers(text: string): string {
    return text
      // Handle large numbers with separators (e.g., 1,000 -> one thousand)
      .replace(/\b(\d{1,3}(?:,\d{3})+)\b/g, (match) => {
        const number = parseInt(match.replace(/,/g, ''));
        return this.numberToWords(number);
      })
      // Handle decimal numbers (e.g., 3.14 -> three point one four)
      .replace(/\b(\d+)\.(\d+)\b/g, (match, whole, decimal) => {
        const wholeWords = this.numberToWords(parseInt(whole));
        const decimalWords = decimal.split('').map((d: string) => this.numberToWords(parseInt(d))).join(' ');
        return `${wholeWords} point ${decimalWords}`;
      })
      // Handle ordinal numbers (e.g., 1st -> first, 2nd -> second)
      .replace(/\b(\d+)(st|nd|rd|th)\b/gi, (match, num) => {
        return this.numberToOrdinal(parseInt(num));
      })
      // Handle regular numbers (e.g., 123 -> one hundred twenty three)
      .replace(/\b\d+\b/g, (match) => {
        const number = parseInt(match);
        if (number > 2024 && number < 2100) {
          // Handle years specially (e.g., 2025 -> twenty twenty five)
          return this.numberToWords(number, true);
        }
        return this.numberToWords(number);
      });
  }
  
  /**
   * Normalize dates and time for speech
   */
  private normalizeDatesAndTime(text: string): string {
    return text
      // Handle ISO dates (2024-12-25)
      .replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (match, year, month, day) => {
        const monthName = this.getMonthName(parseInt(month));
        const dayOrdinal = this.numberToOrdinal(parseInt(day));
        return `${monthName} ${dayOrdinal}, ${year}`;
      })
      // Handle US dates (12/25/2024)
      .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (match, month, day, year) => {
        const monthName = this.getMonthName(parseInt(month));
        const dayOrdinal = this.numberToOrdinal(parseInt(day));
        return `${monthName} ${dayOrdinal}, ${year}`;
      })
      // Handle time (14:30 -> two thirty PM)
      .replace(/\b(\d{1,2}):(\d{2})\b/g, (match, hour, minute) => {
        return this.timeToWords(parseInt(hour), parseInt(minute));
      });
  }
  
  /**
   * Normalize bullet points and list formatting
   */
  private normalizeBulletPoints(text: string): string {
    return text
      // Handle bullet points at start of lines
      .replace(/^[\s]*[-•*+]\s+/gm, '') // Remove bullet at line start
      .replace(/\n[\s]*[-•*+]\s+/g, '\n') // Remove bullet after newlines
      // Handle numbered lists
      .replace(/^[\s]*(\d+)[.)\s]+/gm, '') // Remove "1. " or "1) " at line start
      .replace(/\n[\s]*(\d+)[.)\s]+/g, '\n') // Remove numbered bullets after newlines
      // Handle dashes in educational content (not math contexts)
      .replace(/([a-zA-Z])\s*-\s*([A-Z][a-z])/g, '$1, $2') // "Students - They will" -> "Students, They will"
      // Handle dash separators in descriptions
      .replace(/([a-z])\s*-\s*([a-z])/g, '$1 to $2') // "5-6 years" -> "5 to 6 years"
      // Clean up extra spaces and newlines
      .replace(/\n\s*\n/g, '. ') // Double newlines become sentence breaks
      .replace(/\n/g, '. ') // Single newlines become sentence breaks
      .replace(/\s+/g, ' ') // Multiple spaces become single space
      .trim();
  }
  
  /**
   * Normalize special formatting like underscores and camelCase
   */
  private normalizeSpecialFormatting(text: string): string {
    return text
      // Handle underscore formatting (date_month_year -> date month year)
      .replace(/([a-zA-Z]+)_([a-zA-Z]+)/g, '$1 $2')
      // Handle camelCase (firstName -> first name)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Handle kebab-case (first-name -> first name)
      .replace(/([a-zA-Z]+)-([a-zA-Z]+)/g, '$1 $2')
      // Handle file extensions (.pdf -> dot P D F)
      .replace(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|png|gif)\b/gi, (match, ext) => {
        return ` dot ${ext.toUpperCase().split('').join(' ')}`;
      });
  }
  
  /**
   * Normalize common abbreviations and acronyms
   */
  private normalizeAbbreviations(text: string): string {
    const abbreviations: Record<string, string> = {
      'Mr.': 'Mister',
      'Mrs.': 'Missus',
      'Dr.': 'Doctor',
      'Prof.': 'Professor',
      'St.': 'Street',
      'Ave.': 'Avenue',
      'Rd.': 'Road',
      'Ltd.': 'Limited',
      'Inc.': 'Incorporated',
      'vs.': 'versus',
      'etc.': 'etcetera',
      'i.e.': 'that is',
      'e.g.': 'for example',
      'AI': 'A I',
      'API': 'A P I',
      'URL': 'U R L',
      'HTML': 'H T M L',
      'CSS': 'C S S',
      'JS': 'JavaScript',
      'PDF': 'P D F',
      'FAQ': 'F A Q',
      'CEO': 'C E O',
      'CTO': 'C T O'
    };
    
    let normalized = text;
    for (const [abbr, expansion] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}\\b`, 'gi');
      normalized = normalized.replace(regex, expansion);
    }
    
    return normalized;
  }
  
  /**
   * Normalize mathematical expressions (only in math contexts)
   */
  private normalizeMathExpressions(text: string): string {
    // Check if this appears to be mathematical content
    const hasMathContext = /\b(math|equation|formula|calculate|solve|problem|exercise)\b/i.test(text) ||
                          /\d+\s*[+\-*/=]\s*\d+/g.test(text) ||
                          /\b\d+\s*\/\s*\d+\b/.test(text);
    
    if (!hasMathContext) {
      // Only handle standalone fractions and percentages in non-math contexts
      return text
        .replace(/\b(\d+)\s*%/g, '$1 percent')
        // Handle fractions only when clearly mathematical (surrounded by numbers/operators)
        .replace(/\b(\d+)\s*\/\s*(\d+)\b(?=[^a-zA-Z]|$)/g, (match, num, den) => {
          return this.fractionToWords(parseInt(num), parseInt(den));
        });
    }
    
    // Full math processing for mathematical contexts
    return text
      // Handle basic operations
      .replace(/\+/g, ' plus ')
      .replace(/(?<!\w)-(?=\d)/g, ' minus ') // Only replace minus before numbers
      .replace(/\*/g, ' times ')
      .replace(/\//g, ' divided by ')
      .replace(/=/g, ' equals ')
      .replace(/%/g, ' percent ')
      // Handle fractions (1/2 -> one half)
      .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (match, num, den) => {
        return this.fractionToWords(parseInt(num), parseInt(den));
      });
  }
  
  /**
   * Convert number to words
   */
  private numberToWords(num: number, isYear: boolean = false): string {
    if (num === 0) return 'zero';
    
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const thousands = ['', 'thousand', 'million', 'billion'];
    
    // Special handling for years
    if (isYear && num >= 1000 && num <= 9999) {
      const century = Math.floor(num / 100);
      const yearPart = num % 100;
      if (yearPart === 0) {
        return this.numberToWords(century) + ' hundred';
      } else {
        return this.numberToWords(century) + ' ' + (yearPart < 10 ? 'oh ' + this.numberToWords(yearPart) : this.numberToWords(yearPart));
      }
    }
    
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    }
    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + this.numberToWords(num % 100) : '');
    }
    
    // Handle larger numbers
    let result = '';
    let thousandIndex = 0;
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        const chunkWords = this.numberToWords(chunk);
        result = chunkWords + (thousands[thousandIndex] ? ' ' + thousands[thousandIndex] : '') + (result ? ' ' + result : '');
      }
      num = Math.floor(num / 1000);
      thousandIndex++;
    }
    
    return result;
  }
  
  /**
   * Convert number to ordinal words
   */
  private numberToOrdinal(num: number): string {
    const ordinals: Record<number, string> = {
      1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth',
      6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth',
      11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth', 15: 'fifteenth',
      16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth', 19: 'nineteenth', 20: 'twentieth',
      21: 'twenty first', 22: 'twenty second', 23: 'twenty third', 30: 'thirtieth'
    };
    
    if (ordinals[num]) return ordinals[num];
    
    // For larger ordinals, use pattern
    if (num > 20) {
      const lastDigit = num % 10;
      const tens = Math.floor(num / 10) * 10;
      if (lastDigit === 0) {
        const tensWord = this.numberToWords(tens);
        return tensWord.slice(0, -1) + 'ieth';
      } else {
        return this.numberToWords(tens) + ' ' + this.numberToOrdinal(lastDigit);
      }
    }
    
    return this.numberToWords(num) + 'th';
  }
  
  /**
   * Get month name from number
   */
  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Invalid Month';
  }
  
  /**
   * Convert time to words
   */
  private timeToWords(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    if (minute === 0) {
      return `${this.numberToWords(displayHour)} o'clock ${period}`;
    } else if (minute === 15) {
      return `quarter past ${this.numberToWords(displayHour)} ${period}`;
    } else if (minute === 30) {
      return `half past ${this.numberToWords(displayHour)} ${period}`;
    } else if (minute === 45) {
      const nextHour = displayHour === 12 ? 1 : displayHour + 1;
      return `quarter to ${this.numberToWords(nextHour)} ${period}`;
    } else {
      return `${this.numberToWords(displayHour)} ${this.numberToWords(minute)} ${period}`;
    }
  }
  
  /**
   * Convert fraction to words
   */
  private fractionToWords(numerator: number, denominator: number): string {
    const fractions: Record<string, string> = {
      '1/2': 'one half',
      '1/3': 'one third',
      '2/3': 'two thirds',
      '1/4': 'one quarter',
      '3/4': 'three quarters',
      '1/5': 'one fifth',
      '2/5': 'two fifths',
      '3/5': 'three fifths',
      '4/5': 'four fifths'
    };
    
    const key = `${numerator}/${denominator}`;
    if (fractions[key]) return fractions[key];
    
    const numWords = this.numberToWords(numerator);
    const denWords = this.numberToOrdinal(denominator);
    return `${numWords} ${denWords}${numerator > 1 ? 's' : ''}`;
  }
  
  /**
   * Generate worksheet directly for voice commands
   */
  public async generateWorksheetAutomatically(params: Record<string, any>): Promise<{ success: boolean; worksheetData?: any; error?: string }> {
    try {
      console.log('[Dash] Auto-generating worksheet with params:', params);
      
      // Create worksheet generation service instance
      const worksheetService = new WorksheetService();
      
      // Generate worksheet based on type
      let worksheetData;
      
      switch (params.type) {
        case 'math':
          worksheetData = await worksheetService.generateMathWorksheet({
            ageGroup: params.ageGroup || '5-6 years',
            difficulty: params.difficulty || 'Medium',
            operation: params.operation || 'mixed',
            problemCount: parseInt(params.problemCount || '15'),
            includeHints: params.includeHints !== 'false'
          });
          break;
          
        case 'reading':
          worksheetData = await worksheetService.generateReadingWorksheet({
            ageGroup: params.ageGroup || '5-6 years',
            difficulty: params.difficulty || 'Medium',
            topic: params.topic || 'General Reading',
            includeImages: params.includeImages !== 'false'
          });
          break;
          
        default:
          worksheetData = await worksheetService.generateActivityWorksheet({
            ageGroup: params.ageGroup || '5-6 years',
            difficulty: params.difficulty || 'Medium',
            topic: params.topic || 'Learning Activity',
            activityType: params.activityType || 'creative'
          });
          break;
      }
      
      return {
        success: true,
        worksheetData
      };
      
    } catch (error) {
      console.error('[Dash] Failed to auto-generate worksheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate worksheet'
      };
    }
  }
  
  /**
   * Navigate to a specific screen programmatically with intelligent route mapping
   */
  public async navigateToScreen(route: string, params?: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[Dash] Navigating to screen:', route, params);
      
      // Map common screen names to actual routes
      const routeMap: Record<string, string> = {
        'dashboard': '/',
        'home': '/',
        'students': '/screens/student-management',
        // Map generic "lessons" to hub; AI generator is a separate intent
        'lessons': '/screens/lessons-hub',
        'ai-lesson': '/screens/ai-lesson-generator',
        'worksheets': '/screens/worksheet-demo',
        'assignments': '/screens/assign-homework',
        // Map reports to teacher-reports screen
        'reports': '/screens/teacher-reports',
        'settings': '/screens/dash-ai-settings',
        // Chat -> Dash Assistant
        'chat': '/screens/dash-assistant',
        // Fallbacks for common nouns to existing screens
        'profile': '/screens/account',
        // Not implemented screens are mapped to closest existing destinations
        'calendar': '/screens/teacher-reports',
        'gradebook': '/screens/teacher-reports',
        // Parent messaging
        'parents': '/screens/parent-messages',
        'curriculum': '/screens/lessons-categories'
      };
      
      // Resolve the actual route
      const actualRoute = routeMap[route.toLowerCase().replace(/^\//, '')] || route;
      
      // Navigate to the specified route
      if (params && Object.keys(params).length > 0) {
        router.push({ pathname: actualRoute, params } as any);
      } else {
        router.push(actualRoute);
      }
      
      // Log successful navigation
      console.log(`[Dash] Successfully navigated to: ${actualRoute}`);
      return { success: true };
      
    } catch (error) {
      console.error('[Dash] Navigation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  }
  
  /**
   * Open Teacher Messages with optional prefilled subject/body
   */
  public openTeacherMessageComposer(subject?: string, body?: string): void {
    try {
      const params: Record<string, string> = {};
      if (subject) params.prefillSubject = subject;
      if (body) params.prefillMessage = body;
      router.push({ pathname: '/screens/teacher-messages', params } as any);
    } catch (e) {
      console.warn('[Dash] Failed to open Teacher Messages:', e);
    }
  }

  /**
   * Export provided text as a PDF via EducationalPDFService
   */
  public async exportTextAsPDF(title: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      await EducationalPDFService.generateTextPDF(title || 'Dash Export', content || '');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'PDF export failed' };
    }
  }

  /**
   * Get current screen context for better assistance
   */
  public getCurrentScreenContext(): { screen: string; capabilities: string[]; suggestions: string[] } {
    // This would ideally get the current route from the navigation system
    // For now, we'll return a default context
    const defaultContext = {
      screen: 'dashboard',
      capabilities: [
        'navigate to different screens',
        'generate worksheets and lessons', 
        'manage students and assignments',
        'communicate with parents',
        'create reports and analytics'
      ],
      suggestions: [
        'Create a new lesson plan',
        'Generate a math worksheet',
        'Check student progress',
        'Send a message to parents',
        'View recent assignments'
      ]
    };
    
    return defaultContext;
  }
  
  /**
   * Suggest contextual actions based on current screen
   */
  public getContextualSuggestions(screen: string, userRole: string): string[] {
    const suggestions: Record<string, Record<string, string[]>> = {
      dashboard: {
        teacher: ['Create lesson plan', 'Generate worksheet', 'Check assignments', 'Message parents'],
        principal: ['View school analytics', 'Review teacher performance', 'Manage curriculum', 'Send announcements'],
        parent: ['Check child progress', 'View assignments', 'Schedule meeting', 'Update contact info']
      },
      'lesson-generator': {
        teacher: ['Generate new lesson', 'Import curriculum standards', 'Save as template', 'Share with colleagues'],
        principal: ['Review lesson plans', 'Approve curriculum', 'Monitor teaching standards'],
        parent: ['View lesson plans', 'Understand learning objectives']
      },
      'worksheet-demo': {
        teacher: ['Generate math worksheet', 'Create reading activity', 'Customize difficulty', 'Print for class'],
        principal: ['Review educational materials', 'Monitor resource usage'],
        parent: ['Download homework help', 'Practice activities for home']
      },
      'student-management': {
        teacher: ['Add new student', 'Update progress', 'Track behavior', 'Generate report'],
        principal: ['View all students', 'Enrollment statistics', 'Performance analytics'],
        parent: ['View my children', 'Update emergency contacts', 'Check attendance']
      }
    };
    
    return suggestions[screen]?.[userRole] || suggestions.dashboard[userRole] || [
      'Ask me anything about education',
      'Navigate to a different screen', 
      'Generate educational content',
      'Get help with current task'
    ];
  }
  
  /**
   * Enhanced contextual understanding and intent recognition
   */
  private analyzeUserIntent(userInput: string, conversationContext: DashMessage[]): {
    primaryIntent: string;
    confidence: number;
    entities: Array<{ type: string; value: string; confidence: number }>;
    context: string;
    urgency: 'low' | 'medium' | 'high';
    actionable: boolean;
  } {
    const input = userInput.toLowerCase().trim();
    
    // Intent patterns with confidence scoring
    const intentPatterns = {
      // Navigation intents
      navigation: {
        patterns: [/(?:go to|open|show me|navigate to|take me to)\s+(\w+)/i, /(?:where is|find)\s+(\w+)/i],
        confidence: 0.9
      },
      // Content creation intents
      creation: {
        patterns: [/(?:create|make|generate|build)\s+(\w+)/i, /(?:new|add)\s+(lesson|worksheet|assignment)/i],
        confidence: 0.85
      },
      // Question/help intents
      question: {
        patterns: [/^(?:what|how|why|when|where|who|can you|could you)/i, /\?$/],
        confidence: 0.8
      },
      // Task management intents
      task_management: {
        patterns: [/(?:assign|schedule|remind|track|manage)/i, /(?:todo|task|deadline)/i],
        confidence: 0.85
      },
      // Data retrieval intents
      data_retrieval: {
        patterns: [/(?:show|list|display|find|search|get)\s+(students|grades|reports|data)/i],
        confidence: 0.9
      },
      // Communication intents
      communication: {
        patterns: [/(?:send|message|email|call|notify|contact)\s+(parent|teacher|student)/i],
        confidence: 0.88
      }
    };
    
    let bestMatch = { intent: 'general_assistance', confidence: 0.5 };
    
    // Analyze input against patterns
    for (const [intent, config] of Object.entries(intentPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(input)) {
          if (config.confidence > bestMatch.confidence) {
            bestMatch = { intent, confidence: config.confidence };
          }
        }
      }
    }
    
    // Extract entities
    const entities = this.extractEntities(input);
    
    // Determine urgency
    const urgency = this.determineUrgency(input, conversationContext);
    
    // Determine if actionable
    const actionable = this.isActionableRequest(input, bestMatch.intent);
    
    // Build context from conversation history
    const context = this.buildConversationContext(conversationContext, bestMatch.intent);
    
    return {
      primaryIntent: bestMatch.intent,
      confidence: bestMatch.confidence,
      entities,
      context,
      urgency,
      actionable
    };
  }
  
  /**
   * Extract entities from user input
   */
  private extractEntities(input: string): Array<{ type: string; value: string; confidence: number }> {
    const entities = [];
    
    // Educational entities
    const educationalEntities = {
      subjects: ['math', 'mathematics', 'english', 'science', 'reading', 'writing', 'art', 'music'],
      grades: ['grade 1', 'grade 2', 'grade 3', 'year 1', 'year 2', 'kindergarten', 'pre-k'],
      activities: ['worksheet', 'lesson', 'assignment', 'quiz', 'test', 'activity', 'homework'],
      roles: ['student', 'parent', 'teacher', 'principal', 'admin'],
      difficulty: ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'],
      ages: ['3-4 years', '4-5 years', '5-6 years', '6-7 years']
    };
    
    for (const [type, values] of Object.entries(educationalEntities)) {
      for (const value of values) {
        if (input.includes(value)) {
          entities.push({
            type,
            value,
            confidence: 0.9
          });
        }
      }
    }
    
    // Numbers and quantities
    const numberMatch = input.match(/\b(\d+)\s*(minutes?|hours?|problems?|questions?|students?)/gi);
    if (numberMatch) {
      entities.push({
        type: 'quantity',
        value: numberMatch[0],
        confidence: 0.95
      });
    }
    
    return entities;
  }
  
  /**
   * Determine urgency of the request
   */
  private determineUrgency(input: string, context: DashMessage[]): 'low' | 'medium' | 'high' {
    // High urgency indicators
    if (input.match(/\b(urgent|emergency|asap|immediately|now|help|problem|issue|broken)/i)) {
      return 'high';
    }
    
    // Medium urgency indicators
    if (input.match(/\b(today|tomorrow|soon|quickly|deadline|due)/i)) {
      return 'medium';
    }
    
    // Check conversation context for escalation
    const recentMessages = context.slice(-3);
    const hasRepeatedRequests = recentMessages.some(msg => 
      msg.type === 'user' && 
      msg.content.toLowerCase().includes(input.split(' ').slice(0, 3).join(' ').toLowerCase())
    );
    
    if (hasRepeatedRequests) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Determine if request is actionable
   */
  private isActionableRequest(input: string, intent: string): boolean {
    const actionableIntents = ['navigation', 'creation', 'task_management', 'communication'];
    
    if (actionableIntents.includes(intent)) {
      return true;
    }
    
    // Check for action verbs
    const actionVerbs = /\b(create|make|generate|send|schedule|assign|update|delete|save|print|download)/i;
    return actionVerbs.test(input);
  }
  
  /**
   * Build conversation context summary
   */
  private buildConversationContext(messages: DashMessage[], currentIntent: string): string {
    if (!messages || messages.length === 0) {
      return 'New conversation';
    }
    
    const recentMessages = messages.slice(-5);
    const topics = new Set<string>();
    
    for (const message of recentMessages) {
      if (message.type === 'user') {
        const intent = this.quickIntentDetection(message.content);
        topics.add(intent);
      }
    }
    
    const topicsList = Array.from(topics).join(', ');
    return `Recent topics: ${topicsList}. Current: ${currentIntent}`;
  }
  
  /**
   * Quick intent detection for context building
   */
  private quickIntentDetection(text: string): string {
    const lower = text.toLowerCase();
    
    if (lower.includes('lesson') || lower.includes('teach')) return 'lesson_planning';
    if (lower.includes('worksheet') || lower.includes('activity')) return 'worksheet_creation';
    if (lower.includes('student') || lower.includes('grade')) return 'student_management';
    if (lower.includes('parent') || lower.includes('message')) return 'communication';
    if (lower.includes('report') || lower.includes('data')) return 'reporting';
    if (lower.includes('help') || lower.includes('how')) return 'help_request';
    
    return 'general';
  }
  
  /**
   * Smart response personalization based on user profile and context
   */
  private personalizeResponse(response: string, userProfile?: DashUserProfile, context?: any): string {
    if (!userProfile) return response;
    
    // Adjust tone based on user preferences
    const communicationStyle = userProfile.preferences.communication_style;
    
    let personalizedResponse = response;
    
    // Role-specific personalization
    if (userProfile.role === 'teacher') {
      personalizedResponse = personalizedResponse.replace(
        /\bstudents?\b/gi, 
        userProfile.context.current_classes ? 'your students' : 'students'
      );
    } else if (userProfile.role === 'parent') {
      personalizedResponse = personalizedResponse.replace(
        /\bchild(?:ren)?\b/gi,
        userProfile.context.current_students ? 'your child' : 'your children'
      );
    }
    
    // Add contextual references
    if (userProfile.context.current_subjects?.length) {
      const subjects = userProfile.context.current_subjects.slice(0, 2).join(' and ');
      personalizedResponse += ` This would work well with your ${subjects} curriculum.`;
    }
    
    return personalizedResponse;
  }
  
  /**
   * Create and manage complex automated tasks
   */
  public async createAutomatedTask(
    templateId: string,
    customParams?: any
  ): Promise<{ success: boolean; task?: DashTask; error?: string }> {
    try {
      const taskAutomation = DashTaskAutomation.getInstance();
      const userRole = this.userProfile?.role || 'teacher';
      
      const result = await taskAutomation.createTask(templateId, customParams, userRole);
      
      if (result.success && result.task) {
        // Add task progress to memory for future reference
        await this.addMemoryItem({
          type: 'context',
          key: `active_task_${result.task.id}`,
          value: {
            taskId: result.task.id,
            title: result.task.title,
            status: result.task.status,
            createdAt: result.task.createdAt
          },
          confidence: 1.0,
          expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });
        
        console.log('[Dash] Created automated task:', result.task.title);
      }
      
      return result;
    } catch (error) {
      console.error('[Dash] Failed to create automated task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Task creation failed'
      };
    }
  }
  
  /**
   * Execute task step with user interaction
   */
  public async executeTaskStep(
    taskId: string,
    stepId: string,
    userInput?: any
  ): Promise<{ success: boolean; result?: any; nextStep?: string; error?: string }> {
    try {
      const taskAutomation = DashTaskAutomation.getInstance();
      const result = await taskAutomation.executeTaskStep(taskId, stepId, userInput);
      
      // Update memory with task progress
      if (result.success) {
        await this.addMemoryItem({
          type: 'interaction',
          key: `task_step_${taskId}_${stepId}`,
          value: {
            stepId,
            completedAt: Date.now(),
            result: result.result
          },
          confidence: 1.0
        });
      }
      
      return result;
    } catch (error) {
      console.error('[Dash] Task step execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Step execution failed'
      };
    }
  }
  
  /**
   * Get user's active tasks for context
   */
  public getActiveTasks(): DashTask[] {
    const taskAutomation = DashTaskAutomation.getInstance();
    return taskAutomation.getActiveTasks();
  }
  
  /**
   * Get available task templates for user's role
   */
  public getAvailableTaskTemplates() {
    const taskAutomation = DashTaskAutomation.getInstance();
    const userRole = this.userProfile?.role || 'teacher';
    return taskAutomation.getTaskTemplates(userRole);
  }
  
  /**
   * Smart task suggestion based on user context and patterns
   */
  public suggestRelevantTasks(): string[] {
    const userRole = this.userProfile?.role || 'teacher';
    const currentTime = new Date();
    const dayOfWeek = currentTime.getDay();
    const hour = currentTime.getHours();
    
    const suggestions = [];
    
    // Time-based suggestions
    if (dayOfWeek === 5 && hour > 14) { // Friday afternoon
      suggestions.push('weekly_grade_report');
    }
    
    if (dayOfWeek === 1 && hour < 10) { // Monday morning
      suggestions.push('lesson_plan_sequence');
    }
    
    // Role-based suggestions
    switch (userRole) {
      case 'teacher':
        suggestions.push('assessment_creation_suite', 'student_progress_analysis');
        break;
      case 'principal':
        suggestions.push('weekly_grade_report', 'parent_communication_batch');
        break;
    }
    
    // Memory-based suggestions (check recent activities)
    const recentMemory = Array.from(this.memory.values())
      .filter(item => item.created_at > Date.now() - (24 * 60 * 60 * 1000)) // Last 24 hours
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 5);
    
    const hasGradingActivity = recentMemory.some(item => 
      item.key.includes('grade') || item.value?.includes?.('assessment')
    );
    
    if (hasGradingActivity && !suggestions.includes('parent_communication_batch')) {
      suggestions.push('parent_communication_batch');
    }
    
    return suggestions.filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates
  }
  
  /**
   * Proactive assistance - suggest actions based on user patterns and context
   */
  public async generateProactivesuggestions(): Promise<{
    suggestions: Array<{
      id: string;
      type: 'task' | 'reminder' | 'insight' | 'action';
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      action?: { type: string; params: any };
    }>;
    insights: string[];
  }> {
    const suggestions = [];
    const insights = [];
    const userRole = this.userProfile?.role || 'teacher';
    const currentTime = new Date();
    const dayOfWeek = currentTime.getDay();
    const hour = currentTime.getHours();
    
    // Analyze user patterns from memory
    const recentMemory = Array.from(this.memory.values())
      .filter(item => item.created_at > Date.now() - (7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.created_at - a.created_at);
    
    // Time-based proactive suggestions
    if (dayOfWeek === 1 && hour < 10) { // Monday morning
      suggestions.push({
        id: 'monday_planning',
        type: 'task' as const,
        title: 'Plan This Week',
        description: 'Start your week strong by planning lessons and activities',
        priority: 'high' as const,
        action: { type: 'open_screen', params: { route: 'lesson-generator' } }
      });
    }
    
    if (dayOfWeek === 5 && hour > 14) { // Friday afternoon
      suggestions.push({
        id: 'friday_wrap_up',
        type: 'task' as const,
        title: 'Weekly Wrap-up',
        description: 'Generate progress reports and communicate with parents',
        priority: 'medium' as const,
        action: { type: 'create_task', params: { template: 'weekly_grade_report' } }
      });
    }
    
    // Pattern-based suggestions
    const hasRecentLessonPlanning = recentMemory.some(item => 
      item.key.includes('lesson') || item.type === 'context' && String(item.value).includes('lesson')
    );
    
    if (hasRecentLessonPlanning) {
      suggestions.push({
        id: 'create_worksheet',
        type: 'action' as const,
        title: 'Create Practice Worksheet',
        description: 'Generate worksheets to reinforce your recent lesson content',
        priority: 'medium' as const,
        action: { type: 'generate_worksheet', params: { autoDetect: true } }
      });
      
      insights.push('You\'ve been actively planning lessons. Consider creating supporting materials like worksheets or assessments.');
    }
    
    // User interaction patterns
    const interactionHistory = recentMemory.filter(item => item.type === 'interaction');
    if (interactionHistory.length > 10) {
      insights.push(`You\'ve been quite active this week with ${interactionHistory.length} interactions. Great engagement!`);
      
      // Suggest efficiency improvements
      const commonTasks = this.identifyCommonTaskPatterns(interactionHistory);
      if (commonTasks.length > 0) {
        suggestions.push({
          id: 'automate_common_tasks',
          type: 'insight' as const,
          title: 'Automate Repetitive Tasks',
          description: `I noticed you frequently work with ${commonTasks.join(', ')}. Let me help automate this!`,
          priority: 'medium' as const,
          action: { type: 'setup_automation', params: { tasks: commonTasks } }
        });
      }
    }
    
    // Contextual help based on current challenges
    const recentErrors = recentMemory.filter(item => 
      item.key.includes('error') || String(item.value).toLowerCase().includes('failed')
    );
    
    if (recentErrors.length > 0) {
      suggestions.push({
        id: 'help_with_issues',
        type: 'action' as const,
        title: 'Need Help?',
        description: 'I noticed some challenges recently. Let me provide assistance or tutorials.',
        priority: 'high' as const,
        action: { type: 'provide_help', params: { context: 'error_recovery' } }
      });
    }
    
    // Role-specific proactive suggestions
    if (userRole === 'teacher') {
      // Check if it's assessment season
      const month = currentTime.getMonth();
      if ([2, 5, 11].includes(month)) { // March, June, December
        suggestions.push({
          id: 'assessment_season',
          type: 'task' as const,
          title: 'Assessment Season Prep',
          description: 'Prepare comprehensive assessments for this evaluation period',
          priority: 'high' as const,
          action: { type: 'create_task', params: { template: 'assessment_creation_suite' } }
        });
      }
      
      // Suggest parent communication if no recent contact
      const hasRecentParentContact = recentMemory.some(item => 
        item.key.includes('parent') || item.key.includes('communication')
      );
      
      if (!hasRecentParentContact && recentMemory.length > 5) {
        suggestions.push({
          id: 'parent_communication',
          type: 'reminder' as const,
          title: 'Connect with Parents',
          description: 'It\'s been a while since parent communication. Keep them engaged!',
          priority: 'medium' as const,
          action: { type: 'create_task', params: { template: 'parent_communication_batch' } }
        });
      }
    }
    
    // Learning and improvement suggestions
    if (recentMemory.length < 3) {
      suggestions.push({
        id: 'explore_features',
        type: 'insight' as const,
        title: 'Discover New Features',
        description: 'Explore more of what I can help you with - from lesson planning to student analytics',
        priority: 'low' as const,
        action: { type: 'feature_tour', params: {} }
      });
    }
    
    // Performance insights
    const completedTasks = recentMemory.filter(item => 
      item.type === 'context' && String(item.value).includes('completed')
    );
    
    if (completedTasks.length > 0) {
      insights.push(`You\'ve completed ${completedTasks.length} significant tasks this week. Excellent productivity!`);
    }
    
    return {
      suggestions: suggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      insights
    };
  }
  
  /**
   * Identify common task patterns for automation suggestions
   */
  private identifyCommonTaskPatterns(interactions: DashMemoryItem[]): string[] {
    const taskCounts: Record<string, number> = {};
    
    for (const interaction of interactions) {
      if (interaction.key.includes('worksheet')) taskCounts['worksheets'] = (taskCounts['worksheets'] || 0) + 1;
      if (interaction.key.includes('lesson')) taskCounts['lesson planning'] = (taskCounts['lesson planning'] || 0) + 1;
      if (interaction.key.includes('grade')) taskCounts['grading'] = (taskCounts['grading'] || 0) + 1;
      if (interaction.key.includes('parent')) taskCounts['parent communication'] = (taskCounts['parent communication'] || 0) + 1;
    }
    
    return Object.entries(taskCounts)
      .filter(([_, count]) => count >= 3)
      .map(([task, _]) => task);
  }
  
  /**
   * Context-aware help system
   */
  public provideContextualHelp(currentScreen?: string, userAction?: string): {
    helpText: string;
    quickActions: Array<{ label: string; action: string }>;
    tutorials: Array<{ title: string; description: string; url?: string }>;
  } {
    const userRole = this.userProfile?.role || 'teacher';
    
    let helpText = "I'm here to help! ";
    let quickActions: Array<{ label: string; action: string }> = [];
    let tutorials: Array<{ title: string; description: string; url?: string }> = [];
    
    // Screen-specific help
    if (currentScreen) {
      switch (currentScreen.toLowerCase()) {
        case 'worksheet-demo':
          helpText += "You can generate custom worksheets by selecting age group, difficulty, and subject. Try saying 'Create a math worksheet for 5-year-olds' or 'Generate an easy reading activity'.";
          quickActions = [
            { label: 'Generate Math Worksheet', action: 'generate_math_worksheet' },
            { label: 'Create Reading Activity', action: 'generate_reading_worksheet' },
            { label: 'Customize Settings', action: 'show_worksheet_settings' }
          ];
          break;
          
        case 'lesson-generator':
          helpText += "I can help you create comprehensive lesson plans. Specify the subject, grade level, and learning objectives, and I'll generate a complete lesson with activities and assessments.";
          quickActions = [
            { label: 'Quick Lesson Plan', action: 'generate_quick_lesson' },
            { label: 'Curriculum-Aligned Lesson', action: 'generate_curriculum_lesson' },
            { label: 'Multi-Day Sequence', action: 'generate_lesson_sequence' }
          ];
          break;
          
        case 'student-management':
          helpText += "Manage your students effectively with progress tracking, behavior notes, and performance analytics. I can help generate reports and identify students who need additional support.";
          quickActions = [
            { label: 'Progress Analysis', action: 'analyze_student_progress' },
            { label: 'Generate Report', action: 'generate_student_report' },
            { label: 'Communication Draft', action: 'draft_parent_message' }
          ];
          break;
          
        default:
          helpText += "I can assist with lesson planning, worksheet generation, student management, and much more. What would you like to work on?";
      }
    }
    
    // Role-specific help
    if (userRole === 'teacher') {
      tutorials.push(
        { title: 'Creating Effective Lesson Plans', description: 'Step-by-step guide to creating lesson plans', url: '/help/lesson-planning' },
        { title: 'Using AI for Worksheets', description: 'Generate custom worksheets with AI assistance', url: '/help/worksheet-generation' },
        { title: 'Parent Communication Best Practices', description: 'Effective strategies for parent communication', url: '/help/parent-communication' }
      );
    } else if (userRole === 'principal') {
      tutorials.push(
        { title: 'School Analytics Dashboard', description: 'Learn how to use the analytics dashboard', url: '/help/analytics' },
        { title: 'Curriculum Management', description: 'Manage your school curriculum effectively', url: '/help/curriculum' },
        { title: 'Teacher Performance Insights', description: 'Track and analyze teacher performance', url: '/help/teacher-insights' }
      );
    }
    
    // Add universal quick actions if none were set
    if (quickActions.length === 0) {
      quickActions = [
        { label: 'Create Worksheet', action: 'open_worksheet_generator' },
        { label: 'Plan Lesson', action: 'open_lesson_planner' },
        { label: 'View Tasks', action: 'show_active_tasks' },
        { label: 'Settings', action: 'open_dash_settings' }
      ];
    }
    
    return {
      helpText,
      quickActions,
      tutorials
    };
  }
  
  /**
   * Smart reminders and notifications
   */
  public async scheduleSmartReminder(params: {
    type: 'deadline' | 'follow_up' | 'routine' | 'custom';
    title: string;
    description: string;
    triggerTime: number;
    context?: any;
  }): Promise<{ success: boolean; reminderId?: string; error?: string }> {
    try {
      const reminder: DashReminder = {
        id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: params.title,
        message: params.description,
        type: 'one_time',
        triggerAt: params.triggerTime,
        userId: this.userProfile?.userId || 'unknown',
        conversationId: this.currentConversationId || undefined,
        priority: params.type === 'deadline' ? 'high' : 'medium',
        status: 'active'
      };
      
      // Store reminder in memory for later processing
      await this.addMemoryItem({
        type: 'context',
        key: `scheduled_reminder_${reminder.id}`,
        value: reminder,
        confidence: 1.0,
        expires_at: params.triggerTime + (24 * 60 * 60 * 1000) // Expire 24 hours after trigger
      });
      
      console.log('[Dash] Scheduled smart reminder:', reminder.title);
      return { success: true, reminderId: reminder.id };
      
    } catch (error) {
      console.error('[Dash] Failed to schedule reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reminder scheduling failed'
      };
    }
  }
  
  /**
   * Legacy method for backward compatibility
   */
  private cleanTextForSpeech(text: string): string {
    return this.normalizeTextForSpeech(text);
  }

  /**
   * Play Dash's response with voice synthesis
   */
  public async speakResponse(message: DashMessage, callbacks?: {
    onStart?: () => void;
    onDone?: () => void;
    onStopped?: () => void;
    onError?: (error: any) => void;
  }): Promise<void> {
    if (message.type !== 'assistant') {
      return;
    }

    try {
      const voiceSettings = this.personality.voice_settings;
      
      // Intelligently normalize the text before speaking
      const normalizedText = this.normalizeTextForSpeech(message.content);
      
      // Only speak if there's actual text content after normalization
      if (normalizedText.length === 0) {
        console.log('[Dash] No speakable content after normalization');
        callbacks?.onError?.('No speakable content after normalization');
        return;
      }
      
      console.log('[Dash] About to start speaking:', normalizedText.substring(0, 100) + '...');
      
      return new Promise<void>((resolve, reject) => {
        Speech.speak(normalizedText, {
          language: voiceSettings.language,
          pitch: voiceSettings.pitch,
          rate: voiceSettings.rate,
          voice: voiceSettings.voice,
          onStart: () => {
            console.log('[Dash] Started speaking');
            callbacks?.onStart?.();
          },
          onDone: () => {
            console.log('[Dash] Finished speaking');
            callbacks?.onDone?.();
            resolve();
          },
          onStopped: () => {
            console.log('[Dash] Speech stopped');
            callbacks?.onStopped?.();
            resolve();
          },
          onError: (error: any) => {
            console.error('[Dash] Speech error:', error);
            callbacks?.onError?.(error);
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error('[Dash] Failed to speak response:', error);
      callbacks?.onError?.(error);
      throw error;
    }
  }

  /**
   * Stop current speech
   */
  public async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('[Dash] Failed to stop speaking:', error);
    }
  }

  /**
   * Generate AI response based on user input and context
   */
  private async generateResponse(userInput: string, conversationId: string): Promise<DashMessage> {
    try {
      // Get conversation history for context
      const conversation = await this.getConversation(conversationId);
      const recentMessages = conversation?.messages.slice(-5) || [];
      
      // Get user context
      const session = await getCurrentSession();
      const profile = await getCurrentProfile();
      
      // Build context for AI
      const context = {
        userInput,
        conversationHistory: recentMessages,
        userProfile: profile,
        memory: Array.from(this.memory.values()),
        personality: this.personality,
        timestamp: new Date().toISOString(),
      };

      // Call your AI service (integrate with existing AI lesson generator or create new endpoint)
      const response = await this.callAIServiceLegacy(context);
      
      // Update memory based on interaction
      await this.updateMemory(userInput, response);
      
      // Create assistant message
      const assistantMessage: DashMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          confidence: response.confidence || 0.9,
          suggested_actions: response.suggested_actions || [],
          references: response.references || [],
          dashboard_action: response.dashboard_action
        }
      };

      // Post-process assistant message to avoid implying non-existent attachments (e.g., PDFs)
      assistantMessage.content = this.ensureNoAttachmentClaims(assistantMessage.content);
      return assistantMessage;
    } catch (error) {
      console.error('[Dash] Failed to generate response:', error);
      
      // Fallback response
      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: "I'm sorry, I'm having trouble processing that right now. Could you please try again?",
        timestamp: Date.now(),
        metadata: {
          confidence: 0.1,
          suggested_actions: ['try_again', 'contact_support']
        }
      };
    }
  }
  
  /**
   * Simple guard to prevent claims of sending/attaching files when no file was produced.
   * If such claims are detected, add a clarifying line and suggest available options.
   */
  private ensureNoAttachmentClaims(text: string): string {
    try {
      const t = String(text || '');
      const rx = /(attached|enclosed|here is|i have sent|see the pdf|see attached|download the file)/i;
      if (!rx.test(t)) return t;
      const note = '\n\nNote: I cannot attach files directly. If you need a PDF or export, use the on-screen Export/Save options or ask me to open the appropriate screen.';
      // Avoid duplicating the note if already present
      if (t.includes('cannot attach files directly')) return t;
      return t + note;
    } catch {
      return text;
    }
  }
  
  /**
   * Call AI service to generate response (legacy - used by generateResponse)
   */
  private async callAIServiceLegacy(context: any): Promise<{
    content: string;
    confidence?: number;
    suggested_actions?: string[];
    references?: Array<{
      type: 'lesson' | 'student' | 'assignment' | 'resource';
      id: string;
      title: string;
    }>;
    dashboard_action?:
      | { type: 'switch_layout'; layout: 'classic' | 'enhanced' }
      | { type: 'open_screen'; route: string; params?: Record<string, string> }
      | { type: 'execute_task'; task: DashTask };
  }> {
    try {
      // Use the enhanced AI service instead of hardcoded responses
      const roleSpec = this.userProfile ? this.personality.role_specializations[this.userProfile.role] : null;
      const capabilities = roleSpec?.capabilities || [];
      
      let systemPrompt = `You are Dash, an AI Teaching Assistant specialized in early childhood education and preschool management. You are part of EduDash Pro, an advanced educational platform.

CORE PERSONALITY: ${this.personality.personality_traits.join(', ')}

RESPONSE GUIDELINES:
- Be concise, practical, and directly helpful
- Provide specific, actionable advice
- Reference educational best practices when relevant  
- Use a warm but professional tone
- Keep responses focused and avoid unnecessary elaboration
- When suggesting actions, be specific about next steps

SPECIAL DASHBOARD ACTIONS:
- If user asks about dashboard layouts, include dashboard_action in response
- For lesson planning requests, suggest opening the lesson generator
- For assessment tasks, recommend relevant tools`;

      if (roleSpec && this.userProfile?.role) {
        systemPrompt += `

ROLE-SPECIFIC CONTEXT:
- You are helping a ${this.userProfile.role}
- Communication tone: ${roleSpec.tone}  
- Your specialized capabilities: ${capabilities.join(', ')}`;
      }

      systemPrompt += `

RESPONSE FORMAT: You must respond with practical advice and suggest 2-4 relevant actions the user can take.`;

      // Call AI service using general_assistance action with messages array
      const messages = [];
      
      // Add conversation history in Claude format
      if (context.conversationHistory && Array.isArray(context.conversationHistory)) {
        const recentHistory = context.conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          if (msg && typeof msg === 'object' && msg.type === 'user' && msg.content) {
            messages.push({ role: 'user', content: String(msg.content) });
          } else if (msg && typeof msg === 'object' && msg.type === 'assistant' && msg.content) {
            messages.push({ role: 'assistant', content: String(msg.content) });
          }
        }
      }
      
      // Add current user input
      messages.push({ role: 'user', content: context.userInput });
      
      const aiResponse = await this.callAIService({
        action: 'general_assistance',
        messages: messages,
        context: `User is a ${this.userProfile?.role || 'educator'} seeking assistance. ${systemPrompt}`,
        gradeLevel: 'General'
      });

      // Parse AI response and add contextual actions and dashboard behaviors
      const userInput = context.userInput.toLowerCase();
      let dashboard_action = undefined;
      let suggested_actions: string[] = [];

      // Analyze AI response for dashboard actions
      if (userInput.includes('dashboard') || userInput.includes('layout') || userInput.includes('switch')) {
        if (userInput.includes('enhanced') || userInput.includes('modern') || userInput.includes('new')) {
          dashboard_action = { type: 'switch_layout' as const, layout: 'enhanced' as const };
          suggested_actions.push('view_enhanced_features', 'dashboard_help');
        } else if (userInput.includes('classic') || userInput.includes('traditional') || userInput.includes('old')) {
          dashboard_action = { type: 'switch_layout' as const, layout: 'classic' as const };
          suggested_actions.push('view_classic_features', 'dashboard_help');
        } else {
          suggested_actions.push('switch_to_enhanced', 'switch_to_classic', 'dashboard_help');
        }
      }

      // Add lesson planning actions
      if (userInput.includes('lesson') || userInput.includes('plan') || userInput.includes('curriculum')) {
        const params: Record<string, string> = this.extractLessonParameters(userInput, aiResponse?.content || '');
        
        // Add tier-appropriate model selection
        const userTier = this.getUserTier();
        switch (userTier) {
          case 'starter':
          case 'premium':
          case 'enterprise':
            params.model = 'claude-3-sonnet';
            break;
          case 'free':
          default:
            params.model = 'claude-3-haiku';
            break;
        }
        
        dashboard_action = { type: 'open_screen' as const, route: '/screens/ai-lesson-generator', params };
        suggested_actions.push('create_lesson', 'view_lesson_templates', 'curriculum_alignment');
      }

      // Communication / messaging intents
      if (/\b(message|notify|contact)\b/i.test(userInput) && (userInput.includes('parent') || userInput.includes('teacher'))) {
        const subject = 'Announcement';
        const body = context.userInput;
        dashboard_action = { type: 'open_screen' as const, route: '/screens/teacher-messages', params: { prefillSubject: subject, prefillMessage: body } };
        suggested_actions.push('send_message');
      }

      // Announcements intent (route by role)
      if (/\b(announcement|announce|broadcast|platform\s+update|news)\b/i.test(userInput)) {
        const title = 'Announcement';
        const content = context.userInput;
        try {
          const prof = await getCurrentProfile();
          const role = (prof as any)?.role || 'teacher';
          if (role === 'super_admin') {
            dashboard_action = { type: 'open_screen' as const, route: '/screens/super-admin-announcements', params: { compose: '1', prefillTitle: title, prefillContent: content } };
          } else if (role === 'principal' || role === 'principal_admin') {
            dashboard_action = { type: 'open_screen' as const, route: '/screens/principal-announcement', params: { title, content, compose: '1' } };
          } else {
            // Teachers should use messaging to parents instead
            dashboard_action = { type: 'open_screen' as const, route: '/screens/teacher-messages', params: { prefillSubject: title, prefillMessage: content } };
          }
        } catch {
          dashboard_action = { type: 'open_screen' as const, route: '/screens/teacher-messages', params: { prefillSubject: title, prefillMessage: content } };
        }
        suggested_actions.push('create_announcement');
      }

      // Financial insights intent
      if (/\b(finance|financial|fees|payments|outstanding|revenue|insight)\b/i.test(userInput)) {
        try {
          const prof = await getCurrentProfile();
          const schoolId = (prof as any)?.preschool_id || (prof as any)?.organization_id;
          if (schoolId) {
            const insights = await AIInsightsService.generateInsightsForSchool(schoolId);
            if (insights && insights.length) {
              const bullets = insights.slice(0, 5).map(i => `• [${i.priority}] ${i.title} — ${i.description}`).join('\n');
              aiResponse.content = `${aiResponse.content || ''}\n\nFinancial insights:\n${bullets}`.trim();
            }
          }
        } catch (e) {
          console.warn('[Dash] Financial insights generation failed', e);
        }
        dashboard_action = { type: 'open_screen' as const, route: '/screens/financial-dashboard' };
        suggested_actions.push('view_financial_dashboard');
      }
      
      // PDF export intent
      if (/\b(pdf|export\s+pdf|download\s+pdf|create\s+pdf)\b/i.test(userInput)) {
        dashboard_action = { type: 'export_pdf' as any, title: 'Dash Export', content: aiResponse?.content || context.userInput } as any;
        suggested_actions.push('export_pdf');
      }
      
      // Add worksheet generation actions with voice command handling
      if (userInput.includes('worksheet') || userInput.includes('activity') || userInput.includes('practice') || userInput.includes('exercise')) {
        const worksheetParams = this.extractWorksheetParameters(userInput, aiResponse?.content || '');
        
        // Check if this is a direct generation command (voice)
        if (userInput.includes('generate') || userInput.includes('create') || userInput.includes('make') || worksheetParams.autoGenerate === 'true') {
          // For voice commands, try to generate directly
          dashboard_action = { 
            type: 'execute_task' as const, 
            task: {
              id: `worksheet_${Date.now()}`,
              title: 'Generate Worksheet',
              description: 'Creating educational worksheet based on voice command',
              type: 'one_time' as const,
              status: 'pending' as const,
              priority: 'medium' as const,
              assignedTo: 'dash',
              createdBy: 'dash',
              createdAt: Date.now(),
              steps: [{
                id: 'generate',
                title: 'Generate worksheet content',
                description: 'Create worksheet based on parameters',
                type: 'automated' as const,
                status: 'pending' as const,
                actions: [{
                  id: 'worksheet_gen',
                  type: 'api_call' as const,
                  parameters: worksheetParams
                }]
              }],
              context: {
                conversationId: this.currentConversationId || '',
                userRole: this.userProfile?.role || 'teacher',
                relatedEntities: []
              },
              progress: {
                currentStep: 0,
                completedSteps: []
              }
            }
          };
          suggested_actions.push('view_worksheet', 'download_pdf', 'customize_more');
        } else {
          // For regular commands, open the worksheet demo screen
          dashboard_action = { type: 'open_screen' as const, route: '/screens/worksheet-demo', params: worksheetParams };
          suggested_actions.push('generate_worksheet', 'customize_worksheet', 'download_pdf');
        }
      }

      // Add contextual suggested actions based on user input
      if (userInput.includes('student') || userInput.includes('pupil')) {
        suggested_actions.push('student_enrollment', 'track_progress', 'behavior_management');
      }
      if (userInput.includes('parent') || userInput.includes('communication')) {
        suggested_actions.push('draft_message', 'schedule_meeting', 'progress_report');
      }
      if (userInput.includes('assess') || userInput.includes('grade') || userInput.includes('test')) {
        suggested_actions.push('create_assessment', 'track_progress', 'performance_analytics');
      }

      // Fallback actions if none were added
      if (suggested_actions.length === 0) {
        suggested_actions = ['lesson_planning', 'student_management', 'dashboard_help', 'explore_features'];
      }

      return {
        content: aiResponse?.content || aiResponse?.message || "I'm here to help with your educational needs. What would you like to work on?",
        confidence: 0.9,
        suggested_actions: suggested_actions.slice(0, 4), // Limit to 4 actions
        references: [],
        ...(dashboard_action && { dashboard_action })
      };
      
    } catch (error) {
      console.error('[Dash] Legacy AI service call failed:', error);
      return {
        content: "I'm here to support your educational journey! Whether you need help with lesson planning, student assessment, parent communication, or dashboard navigation, I'm ready to assist. What would you like to work on together?",
        confidence: 0.7,
        suggested_actions: ['lesson_planning', 'student_management', 'parent_communication', 'dashboard_help'],
        references: []
      };
    }
  }

  /**
   * Transcribe audio by uploading to Supabase Storage and invoking Edge Function.
   * - Web: uses blob: URI fetch
   * - Native: uses file:// fetch
   */
  private async transcribeAudio(audioUri: string): Promise<{ transcript: string; storagePath?: string; language?: string; provider?: string; contentType?: string }> {
    let storagePath: string | undefined;
    let contentType: string | undefined;
    try {
      console.log('[Dash] Transcribing audio:', audioUri);

      // Language hint derived from personality voice settings
      const voiceLang = this.personality?.voice_settings?.language || 'en-ZA';
      const language = (() => {
        const map: Record<string, string> = { 'en-ZA': 'en', 'en-US': 'en', 'en-GB': 'en', 'af': 'af', 'zu': 'zu', 'xh': 'zu', 'st': 'st' };
        return map[voiceLang] || voiceLang.slice(0, 2).toLowerCase();
      })();

      // Determine user ID if available
      let userId = 'anonymous';
      try {
        const { data: auth } = await assertSupabase().auth.getUser();
        userId = auth?.user?.id || 'anonymous';
      } catch { /* Intentional: non-fatal */ }

      // Load blob from URI (works for both web (blob:) and native (file:))
      const res = await fetch(audioUri);
      if (!res.ok) {
        throw new Error(`Failed to load recorded audio: ${res.status}`);
      }
      const blob = await res.blob();

      // Infer content type and extension
      const uriLower = (audioUri || '').toLowerCase();
      contentType = blob.type || (uriLower.endsWith('.m4a') ? 'audio/mp4'
        : uriLower.endsWith('.mp3') ? 'audio/mpeg'
        : uriLower.endsWith('.wav') ? 'audio/wav'
        : uriLower.endsWith('.ogg') ? 'audio/ogg'
        : uriLower.endsWith('.webm') ? 'audio/webm'
        : 'application/octet-stream');
      const ext = contentType.includes('mp4') || uriLower.endsWith('.m4a') ? 'm4a'
        : contentType.includes('mpeg') || uriLower.endsWith('.mp3') ? 'mp3'
        : contentType.includes('wav') || uriLower.endsWith('.wav') ? 'wav'
        : contentType.includes('ogg') || uriLower.endsWith('.ogg') ? 'ogg'
        : contentType.includes('webm') || uriLower.endsWith('.webm') ? 'webm'
        : 'bin';
      const fileName = `dash_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      // Choose a platform-specific prefix for easier tracing
      const prefix = Platform.OS === 'web' ? 'web' : Platform.OS;
      storagePath = `${prefix}/${userId}/${fileName}`;

      // Upload to Supabase Storage (voice-notes bucket)
      let body: any;
      try {
        // Prefer File when available, otherwise upload Blob
        // @ts-ignore: File may not exist in some environments
        const maybeFile = typeof File !== 'undefined' ? new File([blob], fileName, { type: contentType }) : null;
        body = maybeFile || blob;
      } catch {
        body = blob;
      }

      const { error: uploadError } = await assertSupabase()
        .storage
        .from('voice-notes')
        .upload(storagePath, body, { contentType, upsert: true });
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Invoke the transcription function
      const { data, error: fnError } = await assertSupabase()
        .functions
        .invoke('transcribe-audio', {
          body: { storage_path: storagePath, language }
        });
      if (fnError) {
        throw new Error(`Transcription function failed: ${fnError.message || String(fnError)}`);
      }

      const transcript = (data as any)?.transcript || '';
      const provider = (data as any)?.provider;

      return {
        transcript: transcript || 'Transcription returned empty result.',
        storagePath,
        language,
        provider,
        contentType,
      };
    } catch (error) {
      console.error('[Dash] Transcription failed:', error);
      return {
        transcript: "Voice message received - couldn't transcribe audio.",
        storagePath,
        language: this.personality?.voice_settings?.language?.slice(0,2).toLowerCase() || 'en',
        contentType,
      };
    }
  }

  /**
   * Load persistent memory from storage
   */
  private async loadMemory(): Promise<void> {
    try {
      const storage = SecureStore || AsyncStorage;
      const memoryData = await storage.getItem(DashAIAssistant.MEMORY_KEY);
      
      if (memoryData) {
        const memoryArray: DashMemoryItem[] = JSON.parse(memoryData);
        this.memory = new Map(memoryArray.map(item => [item.key, item]));
        
        // Clean expired items
        this.cleanExpiredMemory();
        
        console.log(`[Dash] Loaded ${this.memory.size} memory items`);
      }
    } catch (error) {
      console.error('[Dash] Failed to load memory:', error);
    }
  }

  /**
   * Save memory to persistent storage
   */
  private async saveMemory(): Promise<void> {
    try {
      const storage = SecureStore || AsyncStorage;
      const memoryArray = Array.from(this.memory.values());
      await storage.setItem(DashAIAssistant.MEMORY_KEY, JSON.stringify(memoryArray));
    } catch (error) {
      console.error('[Dash] Failed to save memory:', error);
    }
  }

  /**
   * Update memory based on interaction
   */
  private async updateMemory(userInput: string, response: any): Promise<void> {
    try {
      // Extract key information to remember
      const timestamp = Date.now();
      
      // Remember user preferences
      if (userInput.includes('prefer') || userInput.includes('like')) {
        const memoryItem: DashMemoryItem = {
          id: `pref_${timestamp}`,
          type: 'preference',
          key: `user_preference_${timestamp}`,
          value: userInput,
          confidence: 0.8,
          created_at: timestamp,
          updated_at: timestamp,
          expires_at: timestamp + (30 * 24 * 60 * 60 * 1000) // 30 days
        };
        this.memory.set(memoryItem.key, memoryItem);
      }
      
      // Remember context for future conversations
      const contextItem: DashMemoryItem = {
        id: `ctx_${timestamp}`,
        type: 'context',
        key: `conversation_context_${timestamp}`,
        value: {
          input: userInput,
          response: response.content,
          timestamp
        },
        confidence: 0.6,
        created_at: timestamp,
        updated_at: timestamp,
        expires_at: timestamp + (7 * 24 * 60 * 60 * 1000) // 7 days
      };
      this.memory.set(contextItem.key, contextItem);
      
      await this.saveMemory();
    } catch (error) {
      console.error('[Dash] Failed to update memory:', error);
    }
  }

  /**
   * Clean expired memory items
   */
  private cleanExpiredMemory(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.memory.forEach((item, key) => {
      if (item.expires_at && item.expires_at < now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memory.delete(key));
  }

  /**
   * Load user context for personalization
   */
  private async loadUserContext(): Promise<void> {
    try {
      const profile = await getCurrentProfile();
      if (profile) {
        // Update personality based on user role
        this.personality = {
          ...this.personality,
          greeting: this.getPersonalizedGreeting(profile.role),
          expertise_areas: this.getExpertiseAreasForRole(profile.role)
        };
      }
    } catch (error) {
      console.error('[Dash] Failed to load user context:', error);
    }
  }

  /**
   * Get personalized greeting based on user role
   */
  private getPersonalizedGreeting(role: string): string {
    switch (role?.toLowerCase()) {
      case 'teacher':
        return "Hello! I'm Dash, your AI teaching assistant. Ready to create amazing learning experiences together?";
      case 'principal':
        return "Good day! I'm Dash, your educational AI assistant. How can I help you lead your school to success today?";
      case 'parent':
        return "Hi there! I'm Dash, here to support your child's educational journey. How can I assist you today?";
      default:
        return DEFAULT_PERSONALITY.greeting;
    }
  }

  /**
   * Get expertise areas based on user role
   */
  private getExpertiseAreasForRole(role: string): string[] {
    const baseAreas = ['education', 'student support', 'educational technology'];
    
    switch (role?.toLowerCase()) {
      case 'teacher':
        return [...baseAreas, 'lesson planning', 'classroom management', 'student assessment', 'curriculum development'];
      case 'principal':
        return [...baseAreas, 'school administration', 'staff management', 'policy development', 'school analytics'];
      case 'parent':
        return [...baseAreas, 'homework help', 'parent-teacher communication', 'student progress tracking'];
      default:
        return DEFAULT_PERSONALITY.expertise_areas;
    }
  }

  /**
   * Load personality settings
   */
  private async loadPersonality(): Promise<void> {
    try {
      const storage = SecureStore || AsyncStorage;
      const personalityData = await storage.getItem(DashAIAssistant.PERSONALITY_KEY);
      
      if (personalityData) {
        const savedPersonality = JSON.parse(personalityData);
        this.personality = { ...DEFAULT_PERSONALITY, ...savedPersonality };
      }
    } catch (error) {
      console.error('[Dash] Failed to load personality:', error);
    }
  }

  /**
   * Save personality settings
   */
  public async savePersonality(personality: Partial<DashPersonality>): Promise<void> {
    try {
      this.personality = { ...this.personality, ...personality };
      
      const storage = SecureStore || AsyncStorage;
      await storage.setItem(DashAIAssistant.PERSONALITY_KEY, JSON.stringify(this.personality));
    } catch (error) {
      console.error('[Dash] Failed to save personality:', error);
    }
  }

  /**
   * Get conversation by ID
   */
  public async getConversation(conversationId: string): Promise<DashConversation | null> {
    try {
      // Always use AsyncStorage for conversations to enable indexing
      const conversationData = await AsyncStorage.getItem(`${DashAIAssistant.CONVERSATIONS_KEY}_${conversationId}`);
      return conversationData ? JSON.parse(conversationData) : null;
    } catch (error) {
      console.error('[Dash] Failed to get conversation:', error);
      return null;
    }
  }

  /**
   * Get all conversations
   */
  public async getAllConversations(): Promise<DashConversation[]> {
    try {
      const conversationKeys = await this.getConversationKeys();
      const conversations: DashConversation[] = [];
      for (const key of conversationKeys) {
        const conversationData = await AsyncStorage.getItem(key);
        if (conversationData) {
          try {
            const parsed = JSON.parse(conversationData);
            if (!Array.isArray(parsed.messages)) parsed.messages = [];
            if (typeof parsed.title !== 'string') parsed.title = 'Conversation';
            if (typeof parsed.created_at !== 'number') parsed.created_at = Date.now();
            if (typeof parsed.updated_at !== 'number') parsed.updated_at = parsed.created_at;
            conversations.push(parsed as DashConversation);
          } catch (e) {
            console.warn('[Dash] Skipping invalid conversation entry for key:', key, e);
          }
        }
      }
      return conversations.sort((a, b) => b.updated_at - a.updated_at);
    } catch (error) {
      console.error('[Dash] Failed to get conversations:', error);
      return [];
    }
  }

  /**
   * Save conversation
   */
  private async saveConversation(conversation: DashConversation): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${DashAIAssistant.CONVERSATIONS_KEY}_${conversation.id}`,
        JSON.stringify(conversation)
      );
    } catch (error) {
      console.error('[Dash] Failed to save conversation:', error);
    }
  }

  /**
   * Add message to conversation
   */
  private async addMessageToConversation(conversationId: string, message: DashMessage): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        conversation.messages.push(message);
        conversation.updated_at = Date.now();
        await this.saveConversation(conversation);
        try {
          await AsyncStorage.setItem(DashAIAssistant.CURRENT_CONVERSATION_KEY, conversationId);
        } catch { /* Intentional: non-fatal */ }
      }
    } catch (error) {
      console.error('[Dash] Failed to add message to conversation:', error);
    }
  }

  /**
   * Get conversation keys from storage
   */
  private async getConversationKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter((k: string) => k.startsWith(`${DashAIAssistant.CONVERSATIONS_KEY}_`));
    } catch (error) {
      console.error('[Dash] Failed to list conversation keys:', error);
      return [];
    }
  }

  /**
   * Delete conversation
   */
  public async deleteConversation(conversationId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${DashAIAssistant.CONVERSATIONS_KEY}_${conversationId}`);
      // If deleting the current conversation, clear current pointer
      const currentId = await AsyncStorage.getItem(DashAIAssistant.CURRENT_CONVERSATION_KEY);
      if (currentId === conversationId) {
        await AsyncStorage.removeItem(DashAIAssistant.CURRENT_CONVERSATION_KEY);
        this.currentConversationId = null;
      }
    } catch (error) {
      console.error('[Dash] Failed to delete conversation:', error);
    }
  }

  /**
   * Get current conversation ID
   */
  public getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Set current conversation ID
   */
  public setCurrentConversationId(conversationId: string): void {
    this.currentConversationId = conversationId;
    // Persist pointer so canvas resumes the last chat
    try { AsyncStorage.setItem(DashAIAssistant.CURRENT_CONVERSATION_KEY, conversationId); } catch { /* Intentional: non-fatal */ }
  }

  /**
   * Check if currently recording
   */
  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get personality settings
   */
  public getPersonality(): DashPersonality {
    return this.personality;
  }

  /**
   * Get memory items
   */
  public getMemory(): DashMemoryItem[] {
    return Array.from(this.memory.values());
  }

  /**
   * Clear all memory
   */
  public async clearMemory(): Promise<void> {
    try {
      this.memory.clear();
      await this.saveMemory();
    } catch (error) {
      console.error('[Dash] Failed to clear memory:', error);
    }
  }

  /**
   * Add memory item
   */
  private async addMemoryItem(item: Omit<DashMemoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const memoryItem: DashMemoryItem = {
        ...item,
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      this.memory.set(memoryItem.key, memoryItem);
      await this.saveMemory();
    } catch (error) {
      console.error('[Dash] Failed to add memory item:', error);
    }
  }

  /**
   * Export conversation as text
   */
  public async exportConversation(conversationId: string): Promise<string> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      let exportText = `Dash AI Assistant Conversation\n`;
      exportText += `Title: ${conversation.title}\n`;
      exportText += `Date: ${new Date(conversation.created_at).toLocaleDateString()}\n`;
      exportText += `\n${'='.repeat(50)}\n\n`;

      for (const message of conversation.messages) {
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        const sender = message.type === 'user' ? 'You' : 'Dash';
        exportText += `[${timestamp}] ${sender}: ${message.content}\n\n`;
      }

      return exportText;
    } catch (error) {
      console.error('[Dash] Failed to export conversation:', error);
      throw error;
    }
  }

  /**
   * Save a lesson from a conversation message to the database
   */
  public async saveLessonToDatabase(
    lessonContent: string,
    lessonParams: {
      topic?: string;
      subject?: string;
      gradeLevel?: number;
      duration?: number;
      objectives?: string[];
    }
  ): Promise<{ success: boolean; lessonId?: string; error?: string }> {
    try {
      console.log('[Dash] Saving lesson to database...');
      
      // Get current user and profile
      const { data: auth } = await assertSupabase().auth.getUser();
      const authUserId = auth?.user?.id || '';
      const { data: profile } = await assertSupabase()
        .from('users')
        .select('id,preschool_id,organization_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
        
      if (!profile) {
        return { success: false, error: 'User not found or not signed in' };
      }

      // Get lesson categories
      const { data: categories } = await assertSupabase()
        .from('lesson_categories')
        .select('id,name')
        .limit(1);
        
      const categoryId = categories?.[0]?.id;
      if (!categoryId) {
        return { success: false, error: 'No lesson category found. Please create a category first.' };
      }

      // Import the LessonGeneratorService dynamically to avoid circular imports
      const { LessonGeneratorService } = await import('@/lib/ai/lessonGenerator');

      // Create lesson object compatible with LessonGeneratorService
      const lesson = {
        title: lessonParams.topic 
          ? `${lessonParams.topic} - Grade ${lessonParams.gradeLevel || 'N/A'}` 
          : 'Dash Generated Lesson',
        description: lessonContent.length > 200 
          ? lessonContent.substring(0, 200) + '...' 
          : lessonContent,
        content: lessonContent,
        assessmentQuestions: lessonParams.objectives || [],
        activities: [] // Could be extracted from content in the future
      };

      // Save the lesson
      const result = await LessonGeneratorService.saveGeneratedLesson({
        lesson,
        teacherId: profile.id,
        preschoolId: profile.preschool_id || profile.organization_id || '',
        ageGroupId: 'dash-generated',
        categoryId,
        template: { 
          duration: lessonParams.duration || 45, 
          complexity: 'moderate' as const 
        },
        isPublished: true,
      });

      if (result.success) {
        console.log('[Dash] Lesson saved successfully:', result.lessonId);
      } else {
        console.error('[Dash] Failed to save lesson:', result.error);
      }

      return result;
    } catch (error: any) {
      console.error('[Dash] Error saving lesson to database:', error);
      return {
        success: false,
        error: error?.message || 'Failed to save lesson'
      };
    }
  }

  /**
   * Save homework help session or grading session as a study resource
   */
  public async saveStudyResource(
    content: string,
    resourceParams: {
      title?: string;
      type: 'homework_help' | 'grading_session';
      subject?: string;
      gradeLevel?: number;
      question?: string;
    }
  ): Promise<{ success: boolean; resourceId?: string; error?: string }> {
    try {
      console.log('[Dash] Saving study resource to database...');
      
      // Get current user and profile
      const { data: auth } = await assertSupabase().auth.getUser();
      const authUserId = auth?.user?.id || '';
      const { data: profile } = await assertSupabase()
        .from('users')
        .select('id,preschool_id,organization_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
        
      if (!profile) {
        return { success: false, error: 'User not found or not signed in' };
      }

      // Save as a study resource or note
      const resourceTitle = resourceParams.title || 
        (resourceParams.type === 'homework_help' 
          ? `Homework Help: ${resourceParams.subject || 'General'}` 
          : `Grading Session: ${resourceParams.subject || 'Assessment'}`);

      const resourceData = {
        title: resourceTitle,
        description: content.length > 200 ? content.substring(0, 200) + '...' : content,
        content: content,
        resource_type: 'study_material',
        subject: resourceParams.subject || null,
        grade_level: resourceParams.gradeLevel || null,
        created_by: profile.id,
        organization_id: profile.preschool_id || profile.organization_id || null,
        is_ai_generated: true,
        metadata: {
          dash_type: resourceParams.type,
          original_question: resourceParams.question || null,
          generated_at: new Date().toISOString()
        }
      };

      // Try to save to resources table, if it exists
      const { data, error } = await assertSupabase()
        .from('resources')
        .insert(resourceData)
        .select('id')
        .single();

      if (error) {
        console.warn('[Dash] Resources table not available or insert failed:', error);
        // Could save to a different table or just keep in conversations
        return { 
          success: false, 
          error: 'Study resource saved in conversation only' 
        };
      }

      console.log('[Dash] Study resource saved successfully:', data.id);
      return { success: true, resourceId: data.id };
    } catch (error: any) {
      console.error('[Dash] Error saving study resource:', error);
      return {
        success: false,
        error: error?.message || 'Failed to save study resource'
      };
    }
   }


  /**
   * Get active reminders from agentic engine
   */
  public async getActiveReminders(): Promise<any[]> {
    try {
      const { DashAgenticEngine } = await import('./DashAgenticEngine');
      const agenticEngine = DashAgenticEngine.getInstance();
      return agenticEngine.getActiveReminders();
    } catch (error) {
      console.error('[Dash] Failed to get active reminders:', error);
      return [];
    }
  }

  // ==================== ENHANCED AGENTIC METHODS ====================

  /**
   * Load user profile
   */
  private async loadUserProfile(): Promise<void> {
    try {
      const storage = SecureStore || AsyncStorage;
      const profileData = await storage.getItem(DashAIAssistant.USER_PROFILE_KEY);
      
      if (profileData) {
        this.userProfile = JSON.parse(profileData);
        console.log(`[Dash] Loaded user profile for ${this.userProfile?.role || 'unknown'}`);
      } else {
        // Create basic profile from current user
        const currentProfile = await getCurrentProfile();
        if (currentProfile) {
          this.userProfile = {
            userId: currentProfile.id,
            role: currentProfile.role as any,
            name: (currentProfile as any).full_name || 'User',
            preferences: {
              communication_style: 'friendly',
              notification_frequency: 'daily_digest',
              task_management_style: 'summary',
              ai_autonomy_level: 'medium'
            },
            context: {
              organization_id: currentProfile.organization_id || undefined
            },
            goals: {
              short_term: [],
              long_term: [],
              completed: []
            },
            interaction_patterns: {
              most_active_times: [],
              preferred_task_types: [],
              common_requests: [],
              success_metrics: {}
            },
            memory_preferences: {
              remember_personal_details: true,
              remember_work_patterns: true,
              remember_preferences: true,
              auto_suggest_tasks: true,
              proactive_reminders: true
            }
          };
          await this.saveUserProfile();
        }
      }
    } catch (error) {
      console.error('[Dash] Failed to load user profile:', error);
    }
  }

  /**
   * Save user profile
   */
  private async saveUserProfile(): Promise<void> {
    if (!this.userProfile) return;
    
    try {
      const storage = SecureStore || AsyncStorage;
      await storage.setItem(DashAIAssistant.USER_PROFILE_KEY, JSON.stringify(this.userProfile));
    } catch (error) {
      console.error('[Dash] Failed to save user profile:', error);
    }
  }

  /**
   * Start proactive behaviors
   */
  private async startProactiveBehaviors(): Promise<void> {
    if (this.proactiveTimer) {
      clearInterval(this.proactiveTimer);
    }

    this.proactiveTimer = setInterval(async () => {
      await this.executeProactiveBehaviors();
    }, 10 * 60 * 1000) as any; // Run every 10 minutes

    console.log('[Dash] Started proactive behaviors');
  }

  /**
   * Execute proactive behaviors
   */
  private async executeProactiveBehaviors(): Promise<void> {
    if (!this.userProfile) return;

    try {
      const context = await this.getCurrentContext();
      const roleSpecialization = this.personality.role_specializations[this.userProfile.role];
      
      if (!roleSpecialization) return;

      // Execute role-specific proactive behaviors
      for (const behavior of roleSpecialization.proactive_behaviors) {
        await this.executeProactiveBehavior(behavior, context);
      }
    } catch (error) {
      console.error('[Dash] Error in proactive behaviors:', error);
    }
  }

  /**
   * Execute a specific proactive behavior
   */
  private async executeProactiveBehavior(behavior: string, context: any): Promise<void> {
    switch (behavior) {
      case 'suggest_lesson_improvements':
        if (context.time_context?.is_work_hours && this.userProfile?.role === 'teacher') {
          console.log('[Dash] Proactive: Analyzing lessons for improvement suggestions');
        }
        break;
        
      case 'remind_upcoming_deadlines':
        if (this.userProfile?.role === 'teacher' || this.userProfile?.role === 'principal') {
          console.log('[Dash] Proactive: Checking for upcoming deadlines');
        }
        break;
        
      case 'flag_student_concerns':
        if (this.userProfile?.role === 'teacher') {
          console.log('[Dash] Proactive: Monitoring for student concerns');
        }
        break;
        
      case 'monitor_school_metrics':
        if (this.userProfile?.role === 'principal') {
          console.log('[Dash] Proactive: Monitoring school performance metrics');
        }
        break;
    }
  }

  /**
   * Get current context
   */
  private async getCurrentContext(): Promise<any> {
    try {
      const now = new Date();
      const profile = await getCurrentProfile();
      
      return {
        time_context: {
          hour: now.getHours(),
          day_of_week: now.toLocaleDateString('en', { weekday: 'long' }),
          is_work_hours: now.getHours() >= 8 && now.getHours() <= 17
        },
        user_state: {
          role: profile?.role || 'unknown'
        },
        app_context: {
          active_features: []
        }
      };
    } catch (error) {
      console.error('[Dash] Failed to get current context:', error);
      return {};
    }
  }

  /**
   * Generate enhanced response with role-based intelligence
   */
  private async generateEnhancedResponse(content: string, conversationId: string, analysis: any): Promise<DashMessage> {
    try {
      // Get role-specific greeting and capabilities
      const roleSpec = this.userProfile ? this.personality.role_specializations[this.userProfile.role] : null;
      const capabilities = roleSpec?.capabilities || [];
      
      // Enhance the prompt with role context and capabilities
      let systemPrompt = `You are Dash, an AI Teaching Assistant specialized in early childhood education and preschool management. You are part of EduDash Pro, an advanced educational platform.

CORE PERSONALITY: ${this.personality.personality_traits.join(', ')}

RESPONSE GUIDELINES:
- Be concise, practical, and directly helpful
- Provide specific, actionable advice
- Reference educational best practices when relevant
- Use a warm but professional tone
- Keep responses focused and avoid unnecessary elaboration
- When suggesting actions, be specific about next steps`;
      
      if (roleSpec && this.userProfile?.role) {
        systemPrompt += `

ROLE-SPECIFIC CONTEXT:
- You are helping a ${this.userProfile.role}
- Communication tone: ${roleSpec.tone}
- Your specialized capabilities: ${capabilities.join(', ')}
- Role-specific greeting: ${roleSpec.greeting}`;
      }

      // Add context awareness
      if (analysis.context) {
        systemPrompt += `

CURRENT CONTEXT: ${JSON.stringify(analysis.context, null, 2)}`;
      }

      // Add intent understanding
      if (analysis.intent) {
        systemPrompt += `

USER INTENT: ${analysis.intent.primary_intent} (confidence: ${analysis.intent.confidence})
${analysis.intent.secondary_intents?.length ? `Secondary intents: ${analysis.intent.secondary_intents.join(', ')}` : ''}`;
      }

      systemPrompt += `

IMPORTANT: Always provide specific, contextual responses that directly address the user's needs. Avoid generic educational advice unless specifically requested.`;

      // Call AI service with enhanced context using homework_help action
      const aiResponse = await this.callAIService({
        action: 'homework_help',
        question: content,
        context: `User is a ${this.userProfile?.role || 'educator'} seeking assistance. ${systemPrompt}`,
        gradeLevel: 'General',
        conversationHistory: this.currentConversationId ? (await this.getConversation(this.currentConversationId))?.messages || [] : []
      });

      const assistantMessage: DashMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: aiResponse.content || 'I apologize, but I encountered an issue processing your request.',
        timestamp: Date.now(),
        metadata: {
          confidence: analysis.intent?.confidence || 0.5,
          suggested_actions: this.generateSuggestedActions(analysis.intent, capabilities),
          user_intent: analysis.intent,
          dashboard_action: this.generateDashboardAction(analysis.intent)
        }
      };

      return assistantMessage;
    } catch (error) {
      console.error('[Dash] Enhanced response generation failed:', error);
      // Fallback to basic response
      return this.generateResponse(content, conversationId);
    }
  }

  /**
   * Handle proactive opportunities
   */
  private async handleProactiveOpportunities(opportunities: any[], response: DashMessage): Promise<void> {
    try {
      const { DashAgenticEngine } = await import('./DashAgenticEngine');
      const agenticEngine = DashAgenticEngine.getInstance();

      for (const opportunity of opportunities.slice(0, 2)) {
        if (opportunity.type === 'automation' && opportunity.priority === 'high') {
          await agenticEngine.createTask(
            opportunity.title,
            opportunity.description,
            'workflow',
            this.userProfile?.role || 'user',
            [{
              title: 'Execute automation',
              description: opportunity.description,
              type: 'automated',
              status: 'pending',
              actions: opportunity.actions?.map((action: any) => ({
                id: `action_${Date.now()}`,
                type: this.mapActionType(action.action),
                parameters: action.parameters || {}
              })) || []
            }]
          );
        } else if (opportunity.type === 'reminder') {
          await agenticEngine.createReminder(
            opportunity.title,
            opportunity.description,
            opportunity.timing.best_time || Date.now() + (5 * 60 * 1000),
            opportunity.priority
          );
        }
      }

      if (response.metadata) {
        response.metadata.suggested_actions = opportunities.slice(0, 3).map(op => op.title);
      }
    } catch (error) {
      console.error('[Dash] Failed to handle proactive opportunities:', error);
    }
  }

  /**
   * Handle action intents
   */
  private async handleActionIntent(intent: any, response: DashMessage): Promise<void> {
    try {
      const { DashAgenticEngine } = await import('./DashAgenticEngine');
      const agenticEngine = DashAgenticEngine.getInstance();

      if (intent.primary_intent === 'create_lesson') {
        await agenticEngine.createTask(
          'Create Lesson Plan',
          `Create a lesson plan for ${intent.parameters.subject || 'the specified subject'}`,
          'workflow',
          'teacher',
          [
            {
              title: 'Gather curriculum requirements',
              description: 'Research curriculum standards and requirements',
              type: 'automated',
              status: 'pending'
            },
            {
              title: 'Create lesson structure',
              description: 'Design lesson objectives, activities, and assessments',
              type: 'automated',
              status: 'pending'
            },
            {
              title: 'Review and finalize',
              description: 'Review lesson plan and make final adjustments',
              type: 'manual',
              status: 'pending'
            }
          ]
        );

        if (response.metadata) {
          response.metadata.dashboard_action = {
            type: 'execute_task',
            taskId: 'lesson_creation_task'
          };
        }
      } else if (intent.primary_intent === 'schedule_task') {
        const reminderTime = this.parseTimeFromIntent(intent.parameters.time) || Date.now() + (60 * 60 * 1000);
        await agenticEngine.createReminder(
          'Scheduled Task',
          `Reminder: ${intent.parameters.task || 'Complete scheduled task'}`,
          reminderTime,
          'medium'
        );
      }
    } catch (error) {
      console.error('[Dash] Failed to handle action intent:', error);
    }
  }

  /**
   * Update enhanced memory with analysis context
   */
  private async updateEnhancedMemory(userInput: string, response: DashMessage, analysis: any): Promise<void> {
    try {
      const timestamp = Date.now();
      
      const intentMemory: DashMemoryItem = {
        id: `intent_${timestamp}`,
        type: 'pattern',
        key: `user_intent_${analysis.intent.primary_intent}`,
        value: {
          intent: analysis.intent.primary_intent,
          confidence: analysis.intent.confidence,
          context: analysis.context,
          timestamp: timestamp
        },
        confidence: analysis.intent.confidence,
        created_at: timestamp,
        updated_at: timestamp,
        expires_at: timestamp + (90 * 24 * 60 * 60 * 1000),
        reinforcement_count: 1,
        tags: ['intent', 'pattern', analysis.intent.category]
      };
      
      this.memory.set(intentMemory.key, intentMemory);
      
      if (response.metadata?.confidence && response.metadata.confidence > 0.7) {
        const successMemory: DashMemoryItem = {
          id: `success_${timestamp}`,
          type: 'interaction',
          key: `successful_interaction_${timestamp}`,
          value: {
            user_input: userInput,
            response: response.content,
            intent: analysis.intent.primary_intent,
            confidence: response.metadata.confidence
          },
          confidence: response.metadata.confidence,
          created_at: timestamp,
          updated_at: timestamp,
          expires_at: timestamp + (30 * 24 * 60 * 60 * 1000),
          emotional_weight: 1.0,
          tags: ['success', 'interaction']
        };
        
        this.memory.set(successMemory.key, successMemory);
      }
      
      await this.saveMemory();
    } catch (error) {
      console.error('[Dash] Failed to update enhanced memory:', error);
    }
  }

  /**
   * Call AI service with enhanced context
   */
  private async callAIService(params: any): Promise<any> {
    try {
      const supabase = assertSupabase();
      
      // Include model from environment variables if not specified
      const requestBody = {
        ...params,
        model: params.model || process.env.EXPO_PUBLIC_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
      };
      
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: requestBody
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[Dash] AI service call failed:', error);
      return { content: 'I apologize, but I encountered an issue. Please try again.' };
    }
  }

  /**
   * Generate suggested actions based on intent and capabilities
   */
  private generateSuggestedActions(intent: any, capabilities: string[]): string[] {
    const actions: string[] = [];
    
    if (intent?.primary_intent === 'create_lesson' && capabilities.includes('lesson_planning')) {
      actions.push('Create detailed lesson plan', 'Align with curriculum', 'Generate assessment rubric');
    } else if (intent?.primary_intent === 'grade_assignment' && capabilities.includes('grading_assistance')) {
      actions.push('Auto-grade assignments', 'Generate feedback', 'Track student progress');
    } else if (intent?.primary_intent === 'parent_communication') {
      actions.push('Draft parent email', 'Schedule meeting', 'Share progress report');
    }
    
    return actions;
  }

  /**
   * Generate dashboard action based on intent
   */
  private generateDashboardAction(intent: any): any {
    if (intent?.primary_intent === 'create_lesson') {
      return {
        type: 'open_screen',
        route: '/screens/lesson-planner',
        params: intent.parameters
      };
    } else if (intent?.primary_intent === 'grade_assignment') {
      return {
        type: 'open_screen',
        route: '/screens/grading-assistant',
        params: intent.parameters
      };
    } else if (intent?.primary_intent === 'student_progress') {
      return {
        type: 'open_screen',
        route: '/screens/student-progress',
        params: intent.parameters
      };
    }
    
    return null;
  }

  /**
   * Map action type for task execution
   */
  private mapActionType(action: string): string {
    const mapping: { [key: string]: string } = {
      'navigate': 'navigate',
      'create_task': 'api_call',
      'send_email': 'email_send',
      'create_notification': 'notification',
      'update_data': 'data_update',
      'generate_file': 'file_generation'
    };
    
    return mapping[action] || 'api_call';
  }

  /**
   * Parse time from intent parameters
   */
  private parseTimeFromIntent(timeString?: string): number | null {
    if (!timeString) return null;
    
    const now = new Date();
    
    if (timeString.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow.getTime();
    } else if (timeString.toLowerCase().includes('hour')) {
      const hours = parseInt(timeString.match(/\d+/)?.[0] || '1');
      return now.getTime() + (hours * 60 * 60 * 1000);
    }
    
    return null;
  }

  /**
   * Get user profile
   */
  public getUserProfile(): DashUserProfile | null {
    return this.userProfile;
  }
  
  /**
   * Get user's subscription tier for model selection
   */
  private getUserTier(): 'free' | 'starter' | 'premium' | 'enterprise' {
    // For now, return 'starter' as default since we don't have subscription info in DashAIAssistant
    // This should be updated to check actual subscription status when available
    // TODO: Integrate with subscription context or session data
    return 'starter';
  }

  /**
   * Update user preferences
   */
  public async updateUserPreferences(preferences: Partial<DashUserProfile['preferences']>): Promise<void> {
    if (!this.userProfile) return;
    
    this.userProfile.preferences = {
      ...this.userProfile.preferences,
      ...preferences
    };
    
    await this.saveUserProfile();
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.proactiveTimer) {
      clearInterval(this.proactiveTimer);
      this.proactiveTimer = null;
    }
  }
}

export default DashAIAssistant;