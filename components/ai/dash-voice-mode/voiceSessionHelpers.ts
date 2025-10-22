/**
 * Voice Session Helpers
 * 
 * Shared types, utilities, and state management helpers for voice session.
 */

import type { LanguageProfile } from '@/lib/voice/language';

// ==================== SESSION STATES ====================

export type VoiceSessionStatus = 
  | 'idle' 
  | 'listening' 
  | 'transcribing' 
  | 'thinking' 
  | 'speaking' 
  | 'error';

// ==================== SENTENCE SPLITTING ====================

/**
 * Split text into sentences for progressive TTS
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  
  // Split on sentence boundaries
  const sentences = text
    .split(/([.!?…]+[\s\n]+)/)
    .filter(s => s.trim().length > 0);
  
  // Merge split parts back together
  const merged: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    if (sentence.trim().length > 0) {
      merged.push(sentence.trim());
    }
  }
  
  return merged;
}

/**
 * Check if text chunk is complete enough to speak
 * (ends with punctuation or is long enough)
 */
export function isChunkSpeakable(text: string, minLength: number = 220): boolean {
  if (!text) return false;
  
  const trimmed = text.trim();
  
  // Check for sentence ending
  if (/[.!?…][\s]*$/.test(trimmed)) {
    return trimmed.length >= 30; // At least 30 chars for a sentence
  }
  
  // Check length threshold
  return trimmed.length >= minLength;
}

// ==================== TEXT NORMALIZATION ====================

/**
 * Normalize text for TTS (remove markdown, emojis, etc.)
 */
export function normalizeTextForSpeech(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove emojis (basic)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if text is raw streaming JSON (should not be spoken)
 */
export function isRawStreamingJSON(text: string): boolean {
  if (!text) return false;
  
  return (
    text.includes('"content_block_delta"') ||
    text.includes('"type":"') ||
    text.startsWith('data:') ||
    text.includes('{"delta":')
  );
}

// ==================== DEBOUNCING ====================

/**
 * Simple debounce utility
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ==================== AI PROMPT GENERATION ====================

/**
 * Generate AI system prompt with language instruction
 */
export function generateLanguagePrompt(profile: LanguageProfile): string {
  const langNames: Record<string, string> = {
    'en-ZA': 'English',
    'af-ZA': 'Afrikaans',
    'zu-ZA': 'isiZulu',
    'xh-ZA': 'isiXhosa',
    'nso-ZA': 'Sepedi',
  };
  
  const langName = langNames[profile.bcp47] || 'English';
  
  return `You are Dash, an AI assistant for educators. Respond in ${langName} (${profile.bcp47}) unless the user explicitly requests a different language. Keep responses concise and clear for voice interaction.`;
}

// ==================== ERROR FORMATTING ====================

/**
 * Format error for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
