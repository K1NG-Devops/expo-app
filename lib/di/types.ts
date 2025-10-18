// Dependency Injection Types and Tokens

export type Token<T> = symbol & { __type?: T };

export const TOKENS = {
  auth: Symbol.for('AuthService') as Token<AuthService>,
  storage: Symbol.for('StorageService') as Token<StorageService>,
  organization: Symbol.for('OrganizationService') as Token<OrganizationService>,
  ai: Symbol.for('AIService') as Token<AIService>,
  features: Symbol.for('FeatureFlagService') as Token<FeatureFlagService>,
  eventBus: Symbol.for('EventBus') as Token<EventBus>,
  memory: Symbol.for('MemoryService') as Token<MemoryService>,
  lessons: Symbol.for('LessonsService') as Token<LessonsService>,
  sms: Symbol.for('SMSService') as Token<SMSService>,
  googleCalendar: Symbol.for('GoogleCalendarService') as Token<GoogleCalendarService>,
  dashTaskAutomation: Symbol.for('DashTaskAutomation') as Token<DashTaskAutomation>,
  dashDecisionEngine: Symbol.for('DashDecisionEngine') as Token<DashDecisionEngine>,
  dashNavigation: Symbol.for('DashNavigation') as Token<DashNavigation>,
  dashWebSearch: Symbol.for('DashWebSearch') as Token<DashWebSearch>,
};

// Minimal interfaces to start wiring gradually
export interface AuthService {
  getCurrentUser(): Promise<unknown | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface StorageService {
  getItem<T = string>(key: string): Promise<T | null>;
  setItem<T = string>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface OrganizationService {
  getDisplayName(type: string): string;
  mapTerm(term: keyof import('../types/organization').TerminologyMap, type: string): string;
  getGreeting(type: string, role: string, userName?: string): string;
  getCapabilities(type: string, role: string): string[];
}

export interface AIService {
  ask(prompt: string, context?: Record<string, unknown>): Promise<string>;
}

export interface FeatureFlagService {
  isEnabled(flag: string): boolean;
}

export interface EventBus {
  subscribe(event: string, handler: (data: any) => void | Promise<void>): () => void;
  publish(event: string, data?: any): Promise<void>;
  dispose(): void;
}

export interface MemoryService {
  initialize(): Promise<void>;
  upsertMemory(input: any): Promise<any | null>;
  retrieveRelevant(query: string, topK?: number, minSimilarity?: number): Promise<any[]>;
  snapshotContext(context: any): Promise<void>;
  recordAccess(memoryId: string): Promise<void>;
  getCachedMemories(): any[];
  dispose(): void;
}

export interface LessonsService {
  getCategories(): Promise<any[]>;
  getSkillLevels(): Promise<any[]>;
  getTags(): Promise<any[]>;
  searchLessons(query?: string, filters?: any, sortBy?: any, page?: number, pageSize?: number): Promise<any>;
  getLessonById(lessonId: string): Promise<any | null>;
  getUserLessonProgress(lessonId: string): Promise<any | null>;
  updateLessonProgress(lessonId: string, updates: any): Promise<any | null>;
  toggleLessonBookmark(lessonId: string): Promise<boolean>;
  getFeaturedLessons(limit?: number): Promise<any[]>;
  getPopularLessons(limit?: number): Promise<any[]>;
  getTeacherGeneratedLessons(): Promise<any[]>;
  dispose(): void;
}

export interface SMSService {
  sendSMS(message: any, options?: { validateOptOut?: boolean }): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendBulkSMS(options: any): Promise<{ success: boolean; result?: any; error?: string }>;
  getDeliveryStatus(messageId: string): Promise<any | null>;
  updateDeliveryStatus(twilioPayload: any): Promise<void>;
  dispose(): void;
}

export interface GoogleCalendarService {
  initiateOAuthFlow(userId: string, preschoolId: string): Promise<string>;
  completeOAuthFlow(userId: string, authorizationCode: string, state: string): Promise<{ success: boolean; error?: string }>;
  disconnectAccount(userId: string): Promise<{ success: boolean; error?: string }>;
  isConnected(userId: string): Promise<boolean>;
  dispose(): void;
}

export interface DashTaskAutomation {
  createTask(templateId?: string, customParams?: any, userRole?: string): Promise<any>;
  executeTask(taskId: string, userInput?: any): Promise<void>;
  getActiveTask(): any | undefined;
  getTaskTemplates(userRole?: string): any[];
  getTask(taskId: string): any | undefined;
  getActiveTasks(): any[];
  cancelTask(taskId: string): { success: boolean; error?: string };
  dispose(): void;
}

export interface DashDecisionEngine {
  decide(candidate: any, context: any): Promise<any>;
  getDecisionHistory(): any[];
  getRecentDecisions(limit?: number): any[];
  getDecisionStats(): any;
  dispose(): void;
}

export interface DashNavigation {
  navigateByVoice(command: string): Promise<any>;
  navigateToScreen(screenKey: string, params?: Record<string, any>): Promise<any>;
  getCurrentScreen(): string | null;
  goBack(): any;
  clearHistory(): Promise<void>;
  dispose(): void;
}

export interface DashWebSearch {
  search(query: string, options?: any): Promise<any>;
  dispose(): void;
}
