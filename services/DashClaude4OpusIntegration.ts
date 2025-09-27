/**
 * Dash Claude 4 Opus Integration
 * 
 * Main integration file that brings together all enhanced capabilities
 * to make Dash as smart as Claude 4 Opus
 */

import { DashEnhancedAIAssistant } from './DashEnhancedAIAssistant';
import { DashAdvancedReasoning } from './DashAdvancedReasoning';
import { DashAdvancedMemory } from './DashAdvancedMemory';
import { DashMultimodalProcessor } from './DashMultimodalProcessor';
import { DashAgenticEngine } from './DashAgenticEngine';
import { DashContextAnalyzer } from './DashContextAnalyzer';

export class DashClaude4OpusIntegration {
  private static instance: DashClaude4OpusIntegration;
  private enhancedAssistant: DashEnhancedAIAssistant;
  private isInitialized = false;

  public static getInstance(): DashClaude4OpusIntegration {
    if (!DashClaude4OpusIntegration.instance) {
      DashClaude4OpusIntegration.instance = new DashClaude4OpusIntegration();
    }
    return DashClaude4OpusIntegration.instance;
  }

  /**
   * Initialize Dash with Claude 4 Opus level intelligence
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[DashClaude4] Already initialized');
      return;
    }

    try {
      console.log('[DashClaude4] Initializing Dash with Claude 4 Opus intelligence...');
      
      // Initialize the enhanced assistant
      this.enhancedAssistant = DashEnhancedAIAssistant.getInstance();
      await this.enhancedAssistant.initialize();
      
      this.isInitialized = true;
      console.log('[DashClaude4] Dash Claude 4 Opus integration initialized successfully');
      
    } catch (error) {
      console.error('[DashClaude4] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get the enhanced assistant instance
   */
  public getEnhancedAssistant(): DashEnhancedAIAssistant {
    if (!this.isInitialized) {
      throw new Error('Dash Claude 4 Opus integration not initialized');
    }
    return this.enhancedAssistant;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.enhancedAssistant) {
      this.enhancedAssistant.cleanup();
    }
  }
}

// Export the enhanced assistant for easy access
export { DashEnhancedAIAssistant } from './DashEnhancedAIAssistant';
export { DashAdvancedReasoning } from './DashAdvancedReasoning';
export { DashAdvancedMemory } from './DashAdvancedMemory';
export { DashMultimodalProcessor } from './DashMultimodalProcessor';
export { DashAgenticEngine } from './DashAgenticEngine';
export { DashContextAnalyzer } from './DashContextAnalyzer';