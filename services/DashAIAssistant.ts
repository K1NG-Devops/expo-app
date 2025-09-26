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
   * Extract lesson parameters from user input and AI response
   */
  private extractLessonParameters(userInput: string, aiResponse: string): Record<string, string> {
    const params: Record<string, string> = {};
    const fullText = `${userInput} ${aiResponse}`.toLowerCase();
    
    // Extract grade level
    const gradeMatch = fullText.match(/grade\s*(\d{1,2})|year\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)?\s*grade/i);
    if (gradeMatch) {
      const grade = gradeMatch[1] || gradeMatch[2] || gradeMatch[3];
      if (grade && parseInt(grade) >= 1 && parseInt(grade) <= 12) {
        params.gradeLevel = grade;
      }
    }
    
    // Extract subject with expanded matching
    const subjectPatterns = {
      'Mathematics': /(math|mathematics|maths|arithmetic|algebra|geometry|calculus)/i,
      'Science': /(science|biology|chemistry|physics|life\s*science)/i,
      'English': /(english|language\s*arts?|reading|writing|literature)/i,
      'Afrikaans': /(afrikaans)/i,
      'Life Skills': /(life\s*skills?)/i,
      'Geography': /(geography|social\s*studies)/i,
      'History': /(history)/i,
      'Art': /(art|creative|drawing|painting)/i,
      'Music': /(music|singing)/i,
      'Physical Education': /(physical\s*education|pe|sports?|fitness)/i
    };
    
    for (const [subject, pattern] of Object.entries(subjectPatterns)) {
      if (pattern.test(fullText)) {
        params.subject = subject;
        break;
      }
    }
    
    // Extract topic/theme
    // Look for topics after keywords like "about", "on", "teaching", etc.
    const topicMatch = fullText.match(/(?:about|on|teaching|topic|theme)\s+([^.,;!?]+?)(?:\s+(?:for|to|with)|[.,;!?]|$)/i);
    if (topicMatch && topicMatch[1]) {
      const topic = topicMatch[1].trim();
      if (topic.length > 2 && topic.length < 50) {
        params.topic = topic;
      }
    }
    
    // Extract duration
    const durationMatch = fullText.match(/(\d{1,3})\s*(?:minute|min|hour|hr)s?/i);
    if (durationMatch) {
      let duration = parseInt(durationMatch[1]);
      // Convert hours to minutes
      if (fullText.includes('hour') || fullText.includes('hr')) {
        duration *= 60;
      }
      // Reasonable duration range (15-180 minutes)
      if (duration >= 15 && duration <= 180) {
        params.duration = duration.toString();
      }
    }
    
    // Extract learning objectives
    const objectiveKeywords = ['objective', 'goal', 'aim', 'learn', 'understand', 'master'];
    const objectivePattern = new RegExp(`(?:${objectiveKeywords.join('|')})s?[^.]*?([^.;]+)`, 'gi');
    const objectiveMatches = fullText.match(objectivePattern);
    if (objectiveMatches && objectiveMatches.length > 0) {
      const objectives = objectiveMatches.map(match => 
        match.replace(/^[^:]*:?\s*/, '').trim()
      ).filter(obj => obj.length > 5 && obj.length < 100);
      
      if (objectives.length > 0) {
        params.objectives = objectives.slice(0, 3).join('; ');
      }
    }
    
    // If we have enough parameters, add autogenerate flag
    const paramCount = Object.keys(params).length;
    if (paramCount >= 2) {
      params.autogenerate = 'true';
    }
    
    console.log('[Dash] Extracted lesson parameters:', params);
    return params;
  }
  
  /**
   * Clean text for speech synthesis by removing emojis and other non-speech elements
   */
  private cleanTextForSpeech(text: string): string {
    return text
      // Remove emojis (Unicode ranges)
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional country flags
      .replace(/[\u{2600}-\u{26FF}]/gu, '')  // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')  // Dingbats
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
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
      
      // Clean the text before speaking to remove emojis
      const cleanText = this.cleanTextForSpeech(message.content);
      
      // Only speak if there's actual text content after cleaning
      if (cleanText.length === 0) {
        console.log('[Dash] No speakable content after emoji filtering');
        return;
      }
      
      await Speech.speak(cleanText, {
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
      } catch {}

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
        question: context.userInput,
        context: `User is a ${this.userProfile?.role || 'educator'} seeking assistance. ${systemPrompt}`,
        gradeLevel: 'General',
        conversationHistory: context.conversationHistory
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