/**
 * DashRealTimeAwareness - Making Dash Truly Aware & Agentic
 * 
 * This module gives Dash:
 * 1. Real user identity awareness (knows WHO they're talking to by name)
 * 2. Real app structure awareness (Stack navigation, not tabs)
 * 3. Real-time screen opening capabilities
 * 4. Conversation continuity (no repeated greetings)
 * 5. Dynamic personality based on context
 */

import { router } from 'expo-router';
import { getCurrentProfile, type UserProfile } from '@/lib/sessionManager';
import { assertSupabase } from '@/lib/supabase';

export interface DashAwareness {
  user: {
    name: string;
    role: string;
    email: string;
    organization: string;
    lastSeen?: Date;
    preferences?: any;
  };
  app: {
    navigation: 'stack' | 'tab' | 'drawer';
    currentScreen?: string;
    availableScreens: string[];
    recentScreens: string[];
  };
  conversation: {
    messageCount: number;
    isNewConversation: boolean;
    lastInteraction?: Date;
    topics: string[];
  };
  capabilities: {
    canOpenScreens: boolean;
    canExecuteActions: boolean;
    canAccessData: boolean;
  };
}

export class DashRealTimeAwareness {
  private static instance: DashRealTimeAwareness;
  private awareness: DashAwareness | null = null;
  private conversationStarted = new Map<string, Date>();
  private screenHistory: string[] = [];
  
  private constructor() {}
  
  public static getInstance(): DashRealTimeAwareness {
    if (!DashRealTimeAwareness.instance) {
      DashRealTimeAwareness.instance = new DashRealTimeAwareness();
    }
    return DashRealTimeAwareness.instance;
  }
  
  /**
   * Get complete awareness context for Dash
   */
  public async getAwareness(conversationId: string): Promise<DashAwareness> {
    // Get real user identity
    const profile = await getCurrentProfile();
    const userIdentity = await this.getUserIdentity(profile);
    
    // Get real app structure
    const appStructure = this.getAppStructure(profile?.role);
    
    // Get conversation context
    const conversationContext = this.getConversationContext(conversationId);
    
    this.awareness = {
      user: userIdentity,
      app: appStructure,
      conversation: conversationContext,
      capabilities: {
        canOpenScreens: true,
        canExecuteActions: true,
        canAccessData: true
      }
    };
    
    return this.awareness;
  }
  
