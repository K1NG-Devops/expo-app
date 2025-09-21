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
  type: 'user' | 'assistant';
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
      type: 'lesson' | 'student' | 'assignment' | 'resource';
      id: string;
      title: string;
    }>;
  };
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
  type: 'preference' | 'fact' | 'context' | 'skill';
  key: string;
  value: any;
  confidence: number;
  created_at: number;
  updated_at: number;
  expires_at?: number;
}

export interface DashPersonality {
  name: string;
  greeting: string;
  personality_traits: string[];
  response_style: 'formal' | 'casual' | 'encouraging' | 'professional';
  expertise_areas: string[];
  voice_settings: {
    rate: number;
    pitch: number;
    language: string;
    voice?: string;
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
    'supportive'
  ],
  response_style: 'encouraging',
  expertise_areas: [
    'education',
    'lesson planning',
    'student assessment',
    'classroom management',
    'curriculum development',
    'educational technology',
    'parent communication'
  ],
  voice_settings: {
    rate: 0.8,
    pitch: 1.0,
    language: 'en-US'
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
  
  // Storage keys
  private static readonly CONVERSATIONS_KEY = 'dash_conversations';
  private static readonly MEMORY_KEY = 'dash_memory';
  private static readonly PERSONALITY_KEY = 'dash_personality';
  private static readonly SETTINGS_KEY = 'dash_settings';

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
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
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
      await this.recordingObject.prepareAsync({
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
      const response = await this.callAIService(context);
      
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
          references: response.references || []
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
   * Call AI service to generate response
   */
  private async callAIService(context: any): Promise<{
    content: string;
    confidence?: number;
    suggested_actions?: string[];
    references?: Array<{
      type: 'lesson' | 'student' | 'assignment' | 'resource';
      id: string;
      title: string;
    }>;
  }> {
    // This would integrate with your existing AI services
    // For now, return a smart contextual response
    
    const userInput = context.userInput.toLowerCase();
    
    // Simple pattern matching for educational contexts
    if (userInput.includes('lesson') || userInput.includes('teach')) {
      return {
        content: `I can help you create engaging lessons! Based on your teaching profile, I suggest focusing on interactive activities that match your students' learning styles. Would you like me to help you plan a specific lesson?`,
        confidence: 0.85,
        suggested_actions: ['create_lesson', 'view_lesson_templates', 'student_assessment'],
        references: []
      };
    }
    
    if (userInput.includes('student') || userInput.includes('assess')) {
      return {
        content: `Student assessment is crucial for effective teaching. I can help you create assessments, track progress, or analyze student performance data. What specific aspect would you like to focus on?`,
        confidence: 0.8,
        suggested_actions: ['create_assessment', 'view_analytics', 'student_reports'],
        references: []
      };
    }
    
    if (userInput.includes('parent') || userInput.includes('communication')) {
      return {
        content: `Effective parent communication builds strong educational partnerships. I can help you craft messages, schedule meetings, or prepare progress reports. How would you like to improve parent engagement?`,
        confidence: 0.8,
        suggested_actions: ['draft_message', 'schedule_meeting', 'progress_report'],
        references: []
      };
    }

    // Default encouraging response
    return {
      content: `I'm here to support your educational journey! Whether you need help with lesson planning, student assessment, parent communication, or administrative tasks, I'm ready to assist. What would you like to work on together?`,
      confidence: 0.7,
      suggested_actions: ['explore_features', 'lesson_planning', 'student_management'],
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
      const storage = SecureStore || AsyncStorage;
      const conversationData = await storage.getItem(`${DashAIAssistant.CONVERSATIONS_KEY}_${conversationId}`);
      
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
      const storage = SecureStore || AsyncStorage;
      const conversationKeys = await this.getConversationKeys();
      const conversations: DashConversation[] = [];
      
      for (const key of conversationKeys) {
        const conversationData = await storage.getItem(key);
        if (conversationData) {
          conversations.push(JSON.parse(conversationData));
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
      const storage = SecureStore || AsyncStorage;
      await storage.setItem(
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
      }
    } catch (error) {
      console.error('[Dash] Failed to add message to conversation:', error);
    }
  }

  /**
   * Get conversation keys from storage
   */
  private async getConversationKeys(): Promise<string[]> {
    // This would need to be implemented based on your storage solution
    // For now, return empty array
    return [];
  }

  /**
   * Delete conversation
   */
  public async deleteConversation(conversationId: string): Promise<void> {
    try {
      const storage = SecureStore || AsyncStorage;
      await storage.removeItem(`${DashAIAssistant.CONVERSATIONS_KEY}_${conversationId}`);
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
}

export default DashAIAssistant;