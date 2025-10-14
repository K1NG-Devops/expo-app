/**
 * EventBus - Simple pub/sub for agent perception
 * Enables the AI agent to observe app state changes
 */

type EventHandler = (data: any) => void | Promise<void>;

class EventBusService {
  private static instance: EventBusService;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Publish an event
   */
  async publish(event: string, data?: any): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    // Execute handlers in parallel
    await Promise.all(
      Array.from(handlers).map(handler => 
        Promise.resolve(handler(data)).catch(err => 
          console.error(`[EventBus] Handler error for ${event}:`, err)
        )
      )
    );
  }

  /**
   * Standard event types for the agent
   */
  static readonly Events = {
    // User interactions
    CONVERSATION_MESSAGE: 'conversation:message',
    VOICE_INPUT: 'voice:input',
    
    // Task management
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated',
    TASK_COMPLETED: 'task:completed',
    
    // Navigation
    SCREEN_CHANGED: 'navigation:screen_changed',
    
    // Agent decisions
    AGENT_DECISION: 'agent:decision',
    TOOL_EXECUTED: 'agent:tool_executed',
    
    // System events
    AI_ERROR: 'system:ai_error',
    REMINDER_TRIGGERED: 'reminder:triggered',
  } as const;
}

export const EventBus = EventBusService.getInstance();
export const Events = EventBusService.Events;