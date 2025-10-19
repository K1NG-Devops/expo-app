/**
 * DashAICompat
 *
 * Backward-compatibility layer to bridge existing imports that reference the old monolith
 * `DashAIAssistant` and `IDashAIAssistant` to the new modular architecture based on DashAICore.
 *
 * This file exposes:
 * - interface IDashAIAssistant (minimal surface used across codebase)
 * - class DashAIAssistant: thin facade delegating to DashAICore
 */

import DashAICore, { type DashAICoreConfig } from './DashAICore';
import type { TranscriptionResult } from './DashVoiceService';
import type { DashMessage, DashReminder, DashTask } from './types';

export interface IDashAIAssistant {
  initialize(): Promise<void>;
  dispose(): void;
  cleanup(): void;

  // Voice
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  isCurrentlyRecording(): boolean;
  transcribeAudio(audioUri: string, userId?: string): Promise<TranscriptionResult>;
  speakText(text: string): Promise<void>;
  stopSpeaking(): Promise<void>;

  // Conversations & Messages
  startNewConversation(title?: string): Promise<string>;
  getCurrentConversationId(): string | null;
  setCurrentConversationId(id: string): void;
  getConversation(conversationId: string): Promise<any>;
  addMessageToConversation(conversationId: string, message: DashMessage): Promise<void>;
  sendMessage(content: string, conversationId?: string): Promise<DashMessage>;

  // Tasks & Reminders
  createTask(title: string, description: string, type?: DashTask['type'], assignedTo?: string): Promise<DashTask>;
  getActiveTasks(): DashTask[];
  createReminder(title: string, message: string, triggerAt: number, priority?: DashReminder['priority']): Promise<DashReminder>;
  getActiveReminders(): DashReminder[];

  // Navigation
  navigateToScreen(route: string, params?: Record<string, any>): Promise<{ success: boolean; screen?: string; error?: string }>;
  navigateByVoice(command: string): Promise<{ success: boolean; screen?: string; error?: string }>;
  openLessonGeneratorFromContext(userInput: string, aiResponse: string): void;

  // Preferences & Personality
  setLanguage(language: string): Promise<void>;
  getLanguage(): string | undefined;
  getPersonality(): any;

  // Voice response
  speakResponse(text: string): Promise<void>;

  // Convenience shim used in some legacy hooks/components
  sendPreparedVoiceMessage(input: { text?: string; audioUri?: string }): Promise<void>;
}

export class DashAIAssistant implements IDashAIAssistant {
  private core: DashAICore;

  constructor(config: DashAICoreConfig) {
    this.core = new DashAICore(config);
    DashAICore.setInstance(this.core);
  }

  async initialize(): Promise<void> { return this.core.initialize(); }
  dispose(): void { return this.core.dispose(); }
  cleanup(): void { return this.core.dispose(); } // Alias for dispose

  // Voice
  async startRecording(): Promise<void> { return this.core.startRecording(); }
  async stopRecording(): Promise<string> { return this.core.stopRecording(); }
  isCurrentlyRecording(): boolean { return this.core.isCurrentlyRecording(); }
  async transcribeAudio(audioUri: string, userId?: string): Promise<TranscriptionResult> { return this.core.transcribeAudio(audioUri, userId); }
  async speakText(text: string): Promise<void> { return this.core.speakText(text); }
  async stopSpeaking(): Promise<void> { return this.core.stopSpeaking(); }

  // Conversations
  async startNewConversation(title?: string): Promise<string> { return this.core.startNewConversation(title); }
  getCurrentConversationId(): string | null { return this.core.getCurrentConversationId(); }
  setCurrentConversationId(id: string): void { return this.core.setCurrentConversationId(id); }
  async getConversation(conversationId: string): Promise<any> { return this.core.getConversation(conversationId); }
  async addMessageToConversation(conversationId: string, message: DashMessage): Promise<void> { return this.core.addMessageToConversation(conversationId, message); }
  
  async sendMessage(content: string, conversationId?: string): Promise<DashMessage> {
    const convId = conversationId || this.getCurrentConversationId() || await this.startNewConversation();
    const userMessage: DashMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content,
      timestamp: Date.now(),
    };
    await this.addMessageToConversation(convId, userMessage);
    return userMessage;
  }

  // Tasks & Reminders
  async createTask(title: string, description: string, type?: DashTask['type'], assignedTo?: string): Promise<DashTask> {
    return this.core.createTask(title, description, type, assignedTo);
  }
  getActiveTasks(): DashTask[] { return this.core.getActiveTasks(); }
  async createReminder(title: string, message: string, triggerAt: number, priority?: DashReminder['priority']): Promise<DashReminder> {
    return this.core.createReminder(title, message, triggerAt, priority);
  }
  getActiveReminders(): DashReminder[] { return this.core.getActiveReminders(); }

  // Navigation
  async navigateToScreen(route: string, params?: Record<string, any>) { return this.core.navigateToScreen(route, params); }
  async navigateByVoice(command: string) { return this.core.navigateByVoice(command); }
  openLessonGeneratorFromContext(userInput: string, aiResponse: string): void {
    // Legacy method - now uses navigator's openLessonGenerator
    console.warn('[DashAICompat] openLessonGeneratorFromContext is deprecated');
  }

  // Preferences
  async setLanguage(language: string): Promise<void> { return this.core.setLanguage(language); }
  getLanguage(): string | undefined { return this.core.getLanguage(); }
  getPersonality(): any { return this.core.getPersonality(); }
  
  async speakResponse(text: string): Promise<void> {
    return this.core.speakText(text);
  }

  // Convenience shim
  async sendPreparedVoiceMessage(input: { text?: string; audioUri?: string }): Promise<void> {
    if (input.audioUri) {
      const result = await this.core.transcribeAudio(input.audioUri);
      if (result?.text) await this.core.speakText(result.text);
      return;
    }
    if (input.text) {
      await this.core.speakText(input.text);
      return;
    }
  }
}

export default DashAIAssistant;
