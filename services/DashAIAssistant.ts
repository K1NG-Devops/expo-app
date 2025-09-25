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

      await Audio.requestPermissionsAsync();

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
    } catch (error) {
      console.error('[Dash] Audio initialization failed:', error);
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
    } catch {}
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
    const transcript = await this.transcribeAudio(audioUri);
    
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
        transcript
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
      console.log('[Dash] Starting recording...');
      this.recordingObject = new Audio.Recording();
      await (this.recordingObject as any).prepareAsync({
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
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

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
   * Play Dash's response with voice synthesis
   */
  public async speakResponse(message: DashMessage): Promise<void> {
    if (message.type !== 'assistant') {
      return;
    }

    try {
      const voiceSettings = this.personality.voice_settings;
      
      await Speech.speak(message.content, {
        language: voiceSettings.language,
        pitch: voiceSettings.pitch,
        rate: voiceSettings.rate,
        voice: voiceSettings.voice,
        onStart: () => console.log('[Dash] Started speaking'),
        onDone: () => console.log('[Dash] Finished speaking'),
        onStopped: () => console.log('[Dash] Speech stopped'),
        onError: (error) => console.error('[Dash] Speech error:', error),
      });
    } catch (error) {
      console.error('[Dash] Failed to speak response:', error);
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
      | { type: 'open_screen'; route: string; params?: Record<string, string> };
  }> {
    // This would integrate with your existing AI services
    // For now, return a smart contextual response
    
    const userInput = context.userInput.toLowerCase();
    
    // Enhanced dashboard layout commands with better pattern matching
    const dashboardKeywords = ['dashboard', 'layout', 'switch', 'change', 'toggle', 'view'];
    const enhancedKeywords = ['enhanced', 'modern', 'new', 'improved', 'better', 'updated'];
    const classicKeywords = ['classic', 'traditional', 'old', 'original', 'previous', 'standard'];
    
    const isDashboardQuery = dashboardKeywords.some(keyword => userInput.includes(keyword));
    const isAskingForEnhanced = enhancedKeywords.some(keyword => userInput.includes(keyword));
    const isAskingForClassic = classicKeywords.some(keyword => userInput.includes(keyword));
    
    if (isDashboardQuery || userInput.includes('dashboard') || userInput.includes('layout') || userInput.includes('switch')) {
      
      if (isAskingForEnhanced) {
        return {
          content: `I'll switch you to the Enhanced Dashboard! This modern layout features improved design, better organization, and enhanced visual elements. The switch will happen automatically.`,
          confidence: 0.95,
          suggested_actions: ['view_enhanced_features', 'dashboard_help'],
          references: [],
          dashboard_action: {
            type: 'switch_layout',
            layout: 'enhanced'
          }
        };
      } else if (isAskingForClassic) {
        return {
          content: `I'll switch you to the Classic Dashboard! This familiar layout provides the traditional view you're used to. The switch will happen automatically.`,
          confidence: 0.95,
          suggested_actions: ['view_classic_features', 'dashboard_help'],
          references: [],
          dashboard_action: {
            type: 'switch_layout',
            layout: 'classic'
          }
        };
      } else {
        return {
          content: `I can help you switch between dashboard layouts! You have two options:\n\n📊 **Classic Dashboard** - Traditional layout with familiar organization\n✨ **Enhanced Dashboard** - Modern design with improved visual elements\n\nWhich layout would you prefer?`,
          confidence: 0.9,
          suggested_actions: ['switch_to_enhanced', 'switch_to_classic', 'dashboard_help'],
          references: []
        };
      }
    }
    
    // Settings and preferences
    if (userInput.includes('setting') || userInput.includes('prefer') || userInput.includes('config')) {
      if (userInput.includes('dashboard')) {
        return {
          content: `I can help you customize your dashboard! You can switch between layouts, adjust preferences, or explore different views. What would you like to change about your dashboard?`,
          confidence: 0.85,
          suggested_actions: ['switch_dashboard_layout', 'dashboard_settings', 'view_options'],
          references: []
        };
      }
    }
    
    // Enhanced educational context responses
    const lessonKeywords = ['lesson', 'teach', 'curriculum', 'plan', 'activity', 'learning'];
    const assessmentKeywords = ['assess', 'grade', 'test', 'quiz', 'evaluation', 'progress', 'performance'];
    const studentKeywords = ['student', 'pupil', 'child', 'learner', 'class'];
    const parentKeywords = ['parent', 'communication', 'meeting', 'report', 'update', 'feedback'];
    
    const isLessonQuery = lessonKeywords.some(keyword => userInput.includes(keyword));
    const isAssessmentQuery = assessmentKeywords.some(keyword => userInput.includes(keyword));
    const isStudentQuery = studentKeywords.some(keyword => userInput.includes(keyword));
    const isParentQuery = parentKeywords.some(keyword => userInput.includes(keyword));
    
    if (isLessonQuery) {
      // Extract lightweight params from the user's text to prefill the form
      const extract = (text: string) => {
        const params: Record<string, string> = {};
        const gradeMatch = text.match(/grade\s*(\d{1,2})/i);
        if (gradeMatch) params.gradeLevel = gradeMatch[1];
        const subjectMatch = text.match(/(math|mathematics|science|english|afrikaans|life\s?skills|geography|history)/i);
        if (subjectMatch) params.subject = subjectMatch[1];
        const topicMatch = text.match(/(?:on|about)\s+([^\.,;\n]{3,60})/i);
        if (topicMatch) params.topic = topicMatch[1].trim();
        if (/auto|generate|create/i.test(text)) params.autogenerate = '1';
        return params;
      };
      const params = extract(userInput);

      return {
        content: `I can help you create engaging, CAPS-aligned lessons! I can assist with lesson planning, activity suggestions, resource recommendations, and curriculum alignment. What subject or topic would you like to focus on?`,
        confidence: 0.9,
        suggested_actions: ['create_lesson', 'view_lesson_templates', 'curriculum_alignment', 'activity_suggestions'],
        references: [],
        dashboard_action: { type: 'open_screen', route: '/screens/ai-lesson-generator', params }
      };
    }
    
    if (isAssessmentQuery) {
      return {
        content: `Assessment and evaluation are key to student success! I can help you create formative and summative assessments, track student progress, analyze performance data, and generate detailed reports. What type of assessment do you need help with?`,
        confidence: 0.9,
        suggested_actions: ['create_assessment', 'track_progress', 'performance_analytics', 'generate_reports'],
        references: []
      };
    }
    
    if (isStudentQuery && !isAssessmentQuery) {
      return {
        content: `Student management and support is at the heart of great education! I can help with student enrollment, progress tracking, behavior management, individualized learning plans, and parent communication. How can I support your students today?`,
        confidence: 0.85,
        suggested_actions: ['student_enrollment', 'track_progress', 'behavior_management', 'parent_communication'],
        references: []
      };
    }
    
    if (isParentQuery) {
      return {
        content: `Strong parent partnerships enhance student success! I can help you draft professional communications, schedule parent-teacher meetings, create progress reports, send announcements, and handle difficult conversations. What type of parent interaction do you need help with?`,
        confidence: 0.85,
        suggested_actions: ['draft_message', 'schedule_meeting', 'progress_report', 'send_announcement'],
        references: []
      };
    }
    
    // Help and support commands
    const helpKeywords = ['help', 'assist', 'support', 'guide', 'how', 'what', 'explain'];
    const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    
    const isHelpQuery = helpKeywords.some(keyword => userInput.includes(keyword));
    const isGreeting = greetingKeywords.some(keyword => userInput.includes(keyword));
    
    if (isGreeting) {
      return {
        content: `Hello! Great to see you! I'm Dash, your AI teaching assistant. I'm here to help with lesson planning, student management, assessments, parent communication, and dashboard navigation. What would you like to work on today?`,
        confidence: 0.95,
        suggested_actions: ['lesson_planning', 'student_management', 'dashboard_help', 'explore_features'],
        references: []
      };
    }
    
    if (isHelpQuery) {
      return {
        content: `I'm here to help! Here's what I can assist you with:\n\n🎓 **Teaching Support**\n• Lesson planning & curriculum alignment\n• Assessment creation & grading\n• Student progress tracking\n\n👨‍👩‍👧‍👦 **Communication**\n• Parent communication & meetings\n• School announcements\n\n⚙️ **Dashboard & Settings**\n• Switch dashboard layouts\n• Navigate features\n\nWhat specific area would you like help with?`,
        confidence: 0.9,
        suggested_actions: ['lesson_planning', 'student_management', 'parent_communication', 'dashboard_help'],
        references: []
      };
    }

    // Default encouraging response
    return {
      content: `I'm here to support your educational journey! Whether you need help with lesson planning, student assessment, parent communication, dashboard navigation, or administrative tasks, I'm ready to assist. What would you like to work on together?`,
      confidence: 0.7,
      suggested_actions: ['explore_features', 'lesson_planning', 'student_management', 'dashboard_help'],
      references: []
    };
  }

  /**
   * Transcribe audio using the existing transcription service
   */
  private async transcribeAudio(audioUri: string): Promise<string> {
    try {
      // This would call your existing transcription service
      // For now, return a placeholder
      console.log('[Dash] Transcribing audio:', audioUri);
      
      // TODO: Integrate with supabase/functions/transcribe-audio
      // For now, return a placeholder transcript
      return "Voice message received - transcription in progress...";
    } catch (error) {
      console.error('[Dash] Transcription failed:', error);
      return "Voice message received - couldn't transcribe audio.";
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
    for (const [key, item] of this.memory.entries()) {
      if (item.expires_at && item.expires_at < now) {
        this.memory.delete(key);
      }
    }
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
        } catch {}
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
      return allKeys.filter(k => k.startsWith(`${DashAIAssistant.CONVERSATIONS_KEY}_`));
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
    try { AsyncStorage.setItem(DashAIAssistant.CURRENT_CONVERSATION_KEY, conversationId); } catch {}
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
   * Get active tasks from agentic engine
   */
  public async getActiveTasks(): Promise<any[]> {
    try {
      const { DashAgenticEngine } = await import('./DashAgenticEngine');
      const agenticEngine = DashAgenticEngine.getInstance();
      return agenticEngine.getActiveTasks();
    } catch (error) {
      console.error('[Dash] Failed to get active tasks:', error);
      return [];
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
      let systemPrompt = `You are Dash, an intelligent AI assistant. Your personality: ${this.personality.personality_traits.join(', ')}.`;
      
      if (roleSpec) {
        systemPrompt += ` You are specifically helping a ${this.userProfile?.role} with ${roleSpec.tone} tone. Your capabilities include: ${capabilities.join(', ')}.`;
      }

      // Add context awareness
      if (analysis.context) {
        systemPrompt += ` Current context: ${JSON.stringify(analysis.context)}`;
      }

      // Add intent understanding
      if (analysis.intent) {
        systemPrompt += ` User intent: ${analysis.intent.primary_intent} (confidence: ${analysis.intent.confidence})`;
      }

      // Call AI service with enhanced context
      const aiResponse = await this.callAIService({
        action: 'general_assistance',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        context: {
          role: this.userProfile?.role,
          intent: analysis.intent,
          capabilities: capabilities
        }
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
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: params
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