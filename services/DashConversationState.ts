/**
 * DashConversationState Service
 * 
 * Manages conversation state to prevent repetitive greetings and maintain context.
 * Ensures Dash behaves naturally by remembering what has been said in the conversation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConversationSession {
  sessionId: string;
  userId: string;
  userName?: string;
  startTime: number;
  lastInteractionTime: number;
  hasGreeted: boolean;
  topicsDiscussed: string[];
  actionsPerformed: string[];
  userPreferences: {
    formalityLevel?: 'casual' | 'professional';
    preferredLanguage?: string;
    preferredName?: string;
  };
}

const STORAGE_KEY_SESSION = '@dash_conversation_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export class DashConversationState {
  private static currentSession: ConversationSession | null = null;

  /**
   * Initialize or resume a conversation session
   */
  static async initializeSession(
    userId: string,
    profile?: { full_name?: string; first_name?: string; role?: string }
  ): Promise<void> {
    // Try to load existing session
    const sessionJson = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
    
    if (sessionJson) {
      const savedSession: ConversationSession = JSON.parse(sessionJson);
      
      // Check if session is still valid (not timed out)
      const timeSinceLastInteraction = Date.now() - savedSession.lastInteractionTime;
      
      if (
        savedSession.userId === userId && 
        timeSinceLastInteraction < SESSION_TIMEOUT
      ) {
        // Resume existing session
        this.currentSession = {
          ...savedSession,
          lastInteractionTime: Date.now()
        };
        await this.persistSession();
        return;
      }
    }

    // Create new session
    const userName = this.extractFirstName(profile);
    
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      userName,
      startTime: Date.now(),
      lastInteractionTime: Date.now(),
      hasGreeted: false,
      topicsDiscussed: [],
      actionsPerformed: [],
      userPreferences: {}
    };

    await this.persistSession();
  }

  /**
   * Extract first name from profile
   */
  private static extractFirstName(profile?: { 
    full_name?: string; 
    first_name?: string; 
  }): string | undefined {
    if (profile?.first_name) {
      return profile.first_name;
    }
    
    if (profile?.full_name) {
      // Extract first name from full name
      const parts = profile.full_name.trim().split(/\s+/);
      return parts[0];
    }
    
    return undefined;
  }

  /**
   * Mark that Dash has greeted the user
   */
  static async markGreeted(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.hasGreeted = true;
      this.currentSession.lastInteractionTime = Date.now();
      await this.persistSession();
    }
  }

  /**
   * Check if Dash should greet the user
   */
  static shouldGreet(): boolean {
    if (!this.currentSession) {
      return true; // Default to greeting if no session
    }
    
    return !this.currentSession.hasGreeted;
  }

  /**
   * Get the user's preferred name for address
   */
  static getUserName(): string | undefined {
    return this.currentSession?.userPreferences.preferredName || 
           this.currentSession?.userName;
  }

  /**
   * Record a topic that was discussed
   */
  static async recordTopic(topic: string): Promise<void> {
    if (this.currentSession && !this.currentSession.topicsDiscussed.includes(topic)) {
      this.currentSession.topicsDiscussed.push(topic);
      this.currentSession.lastInteractionTime = Date.now();
      await this.persistSession();
    }
  }

  /**
   * Check if a topic has been discussed
   */
  static hasDiscussedTopic(topic: string): boolean {
    return this.currentSession?.topicsDiscussed.includes(topic) || false;
  }

  /**
   * Record an action that was performed
   */
  static async recordAction(action: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.actionsPerformed.push(action);
      this.currentSession.lastInteractionTime = Date.now();
      
      // Keep only last 20 actions
      if (this.currentSession.actionsPerformed.length > 20) {
        this.currentSession.actionsPerformed = 
          this.currentSession.actionsPerformed.slice(-20);
      }
      
      await this.persistSession();
    }
  }

  /**
   * Get recent actions
   */
  static getRecentActions(limit: number = 5): string[] {
    if (!this.currentSession) return [];
    return this.currentSession.actionsPerformed.slice(-limit);
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: {
    formalityLevel?: 'casual' | 'professional';
    preferredLanguage?: string;
    preferredName?: string;
  }): Promise<void> {
    if (this.currentSession) {
      this.currentSession.userPreferences = {
        ...this.currentSession.userPreferences,
        ...preferences
      };
      await this.persistSession();
    }
  }

  /**
   * Get user preferences
   */
  static getPreferences() {
    return this.currentSession?.userPreferences || {};
  }

  /**
   * Update last interaction time
   */
  static async touchSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.lastInteractionTime = Date.now();
      await this.persistSession();
    }
  }

  /**
   * Get conversation context for prompt injection
   */
  static getConversationContext(): string {
    if (!this.currentSession) {
      return '';
    }

    const userName = this.getUserName();
    const recentActions = this.getRecentActions(3);
    const recentTopics = this.currentSession.topicsDiscussed.slice(-3);

    let context = '\n## CONVERSATION CONTEXT\n\n';

    // User info
    if (userName) {
      context += `**User's Name:** ${userName}\n`;
      context += `**Note:** Address the user by their first name naturally in conversation.\n\n`;
    }

    // Greeting status
    if (this.currentSession.hasGreeted) {
      context += `**Greeting:** You have already greeted the user in this session. DO NOT greet again.\n\n`;
    } else {
      context += `**Greeting:** This is the start of the conversation. Greet the user warmly${userName ? ` using their name (${userName})` : ''}.\n\n`;
    }

    // Recent context
    if (recentTopics.length > 0) {
      context += `**Topics Discussed:** ${recentTopics.join(', ')}\n`;
    }

    if (recentActions.length > 0) {
      context += `**Recent Actions:** ${recentActions.join(', ')}\n`;
    }

    // Conversation guidelines
    context += `\n**Conversation Guidelines:**\n`;
    context += `- Be natural and context-aware\n`;
    context += `- Don't repeat information unnecessarily\n`;
    context += `- Reference previous context when relevant\n`;
    context += `- Use a friendly, helpful tone (Dash is male AI assistant)\n`;

    return context;
  }

  /**
   * Build system prompt additions for language and voice
   */
  static getLanguageAndVoiceContext(language?: string): string {
    const lang = language || this.currentSession?.userPreferences.preferredLanguage || 'en';

    let context = '\n## VOICE & LANGUAGE SETTINGS\n\n';
    
    context += `**Dash's Voice:** Male voice (you are Dash, a male AI assistant)\n`;
    context += `**Current Language:** ${this.getLanguageName(lang)}\n`;
    context += `**Pronunciation:** Use proper accent and pronunciation for ${this.getLanguageName(lang)}\n\n`;

    // Punctuation awareness
    context += `**CRITICAL - Punctuation Awareness:**\n`;
    context += `- "minus" or "negative" = mathematical subtraction (e.g., "5 minus 3" or "-5")\n`;
    context += `- "dash" or "hyphen" = the punctuation mark "-" (e.g., "2023-01-15" or "first-name")\n`;
    context += `- ALWAYS clarify when user says "minus" vs "dash"\n`;
    context += `- Example: "5 minus 3" NOT "5 dash 3"\n`;
    context += `- Example: "2023 dash 01 dash 15" for dates, NOT "2023 minus 01 minus 15"\n\n`;

    // Language-specific guidance
    switch (lang) {
      case 'af':
        context += `**Afrikaans Guidance:**\n`;
        context += `- Use proper Afrikaans pronunciation\n`;
        context += `- Common phrases: "Hallo", "Dankie", "Asseblief"\n`;
        context += `- Roll R's naturally, use guttural sounds appropriately\n`;
        break;
      case 'zu':
        context += `**isiZulu Guidance:**\n`;
        context += `- Use proper Zulu pronunciation and clicks\n`;
        context += `- Common phrases: "Sawubona", "Ngiyabonga", "Uxolo"\n`;
        context += `- Respect tonal variations\n`;
        break;
      case 'xh':
        context += `**isiXhosa Guidance:**\n`;
        context += `- Use proper Xhosa pronunciation with clicks\n`;
        context += `- Common phrases: "Molo", "Enkosi", "Uxolo"\n`;
        context += `- Master the three click sounds (c, q, x)\n`;
        break;
      default:
        context += `**English (South African) Guidance:**\n`;
        context += `- Use neutral, clear pronunciation\n`;
        context += `- Avoid overly formal or robotic speech\n`;
        context += `- Be warm and approachable\n`;
    }

    return context;
  }

  /**
   * Get language name from code
   */
  private static getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      en: 'English',
      af: 'Afrikaans',
      zu: 'isiZulu',
      xh: 'isiXhosa',
      st: 'Sesotho'
    };
    return languages[code] || 'English';
  }

  /**
   * End the current session
   */
  static async endSession(): Promise<void> {
    this.currentSession = null;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Persist session to storage
   */
  private static async persistSession(): Promise<void> {
    if (this.currentSession) {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY_SESSION, 
          JSON.stringify(this.currentSession)
        );
      } catch (error) {
        console.error('Failed to persist conversation session:', error);
      }
    }
  }

  /**
   * Get session statistics
   */
  static getSessionStats() {
    if (!this.currentSession) {
      return null;
    }

    const sessionDuration = Date.now() - this.currentSession.startTime;
    const minutesActive = Math.floor(sessionDuration / 60000);

    return {
      sessionId: this.currentSession.sessionId,
      duration: minutesActive,
      topicsCount: this.currentSession.topicsDiscussed.length,
      actionsCount: this.currentSession.actionsPerformed.length,
      hasGreeted: this.currentSession.hasGreeted
    };
  }
}
