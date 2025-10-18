/**
 * DashResponseCache
 * 
 * Intelligent response caching with platform-specific knowledge.
 * Provides instant responses for common queries using actual EduDash features.
 * 
 * Performance: Reduces 2-3s AI latency to <100ms for cached responses
 */

export interface CachedResponse {
  pattern: RegExp;
  responses: string[];
  contextRequired?: string[];
  roleSpecific?: string[]; // Roles that can use this response
  ttl: number; // Time to live in ms
  usesPlatformKnowledge: boolean;
}

export interface ResponseContext {
  role?: string;
  tier?: string;
  language?: string;
  userName?: string;
  organizationType?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
}

export class DashResponseCache {
  private cache: Map<string, { 
    response: string; 
    expiresAt: number;
    context: ResponseContext;
  }> = new Map();
  
  // Performance tracking
  private metrics = {
    hits: 0,
    misses: 0,
    totalResponseTime: 0,
    responseCount: 0,
  };
  
  /**
   * Platform-aware response patterns using actual EduDash features
   * These reference REAL screens, routes, and capabilities
   */
  private commonPatterns: CachedResponse[] = [
    // === Greetings (personalized but not generic) ===
    {
      pattern: /^(hi|hello|hey|greetings?|good\s+(morning|afternoon|evening))$/i,
      responses: [
        "Hello! I can help you navigate EduDash Pro. Try asking about Lessons, Students, Worksheets, or Reports.",
        "Hi! Need help with Attendance, Assignments, Parent Messages, or AI Lessons?",
        "Hey! I can take you to Student Management, Lesson Planning, or the Worksheet Generator.",
      ],
      ttl: 60 * 60 * 1000, // 1 hour
      usesPlatformKnowledge: true,
    },
    
    // === Navigation Requests ===
    {
      pattern: /^(where|how do i find|take me to|show me|open|navigate to).*?(lesson|lessons)/i,
      responses: [
        "I can take you to Lessons Hub. Opening now...",
        "Navigating to Lessons Hub where you can browse by subject.",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
    
    {
      pattern: /^(where|how do i find|take me to|show me|open|navigate to).*?(student|students|learner)/i,
      responses: [
        "Opening Student Management screen...",
        "Taking you to Student Management.",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
    
    {
      pattern: /^(where|how do i find|take me to|show me|open|navigate to).*?(worksheet|worksheets)/i,
      responses: [
        "Opening Worksheet Generator...",
        "Taking you to the Worksheet Generator.",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
    
    {
      pattern: /^(where|how do i find|take me to|show me|open|navigate to).*?(report|reports|analytics)/i,
      responses: [
        "Opening Teacher Reports screen...",
        "Taking you to Reports & Analytics.",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
    
    {
      pattern: /^(where|how do i find|take me to|show me|open|navigate to).*?(attendance)/i,
      responses: [
        "I'll help you mark attendance. Opening Attendance screen...",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
    
    {
      pattern: /^(where|how do i find|take me to|show me|open|navigate to).*?(parent|parents|message|messages)/i,
      responses: [
        "Opening Parent Messages...",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
    
    // === Quick Questions ===
    {
      pattern: /^what can (you|dash) do\?*$/i,
      responses: [
        "I can navigate you to any screen, help with Lesson Planning, generate Worksheets, track Student Progress, manage Attendance, and message Parents. What would you like to do?",
      ],
      ttl: 24 * 60 * 60 * 1000,
      usesPlatformKnowledge: true,
    },
    
    {
      pattern: /^(help|what\s+do\s+i\s+do|i\s+need\s+help|assist)/i,
      responses: [
        "I'm here to help! You can ask me to navigate to any screen, create lessons, generate worksheets, or check student progress. What do you need?",
      ],
      ttl: 60 * 60 * 1000,
      usesPlatformKnowledge: true,
    },
    
    // === Acknowledgments ===
    {
      pattern: /^(thanks?|thank\s+you|thx|appreciate\s+it)$/i,
      responses: [
        "You're welcome! Anything else you need help with?",
        "Happy to help! What's next?",
        "Anytime! Let me know if you need anything else.",
      ],
      ttl: 60 * 60 * 1000,
      usesPlatformKnowledge: false,
    },
    
    // === Confirmations ===
    {
      pattern: /^(yes|yep|yeah|sure|ok|okay|correct|right|exactly)$/i,
      responses: [
        "Great! Proceeding now...",
        "Perfect! One moment...",
        "Understood. Continuing...",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: false,
    },
    
    {
      pattern: /^(no|nope|not\s+really|nah|wrong|incorrect)$/i,
      responses: [
        "No problem! What would you like to do instead?",
        "Alright! How can I help you?",
        "Understood. Let me know what you need.",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: false,
    },
    
    // === Status Checks ===
    {
      pattern: /^(how\s+are\s+you|how'?s\s+it\s+going|what'?s\s+up)$/i,
      responses: [
        "All systems running smoothly! What can I help you with?",
        "Ready and waiting! What do you need?",
        "I'm here and ready to help! What's on your mind?",
      ],
      ttl: 60 * 60 * 1000,
      usesPlatformKnowledge: false,
    },
    
    // === Feature Requests (AI/PDF/Generation) ===
    {
      pattern: /(pdf|generate.*pdf|create.*pdf|export.*pdf)/i,
      responses: [
        "You can generate PDFs using the Worksheet Generator or AI Lesson Generator. Which would you like?",
      ],
      ttl: 60 * 60 * 1000,
      usesPlatformKnowledge: true,
    },
    
    {
      pattern: /(ai.*lesson|lesson.*generator|create.*lesson|generate.*lesson|lesson.*plan)/i,
      responses: [
        "I can take you to the AI Lesson Generator. Opening now...",
      ],
      ttl: 30 * 60 * 1000,
      usesPlatformKnowledge: true,
      roleSpecific: ['teacher', 'principal'],
    },
  ];
  
  /**
   * Get cached response if available and context-appropriate
   */
  getCachedResponse(input: string, context?: ResponseContext): string | null {
    const startTime = Date.now();
    const normalized = input.toLowerCase().trim();
    
    // Check exact cache first
    const cached = this.cache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      // Verify context still matches
      if (this.contextsMatch(cached.context, context)) {
        const responseTime = Date.now() - startTime;
        this.recordHit(responseTime);
        console.log(`[ResponseCache] 🎯 INSTANT HIT (${responseTime}ms):`, input);
        return cached.response;
      }
    }
    
    // Check pattern matches
    for (const pattern of this.commonPatterns) {
      if (pattern.pattern.test(normalized)) {
        // Check role restrictions
        if (pattern.roleSpecific && context?.role) {
          if (!pattern.roleSpecific.includes(context.role)) {
            continue; // Skip this pattern for this role
          }
        }
        
        // Check context requirements
        if (pattern.contextRequired) {
          const hasContext = pattern.contextRequired.every((key) => 
            context?.[key as keyof ResponseContext]
          );
          if (!hasContext) continue;
        }
        
        // Pick response (random for variety)
        const response = pattern.responses[
          Math.floor(Math.random() * pattern.responses.length)
        ];
        
        // Cache it for next time
        this.cache.set(normalized, {
          response,
          expiresAt: Date.now() + pattern.ttl,
          context: context || {},
        });
        
        const responseTime = Date.now() - startTime;
        this.recordHit(responseTime);
        console.log(`[ResponseCache] 🎯 PATTERN HIT (${responseTime}ms):`, input, '→', response);
        return response;
      }
    }
    
    // No match
    this.recordMiss();
    console.log('[ResponseCache] ❌ MISS:', input);
    return null;
  }
  
  /**
   * Add a custom pattern (learned from conversations)
   */
  addPattern(
    pattern: RegExp, 
    responses: string[], 
    options: {
      ttl?: number;
      roleSpecific?: string[];
      usesPlatformKnowledge?: boolean;
    } = {}
  ): void {
    this.commonPatterns.push({
      pattern,
      responses,
      ttl: options.ttl || 60 * 60 * 1000,
      roleSpecific: options.roleSpecific,
      usesPlatformKnowledge: options.usesPlatformKnowledge ?? true,
    });
    console.log('[ResponseCache] ➕ Added custom pattern:', pattern);
  }
  
  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`[ResponseCache] 🧹 Cleaned up ${cleared} expired entries`);
    }
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? this.metrics.hits / total : 0;
    const avgResponseTime = this.metrics.responseCount > 0 
      ? this.metrics.totalResponseTime / this.metrics.responseCount 
      : 0;
    
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      totalResponseTime: 0,
      responseCount: 0,
    };
    console.log('[ResponseCache] 📊 Metrics reset');
  }
  
  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[ResponseCache] 🗑️  Cache cleared');
  }
  
  // === Private Helper Methods ===
  
  private recordHit(responseTime: number): void {
    this.metrics.hits++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.responseCount++;
  }
  
  private recordMiss(): void {
    this.metrics.misses++;
  }
  
  private contextsMatch(
    cached: ResponseContext, 
    current?: ResponseContext
  ): boolean {
    if (!current) return true;
    
    // Role must match if specified
    if (cached.role && current.role && cached.role !== current.role) {
      return false;
    }
    
    // Language must match if specified
    if (cached.language && current.language && cached.language !== current.language) {
      return false;
    }
    
    return true;
  }
}

// Singleton instance
export default new DashResponseCache();
