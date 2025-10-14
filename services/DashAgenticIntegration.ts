/**
 * DashAgenticIntegration
 * 
 * Integration layer that wires all agentic services into the Dash AI Assistant.
 * This provides a unified API for enhanced capabilities.
 */

import { DashEduDashKnowledge } from './DashEduDashKnowledge';
import { DashConversationState } from './DashConversationState';
import { DashCapabilityDiscovery } from './DashCapabilityDiscovery';
import { DashAutonomyManager } from './DashAutonomyManager';
import { DashTelemetry } from './DashTelemetry';
import DashRealTimeAwareness from './DashRealTimeAwareness';

export interface AgenticContext {
  userId: string;
  profile?: any;
  tier: string;
  role: string;
  currentScreen?: string;
  language?: string;
}

export class DashAgenticIntegration {
  private static initialized = false;
  
  /**
   * Initialize all agentic services
   */
  static async initialize(context: AgenticContext): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize conversation state
      await DashConversationState.initializeSession(
        context.userId,
        context.profile
      );
      
      // Initialize autonomy manager
      await DashAutonomyManager.initialize();
      
      // Initialize telemetry
      await DashTelemetry.initialize();
      
      this.initialized = true;
      console.log('[DashAgenticIntegration] All services initialized');
    } catch (error) {
      console.error('[DashAgenticIntegration] Initialization failed:', error);
      // Continue gracefully - services will use defaults
    }
  }
  
  /**
   * Build enhanced system prompt with all agentic context
   * Integrates with existing DashRealTimeAwareness
   */
  static async buildEnhancedSystemPrompt(
    awareness: any,
    context: AgenticContext
  ): Promise<string> {
    // Start with real-time awareness prompt
    let prompt = DashRealTimeAwareness.buildAwareSystemPrompt(awareness);
    
    // Get conversation context
    const conversationContext = DashConversationState.getConversationContext();
    
    // Get language and voice context
    const languageContext = DashConversationState.getLanguageAndVoiceContext(
      context.language || context.profile?.preferred_language
    );
    
    // Build platform knowledge context
    const platformContext = DashEduDashKnowledge.buildPromptContext(
      context.profile,
      awareness,
      context.tier,
      conversationContext,
      languageContext
    );
    
    // Combine all contexts
    prompt += '\n\n' + platformContext;
    
    // Add capability summary
    const capabilitySummary = DashCapabilityDiscovery.getCapabilitySummary(
      context.role,
      context.tier
    );
    prompt += '\n\n' + capabilitySummary;
    
    // Add autonomy guidelines
    const autonomySettings = await DashAutonomyManager.getSettings();
    prompt += '\n\n## AUTONOMY SETTINGS\n\n';
    prompt += `**Mode:** ${autonomySettings.mode} (${autonomySettings.mode === 'assistant' ? 'cautious, asks approval' : 'more autonomous'})\n`;
    prompt += `**Auto-execute Low Risk:** ${autonomySettings.autoExecuteLowRisk ? 'YES' : 'NO'}\n`;
    prompt += `**Auto-execute Medium Risk:** ${autonomySettings.autoExecuteMediumRisk ? 'YES' : 'NO'}\n`;
    
    return prompt;
  }
  
  /**
   * Handle post-response actions
   * Called after Dash generates a response
   */
  static async handlePostResponse(
    success: boolean,
    responseTime: number,
    context: {
      intent?: string;
      featureUsed?: string;
      action?: any;
    }
  ): Promise<void> {
    // Mark as greeted if this was first interaction
    if (DashConversationState.shouldGreet()) {
      await DashConversationState.markGreeted();
    }
    
    // Update session activity
    await DashConversationState.touchSession();
    
    // Track interaction in telemetry
    await DashTelemetry.trackInteraction({
      success,
      responseTime,
      intent: context.intent,
      featureUsed: context.featureUsed
    });
    
    // Record action if provided
    if (context.action) {
      await DashConversationState.recordAction(context.action.type);
    }
  }
  
  /**
   * Check if an action can be auto-executed
   */
  static async checkActionExecution(action: {
    type: string;
    description: string;
    parameters?: Record<string, any>;
  }): Promise<{
    canAutoExecute: boolean;
    reason: string;
    riskLevel: 'low' | 'medium' | 'high';
    actionId?: string;
  }> {
    const { canAutoExecute, reason, riskLevel } = 
      await DashAutonomyManager.canAutoExecute(action);
    
    if (!canAutoExecute) {
      // Request approval
      const actionId = await DashAutonomyManager.requestApproval({
        type: action.type,
        description: action.description,
        parameters: action.parameters || {}
      });
      
      return {
        canAutoExecute: false,
        reason,
        riskLevel,
        actionId
      };
    }
    
    return {
      canAutoExecute: true,
      reason,
      riskLevel
    };
  }
  
  /**
   * Record successful action execution
   */
  static async recordActionSuccess(
    actionType: string,
    riskLevel: 'low' | 'medium' | 'high',
    autoExecuted: boolean
  ): Promise<void> {
    await DashAutonomyManager.recordAction(
      actionType,
      riskLevel,
      autoExecuted,
      true // success
    );
  }
  
  /**
   * Record failed action execution
   */
  static async recordActionFailure(
    actionType: string,
    riskLevel: 'low' | 'medium' | 'high',
    autoExecuted: boolean,
    error: string
  ): Promise<void> {
    await DashAutonomyManager.recordAction(
      actionType,
      riskLevel,
      autoExecuted,
      false // failure
    );
    
    await DashTelemetry.logError(error, { actionType, riskLevel });
  }
  
  /**
   * Discover capabilities for user intent
   */
  static async discoverForIntent(
    userQuery: string,
    context: AgenticContext
  ): Promise<{
    primaryMatch: any;
    relatedMatches: any[];
    suggestions: string[];
  }> {
    const recentActions = DashConversationState.getRecentActions(5);
    
    const { primaryMatch, relatedMatches } = 
      DashCapabilityDiscovery.discoverForIntent(userQuery, {
        role: context.role,
        tier: context.tier,
        currentScreen: context.currentScreen,
        recentActions
      });
    
    // Generate suggestions based on matches
    const suggestions: string[] = [];
    
    if (primaryMatch) {
      suggestions.push(`I can help you with ${primaryMatch.name}`);
    }
    
    if (relatedMatches.length > 0) {
      suggestions.push(
        `Related features: ${relatedMatches.map(m => m.name).join(', ')}`
      );
    }
    
    return {
      primaryMatch,
      relatedMatches,
      suggestions
    };
  }
  
  /**
   * Get proactive suggestions based on context
   */
  static async getProactiveSuggestions(
    context: AgenticContext & {
      hour?: number;
      dayOfWeek?: number;
    }
  ): Promise<any[]> {
    const recentActions = DashConversationState.getRecentActions(5);
    
    const suggestions = DashCapabilityDiscovery.autoDiscover({
      role: context.role,
      tier: context.tier,
      currentScreen: context.currentScreen,
      recentActions,
      hour: context.hour,
      dayOfWeek: context.dayOfWeek
    });
    
    return suggestions;
  }
  
  /**
   * Record a topic discussion
   */
  static async recordTopic(topic: string): Promise<void> {
    await DashConversationState.recordTopic(topic);
  }
  
  /**
   * Check if should greet user
   */
  static shouldGreet(): boolean {
    return DashConversationState.shouldGreet();
  }
  
  /**
   * Get user's preferred name
   */
  static getUserName(): string | undefined {
    return DashConversationState.getUserName();
  }
  
  /**
   * Get autonomy statistics
   */
  static getAutonomyStats() {
    return DashAutonomyManager.getStats();
  }
  
  /**
   * Get telemetry insights
   */
  static async getTelemetryInsights() {
    return await DashTelemetry.getInsights();
  }
  
  /**
   * Approve pending action
   */
  static async approvePendingAction(actionId: string): Promise<any> {
    return DashAutonomyManager.approvePendingAction(actionId);
  }
  
  /**
   * Reject pending action
   */
  static rejectPendingAction(actionId: string): void {
    DashAutonomyManager.rejectPendingAction(actionId);
  }
  
  /**
   * Get all pending actions
   */
  static getPendingActions() {
    return DashAutonomyManager.getPendingActions();
  }
  
  /**
   * Set autonomy mode
   */
  static async setAutonomyMode(mode: 'assistant' | 'copilot'): Promise<void> {
    await DashAutonomyManager.setMode(mode);
  }
  
  /**
   * Update language preference
   */
  static async updateLanguage(language: string): Promise<void> {
    await DashConversationState.updatePreferences({
      preferredLanguage: language
    });
  }
  
  /**
   * Validate database query for RLS compliance
   */
  static validateQuery(query: string): {
    valid: boolean;
    warnings: string[];
  } {
    return DashEduDashKnowledge.validateQuery(query);
  }
  
  /**
   * Get feature availability
   */
  static checkFeatureAvailability(
    featureId: string,
    role: string,
    tier: string
  ): {
    available: boolean;
    reason?: string;
    upgradeRequired?: string;
  } {
    return DashCapabilityDiscovery.checkAvailability(featureId, role, tier);
  }
  
  /**
   * Clean up - call when user logs out or app closes
   */
  static async cleanup(): Promise<void> {
    // Clear stale actions
    DashAutonomyManager.clearStaleActions();
    
    // End conversation session
    await DashConversationState.endSession();
  }
  
  /**
   * Get comprehensive stats for debugging
   */
  static async getDebugStats() {
    const sessionStats = DashConversationState.getSessionStats();
    const autonomyStats = DashAutonomyManager.getStats();
    const telemetryInsights = await DashTelemetry.getInsights();
    const discoveryStats = DashCapabilityDiscovery.getStats('teacher', 'premium');
    
    return {
      session: sessionStats,
      autonomy: autonomyStats,
      telemetry: telemetryInsights,
      discovery: discoveryStats,
      initialized: this.initialized
    };
  }
}
