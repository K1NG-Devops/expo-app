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
  data: {
    studentCount?: number;
    classCount?: number;
    teacherCount?: number;
    preschoolId?: string;
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
    
    // Get real data counts
    const dataContext = await this.getDataContext(profile);
    
    // Get conversation context
    const conversationContext = this.getConversationContext(conversationId);
    
    this.awareness = {
      user: userIdentity,
      app: appStructure,
      data: dataContext,
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
      if ((profile as any).display_name) {
        userName = (profile as any).display_name;
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
      role: (profile as any).role || 'user',
      email: profile.email || 'unknown',
      organization: (profile as any).organization_name || 'your school',
      lastSeen: new Date(),
      preferences: undefined
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
   * Get real data counts from database
   */
  private async getDataContext(profile: UserProfile | null): Promise<DashAwareness['data']> {
    if (!profile) {
      return {};
    }
    
    try {
      const preschoolId = (profile as any).preschool_id;
      if (!preschoolId) {
        return {};
      }
      
      const supabase = assertSupabase();
      
      // Get actual student count
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId);
      
      // Get class count  
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId);
      
      // Get teacher count
      const { count: teacherCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('preschool_id', preschoolId)
        .eq('role', 'teacher');
      
      return {
        studentCount: studentCount ?? undefined,
        classCount: classCount ?? undefined,
        teacherCount: teacherCount ?? undefined,
        preschoolId
      };
    } catch (error) {
      console.error('[DashAwareness] Failed to get data context:', error);
      return {};
    }
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

🚨 CRITICAL: NO THEATRICAL NARRATION 🚨
You are a TEXT-BASED assistant. NEVER use:
- Asterisks or actions: "*clears throat*", "*speaks*", "*opens*", "*points*"
- First-person action verbs: "Let me open", "I'll check", "I'm looking"
- Stage directions or roleplaying
- Repetitive greetings or overusing the user's name

USER IDENTITY:
- Name: ${user.name} (${user.role} at ${user.organization})
- Current conversation: ${conversation.messageCount} messages
- ${conversation.isNewConversation ? 'NEW conversation' : 'ONGOING - DO NOT GREET AGAIN'}

REAL DATA (from database):
${awareness.data.studentCount !== undefined ? `- Students: ${awareness.data.studentCount}` : '- Students: Not loaded yet'}
${awareness.data.classCount !== undefined ? `- Classes: ${awareness.data.classCount}` : ''}
${awareness.data.teacherCount !== undefined ? `- Teachers: ${awareness.data.teacherCount}` : ''}

CRITICAL: Use ONLY the real data above. NEVER make up student counts or other statistics.

RESPONSE STYLE:
- Direct and concise (1-3 sentences for simple questions)
- Skip greetings after the first message
- Use natural language without dramatic flair
- State facts only - never invent data or features

YOUR ACTUAL CAPABILITIES:
- Open screens via app navigation (just say "Opening Financial Dashboard" if executing)
- Run diagnostics and auto-fix common app issues
- Access user's actual data (never use mock/placeholder data)
- Be helpful and decisive

DATA INTEGRITY:
- Only use ACTUAL data from user's context
- NEVER invent numbers, balances, or statistics
- If data unavailable, say "I don't have that data" or offer to open the relevant screen
- Currency: South African rand (R500, R1,234.50)

NAVIGATION:
- App uses stack navigation (no tabs/drawers)
- Available screens: ${app.availableScreens.slice(0, 5).join(', ')}${app.availableScreens.length > 5 ? ', ...' : ''}
- When user requests a screen, open it and mention briefly ("Opening Financial Dashboard")

ADDITIONAL FEATURES:
- Can run diagnostics and auto-fix app issues
- Can access educational resources
- Proactive assistance when appropriate`;

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