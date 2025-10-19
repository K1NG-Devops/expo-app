/**
 * DashConversationManager
 * 
 * Manages conversation history, message persistence, and context windows:
 * - Create/read/update/delete conversations
 * - Add messages to conversations
 * - Build context windows for AI prompts
 * - Export conversation history
 * - Conversation summaries and tagging
 * 
 * Design principles:
 * - Persistent storage via AsyncStorage
 * - Efficient in-memory caching
 * - Context window management (avoid token limits)
 * - Message deduplication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashConversation, DashMessage } from './types';

/**
 * Conversation manager configuration
 */
export interface ConversationManagerConfig {
  /** Storage key prefix for conversations */
  conversationsKey?: string;
  /** Storage key for current conversation pointer */
  currentConversationKey?: string;
  /** Maximum messages to keep in context window */
  maxContextMessages?: number;
}

/**
 * DashConversationManager
 * Handles all conversation and message history operations
 */
export class DashConversationManager {
  private config: ConversationManagerConfig;
  private currentConversationId: string | null = null;

  constructor(config: ConversationManagerConfig = {}) {
    this.config = {
      conversationsKey: config.conversationsKey || 'dash_conversations',
      currentConversationKey:
        config.currentConversationKey || '@dash_ai_current_conversation_id',
      maxContextMessages: config.maxContextMessages || 10,
    };
  }

  /**
   * Initialize and load current conversation pointer
   */
  public async initialize(): Promise<void> {
    try {
      const storedId = await AsyncStorage.getItem(
        this.config.currentConversationKey!
      );
      if (storedId) {
        this.currentConversationId = storedId;
        console.log(`[DashConversation] Resumed conversation: ${storedId}`);
      }
    } catch (error) {
      console.error('[DashConversation] Initialization failed:', error);
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
      updated_at: Date.now(),
    };

    await this.saveConversation(conversation);
    try {
      await AsyncStorage.setItem(
        this.config.currentConversationKey!,
        conversationId
      );
    } catch {}
    
    console.log(`[DashConversation] Started new conversation: ${conversationId}`);
    return conversationId;
  }

