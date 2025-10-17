// Dependency Injection Types and Tokens

export type Token<T> = symbol & { __type?: T };

export const TOKENS = {
  auth: Symbol.for('AuthService') as Token<AuthService>,
  storage: Symbol.for('StorageService') as Token<StorageService>,
  organization: Symbol.for('OrganizationService') as Token<OrganizationService>,
  ai: Symbol.for('AIService') as Token<AIService>,
  features: Symbol.for('FeatureFlagService') as Token<FeatureFlagService>,
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
  mapTerm(term: string, type: string): string;
  getGreeting(type: string, role: string, userName?: string): string;
}

export interface AIService {
  ask(prompt: string, context?: Record<string, unknown>): Promise<string>;
}

export interface FeatureFlagService {
  isEnabled(flag: string): boolean;
}