  /**
   * Get user's actual name and identity
   */
  private async getUserIdentity(profile: UserProfile | null): Promise<DashAwareness['user']> {
    if (!profile) {
      return {
        name: 'there',
        role: 'user',
        email: 'unknown',
        organization: 'unknown'
      };
    }
    
    // Get user's actual name from profile or auth metadata
    let userName = 'there'; // Fallback
    
    try {
      // Try profile first
      if (profile.display_name) {
        userName = profile.display_name;
      } else if (profile.email) {
        // Try to get from auth metadata
        const { data } = await assertSupabase().auth.getUser();
        if (data?.user?.user_metadata?.name) {
          userName = data.user.user_metadata.name;
        } else if (data?.user?.user_metadata?.full_name) {
          userName = data.user.user_metadata.full_name;
        } else {
          // Use email prefix as last resort
          userName = profile.email.split('@')[0].replace(/[._-]/g, ' ');
          // Capitalize first letters
          userName = userName.replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    } catch (error) {
      console.error('[DashAwareness] Failed to get user name:', error);
    }
    
    return {
      name: userName,
      role: profile.role || 'user',
      email: profile.email || 'unknown',
      organization: profile.organization_name || profile.preschool_name || 'your school',
      lastSeen: new Date(),
      preferences: profile.preferences
    };
  }
  
  /**
   * Get REAL app structure (Stack navigation, not tabs!)
   */
  private getAppStructure(role?: string): DashAwareness['app'] {
    const roleScreens = this.getScreensForRole(role);
    
    return {
      navigation: 'stack', // CORRECT: Stack navigation, NOT tabs!
      currentScreen: this.getCurrentScreen(),
      availableScreens: roleScreens,
      recentScreens: this.screenHistory.slice(-5)
    };
  }
  
  /**
   * Get screens available for user's role
   */
  private getScreensForRole(role?: string): string[] {
    const commonScreens = [
      'sign-in',
      'settings',
      'profile',
      'messages',
      'notifications'
    ];
    
    switch (role) {
      case 'principal':
      case 'principal_admin':
        return [
          ...commonScreens,
          'principal-dashboard',
          'teachers',
          'students', 
          'classes',
          'financial-dashboard',
          'reports',
          'applications',
          'announcements',
          'ai-lesson-generator'
        ];
        
      case 'teacher':
        return [
          ...commonScreens,
          'teacher-dashboard',
          'my-classes',
          'my-students',
          'assignments',
          'gradebook',
          'attendance',
          'ai-lesson-generator',
          'worksheet-demo',
          'parent-messages'
        ];
        
      case 'parent':
        return [
          ...commonScreens,
          'parent-dashboard',
          'my-children',
          'homework',
          'calendar',
          'progress-reports',
          'school-messages'
        ];
        
      default:
        return commonScreens;
    }
  }
  
  /**
   * Get current screen from router
   */
  private getCurrentScreen(): string | undefined {
    // This would need to be tracked via navigation events
    // For now, return undefined
    return undefined;
  }
  
  /**
   * Track conversation context
   */
  private getConversationContext(conversationId: string): DashAwareness['conversation'] {
    const startTime = this.conversationStarted.get(conversationId);
    const isNew = !startTime || (Date.now() - startTime.getTime() > 30 * 60 * 1000); // 30 min gap = new
    
    if (isNew || !startTime) {
      this.conversationStarted.set(conversationId, new Date());
    }
    
    return {
      messageCount: 0, // Would be tracked properly
      isNewConversation: isNew,
      lastInteraction: startTime,
      topics: [] // Would track discussed topics
    };
  }
  
  /**
   * ACTUALLY open a screen right now
   */
  public async openScreen(route: string, params?: Record<string, any>): Promise<void> {
    console.log(`[DashAwareness] Opening screen: ${route}`, params);
    
    try {
      // Track navigation
      this.screenHistory.push(route);
      if (this.screenHistory.length > 20) {
        this.screenHistory.shift();
      }
      
      // Actually navigate
      router.push({
        pathname: route as any,
        params: params || {}
      });
      
      console.log(`[DashAwareness] Successfully opened: ${route}`);
    } catch (error) {
      console.error(`[DashAwareness] Failed to open screen ${route}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate dynamic greeting based on context
   */
  public generateContextualGreeting(awareness: DashAwareness): string {
    const { user, conversation } = awareness;
    
    // NEVER greet in ongoing conversation
    if (!conversation.isNewConversation) {
      return ''; // No greeting!
    }
    
    // First-time greeting with user's actual name
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    // Use actual name, not generic greeting
    return `${timeGreeting}, ${user.name}! `;
  }
  
  /**
   * Build system prompt with REAL awareness
   */
  public buildAwareSystemPrompt(awareness: DashAwareness): string {
    const { user, app, conversation } = awareness;
    
    let prompt = `You are Dash, an AI assistant for EduDash Pro.

CRITICAL AWARENESS:
- You are speaking to: ${user.name} (${user.role} at ${user.organization})
- App uses STACK NAVIGATION (no tabs, no menu button, no drawer)
- Current conversation has ${conversation.messageCount} messages
- ${conversation.isNewConversation ? 'This is a NEW conversation' : 'This is an ONGOING conversation - DO NOT GREET AGAIN'}

USER IDENTITY:
- Name: ${user.name}
- Role: ${user.role}
- Email: ${user.email}
- Organization: ${user.organization}

APP NAVIGATION:
- Type: Stack Navigation (screens stack on top of each other)
- Back button: Use device back button or swipe back
- Available screens: ${app.availableScreens.join(', ')}
- NO bottom tabs, NO hamburger menu, NO side drawer

YOUR CAPABILITIES:
- You CAN open screens directly (say "Opening [screen] now..." and DO IT)
- You CAN execute actions immediately
- You CAN access and analyze their data
- Be DECISIVE - don't ask permission for routine tasks

CONVERSATION RULES:
- ${conversation.isNewConversation ? 'Greet ONCE with their name' : 'NO GREETING - continue the conversation naturally'}
- Be conversational and natural, not robotic
- Remember context from previous messages
- Use their name occasionally (but not every message)
- Be proactive - suggest and execute actions

WHEN USER ASKS TO OPEN SOMETHING:
- Say "Opening [screen] now..." or "Taking you to [screen]..."
- IMMEDIATELY call the open_screen action
- Don't explain how to navigate manually
- Just DO IT`;

    return prompt;
  }
  
  /**
   * Determine if an action should be executed immediately
   */
  public shouldAutoExecute(intent: string, awareness: DashAwareness): boolean {
    const autoExecuteIntents = [
      'open', 'show', 'go to', 'navigate', 'take me',
      'launch', 'start', 'view', 'check', 'see'
    ];
    
    return autoExecuteIntents.some(keyword => 
      intent.toLowerCase().includes(keyword)
    );
  }
}

export default DashRealTimeAwareness.getInstance();