  /**
   * Get conversation by ID
   */
  public async getConversation(
    conversationId: string
  ): Promise<DashConversation | null> {
    try {
      const key = `${this.config.conversationsKey}_${conversationId}`;
      const conversationData = await AsyncStorage.getItem(key);
      return conversationData ? JSON.parse(conversationData) : null;
    } catch (error) {
      console.error('[DashConversation] Failed to get conversation:', error);
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
            // Validate structure
            if (!Array.isArray(parsed.messages)) parsed.messages = [];
            if (typeof parsed.title !== 'string') parsed.title = 'Conversation';
            if (typeof parsed.created_at !== 'number')
              parsed.created_at = Date.now();
            if (typeof parsed.updated_at !== 'number')
              parsed.updated_at = parsed.created_at;
            conversations.push(parsed as DashConversation);
          } catch (e) {
            console.warn(
              '[DashConversation] Skipping invalid conversation entry for key:',
              key,
              e
            );
          }
        }
      }
      
      return conversations.sort((a, b) => b.updated_at - a.updated_at);
    } catch (error) {
      console.error('[DashConversation] Failed to get conversations:', error);
      return [];
    }
  }

  /**
   * Save conversation
   */
  private async saveConversation(
    conversation: DashConversation
  ): Promise<void> {
    try {
      const key = `${this.config.conversationsKey}_${conversation.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(conversation));
    } catch (error) {
      console.error('[DashConversation] Failed to save conversation:', error);
    }
  }

  /**
   * Add message to conversation
   */
  public async addMessageToConversation(
    conversationId: string,
    message: DashMessage
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        // Check for duplicate messages (by ID)
        const exists = conversation.messages.some((m) => m.id === message.id);
        if (!exists) {
          conversation.messages.push(message);
          conversation.updated_at = Date.now();
          await this.saveConversation(conversation);
          
          // Update current conversation pointer
          try {
            await AsyncStorage.setItem(
              this.config.currentConversationKey!,
              conversationId
            );
          } catch {}
        }
      }
    } catch (error) {
      console.error(
        '[DashConversation] Failed to add message to conversation:',
        error
      );
    }
  }

  /**
   * Build context window from conversation (most recent N messages)
   */
  public async buildContextWindow(
    conversationId: string,
    maxMessages?: number
  ): Promise<DashMessage[]> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation || !conversation.messages.length) {
        return [];
      }

      const limit = maxMessages || this.config.maxContextMessages || 10;
      return conversation.messages.slice(-limit);
    } catch (error) {
      console.error('[DashConversation] Failed to build context window:', error);
      return [];
    }
  }

  /**
   * Get conversation keys from storage
   */
  private async getConversationKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter((k: string) =>
        k.startsWith(`${this.config.conversationsKey}_`)
      );
    } catch (error) {
      console.error('[DashConversation] Failed to list conversation keys:', error);
      return [];
    }
  }

  /**
   * Delete conversation
   */
  public async deleteConversation(conversationId: string): Promise<void> {
    try {
      const key = `${this.config.conversationsKey}_${conversationId}`;
      await AsyncStorage.removeItem(key);
      
      // If deleting the current conversation, clear current pointer
      const currentId = await AsyncStorage.getItem(
        this.config.currentConversationKey!
      );
      if (currentId === conversationId) {
        await AsyncStorage.removeItem(this.config.currentConversationKey!);
        this.currentConversationId = null;
      }
      
      console.log(`[DashConversation] Deleted conversation: ${conversationId}`);
    } catch (error) {
      console.error('[DashConversation] Failed to delete conversation:', error);
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
    try {
      AsyncStorage.setItem(this.config.currentConversationKey!, conversationId);
    } catch {}
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
      console.error('[DashConversation] Failed to export conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  public async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        conversation.title = title;
        conversation.updated_at = Date.now();
        await this.saveConversation(conversation);
      }
    } catch (error) {
      console.error(
        '[DashConversation] Failed to update conversation title:',
        error
      );
    }
  }

  /**
   * Generate conversation summary
   */
  public async generateConversationSummary(
    conversationId: string
  ): Promise<string> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation || conversation.messages.length === 0) {
        return 'Empty conversation';
      }

      // Simple summary: first user message + message count
      const firstUserMsg = conversation.messages.find((m) => m.type === 'user');
      const userMsgCount = conversation.messages.filter(
        (m) => m.type === 'user'
      ).length;
      const assistantMsgCount = conversation.messages.filter(
        (m) => m.type === 'assistant'
      ).length;

      const summary = firstUserMsg
        ? `"${firstUserMsg.content.slice(0, 60)}..." (${userMsgCount} messages)`
        : `${userMsgCount + assistantMsgCount} messages`;

      return summary;
    } catch (error) {
      console.error(
        '[DashConversation] Failed to generate summary:',
        error
      );
      return 'Conversation summary unavailable';
    }
  }

  /**
   * Trim conversation to keep only recent messages (storage optimization)
   */
  public async trimConversation(
    conversationId: string,
    maxMessages: number
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation && conversation.messages.length > maxMessages) {
        conversation.messages = conversation.messages.slice(-maxMessages);
        conversation.updated_at = Date.now();
        await this.saveConversation(conversation);
        console.log(
          `[DashConversation] Trimmed conversation to ${maxMessages} messages`
        );
      }
    } catch (error) {
      console.error('[DashConversation] Failed to trim conversation:', error);
    }
  }

  /**
   * Dispose and clean up resources
   */
  public dispose(): void {
    console.log('[DashConversation] Disposing DashConversationManager...');
    this.currentConversationId = null;
    console.log('[DashConversation] Disposal complete');
  }
}

export default DashConversationManager;
