/**
 * Assistant Context Bridge
 * 
 * Captures current route, route params, and recent screen transitions
 * to provide contextual information to the DashAIAssistant.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { trackAssistantBreadcrumb } from './monitoring';

export interface RouteContext {
  pathname: string;
  params?: Record<string, any>;
  timestamp: number;
  previous?: string;
}

export interface ContextSnapshot {
  current_route: RouteContext;
  recent_routes: RouteContext[];
  user_context: {
    session_duration: number;
    screen_transitions: number;
    last_activity: number;
  };
  app_state: {
    is_foreground: boolean;
    network_status: 'online' | 'offline' | 'unknown';
  };
}

type RouteChangeCallback = (route: RouteContext) => void;

class AssistantContextBridge {
  private static instance: AssistantContextBridge;
  private currentRoute: RouteContext | null = null;
  private recentRoutes: RouteContext[] = [];
  private routeChangeCallbacks: Set<RouteChangeCallback> = new Set();
  private sessionStartTime = Date.now();
  private screenTransitions = 0;
  private lastActivity = Date.now();
  private isInitialized = false;

  private static readonly STORAGE_KEY = '@assistant_context_bridge';
  private static readonly MAX_RECENT_ROUTES = 10;

  public static getInstance(): AssistantContextBridge {
    if (!AssistantContextBridge.instance) {
      AssistantContextBridge.instance = new AssistantContextBridge();
    }
    return AssistantContextBridge.instance;
  }

  /**
   * Initialize the context bridge
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load persisted route data
      await this.loadPersistedData();
      
      // Set up route tracking (if available)
      this.setupRouteTracking();
      
      this.isInitialized = true;
      
      trackAssistantBreadcrumb('AssistantContextBridge initialized', {
        has_current_route: !!this.currentRoute,
        recent_routes_count: this.recentRoutes.length,
      });
    } catch (error) {
      console.warn('[AssistantContextBridge] Failed to initialize:', error);
    }
  }

  /**
   * Get current route information
   */
  public getCurrentRoute(): RouteContext | null {
    return this.currentRoute;
  }

  /**
   * Get complete context snapshot
   */
  public getContextSnapshot(): ContextSnapshot {
    const now = Date.now();
    
    return {
      current_route: this.currentRoute || {
        pathname: '/',
        timestamp: now,
      },
      recent_routes: [...this.recentRoutes],
      user_context: {
        session_duration: now - this.sessionStartTime,
        screen_transitions: this.screenTransitions,
        last_activity: this.lastActivity,
      },
      app_state: {
        is_foreground: true, // Simplified for now
        network_status: 'online', // Simplified for now
      },
    };
  }

  /**
   * Register callback for route changes
   */
  public onRouteChange(callback: RouteChangeCallback): () => void {
    this.routeChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.routeChangeCallbacks.delete(callback);
    };
  }

  /**
   * Update current route manually (if automatic tracking isn't available)
   */
  public updateCurrentRoute(pathname: string, params?: Record<string, any>): void {
    const previous = this.currentRoute?.pathname;
    const now = Date.now();

    const newRoute: RouteContext = {
      pathname,
      params,
      timestamp: now,
      previous,
    };

    this.setCurrentRoute(newRoute);
  }

  /**
   * Record user activity
   */
  public recordActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Get route-specific context for assistant suggestions
   */
  public getRouteSpecificContext(): Record<string, any> {
    const route = this.currentRoute;
    if (!route) return {};

    const context: Record<string, any> = {
      current_screen: this.extractScreenName(route.pathname),
      has_params: !!route.params && Object.keys(route.params).length > 0,
    };

    // Add screen-specific context
    if (route.pathname.includes('lesson')) {
      context.screen_type = 'lesson';
      context.lesson_context = route.params;
    } else if (route.pathname.includes('student')) {
      context.screen_type = 'student_management';
      context.student_context = route.params;
    } else if (route.pathname.includes('dashboard')) {
      context.screen_type = 'dashboard';
    } else if (route.pathname.includes('worksheet')) {
      context.screen_type = 'worksheet';
    }

    // Add navigation patterns
    if (this.recentRoutes.length > 1) {
      context.navigation_pattern = this.analyzeNavigationPattern();
    }

    return context;
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(AssistantContextBridge.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.currentRoute = data.current_route;
        this.recentRoutes = data.recent_routes || [];
        this.screenTransitions = data.screen_transitions || 0;
      }
    } catch (error) {
      console.warn('[AssistantContextBridge] Failed to load persisted data:', error);
    }
  }

  private async persistData(): Promise<void> {
    try {
      const data = {
        current_route: this.currentRoute,
        recent_routes: this.recentRoutes,
        screen_transitions: this.screenTransitions,
        last_persisted: Date.now(),
      };
      
      await AsyncStorage.setItem(AssistantContextBridge.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[AssistantContextBridge] Failed to persist data:', error);
    }
  }

  private setupRouteTracking(): void {
    // Note: expo-router doesn't have a built-in listener
    // This is a simplified implementation that would need to be
    // integrated with your navigation system
    
    // For now, we'll track route changes through manual updates
    // In a real implementation, you'd hook into your navigation events
  }

  private setCurrentRoute(route: RouteContext): void {
    // Add current route to recent routes if it's different
    if (this.currentRoute && this.currentRoute.pathname !== route.pathname) {
      this.recentRoutes.unshift(this.currentRoute);
      
      // Keep only recent routes
      if (this.recentRoutes.length > AssistantContextBridge.MAX_RECENT_ROUTES) {
        this.recentRoutes = this.recentRoutes.slice(0, AssistantContextBridge.MAX_RECENT_ROUTES);
      }
      
      this.screenTransitions++;
    }

    this.currentRoute = route;
    this.lastActivity = Date.now();

    // Notify callbacks
    this.routeChangeCallbacks.forEach(callback => {
      try {
        callback(route);
      } catch (error) {
        console.warn('[AssistantContextBridge] Route change callback error:', error);
      }
    });

    // Persist changes
    this.persistData();

    // Track for monitoring
    trackAssistantBreadcrumb('Route changed', {
      pathname: route.pathname,
      has_params: !!route.params,
      previous: route.previous,
      screen_transitions: this.screenTransitions,
    });
  }

  private extractScreenName(pathname: string): string {
    // Extract meaningful screen name from pathname
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'dashboard';
    
    const screen = parts[parts.length - 1];
    return screen.replace(/[-_]/g, ' ').toLowerCase();
  }

  private analyzeNavigationPattern(): string {
    if (this.recentRoutes.length < 2) return 'single_screen';
    
    const uniqueScreens = new Set(this.recentRoutes.map(r => this.extractScreenName(r.pathname)));
    
    if (uniqueScreens.size === 1) return 'repeated_screen';
    if (uniqueScreens.size === this.recentRoutes.length) return 'exploratory';
    
    return 'mixed_navigation';
  }
}

// Export singleton instance
export const assistantContextBridge = AssistantContextBridge.getInstance();

// Auto-initialize when imported
assistantContextBridge.initialize();