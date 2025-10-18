/**
 * Lazy Dash AI Assistant Accessor
 * 
 * Provides a safe, async way to access the DashAIAssistant instance.
 * Uses dynamic imports to break circular dependencies at module evaluation time.
 * 
 * ⚠️ IMPORTANT: Always use this function instead of directly calling
 * DashAIAssistant.getInstance() from other services to avoid circular deps.
 * 
 * Usage:
 * ```typescript
 * import { getAssistant } from './core/getAssistant';
 * 
 * async function myFunction() {
 *   try {
 *     const assistant = await getAssistant();
 *     await assistant.sendMessage('Hello');
 *   } catch (error) {
 *     console.error('Failed to get assistant:', error);
 *     // Handle gracefully
 *   }
 * }
 * ```
 */

import { serviceLocator } from './ServiceLocator';

/**
 * Get or initialize the DashAIAssistant instance
 * 
 * This function:
 * 1. Checks if the assistant is already registered in the ServiceLocator
 * 2. If not, dynamically imports the DashAIAssistant module
 * 3. Calls getInstance() or creates a new instance
 * 4. Registers it in the ServiceLocator for future use
 * 5. Returns the instance
 * 
 * @returns Promise<DashAIAssistant> - The assistant instance
 * @throws Error if the module fails to load
 */
export async function getAssistant(): Promise<any> {
  // Check if already registered
  const existing = serviceLocator.get('DashAIAssistant');
  if (existing) {
    return existing;
  }

  try {
    // Dynamic import to break circular dependency
    const mod = await import('../DashAIAssistant');
    
    // Get the class (could be named export or default)
    const AssistantClass = mod.DashAIAssistant || mod.default;
    
    if (!AssistantClass) {
      throw new Error('DashAIAssistant module failed to load: no export found');
    }

    // Get or create instance
    let instance: any;
    if (typeof AssistantClass.getInstance === 'function') {
      instance = AssistantClass.getInstance();
    } else {
      // Fallback to constructor if getInstance doesn't exist
      instance = new AssistantClass();
    }

    // Register for future use
    serviceLocator.register('DashAIAssistant', instance);

    console.debug('[getAssistant] Successfully loaded and registered DashAIAssistant');
    return instance;
  } catch (error) {
    console.error('[getAssistant] Failed to load DashAIAssistant:', error);
    throw new Error(`Failed to load Dash AI Assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the assistant instance without throwing if unavailable
 * Returns null instead of throwing an error
 * 
 * @returns Promise<DashAIAssistant | null>
 */
export async function getAssistantSafe(): Promise<any | null> {
  try {
    return await getAssistant();
  } catch (error) {
    console.warn('[getAssistantSafe] Assistant unavailable:', error);
    return null;
  }
}
