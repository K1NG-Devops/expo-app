/**
 * Dash Advanced Memory System
 * 
 * Enhanced semantic memory with embeddings, cross-session persistence,
 * and intelligent memory management for Claude 4 Opus-level intelligence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { assertSupabase } from '@/lib/supabase';
import { getCurrentProfile } from '@/lib/sessionManager';

export interface AdvancedMemoryItem {
  id: string;
  type: 'conversation' | 'preference' | 'fact' | 'skill' | 'goal' | 'pattern' | 'insight' | 'relationship';
  key: string;
  value: any;
  confidence: number;
  created_at: number;
  updated_at: number;
  expires_at?: number;
  access_count: number;
  last_accessed: number;
  importance_score: number;
  emotional_weight: number;
  related_entities: Array<{
    type: 'user' | 'student' | 'parent' | 'class' | 'subject' | 'lesson' | 'conversation';
    id: string;
    name: string;
    relevance_score: number;
  }>;
  embeddings?: number[]; // Semantic embeddings for similarity search
  tags: string[];
  context: {
    conversation_id?: string;
    screen?: string;
    time_context?: string;
    user_mood?: 'positive' | 'neutral' | 'frustrated' | 'excited';
    task_context?: string;
  };
  reinforcement_history: Array<{
    timestamp: number;
    reinforcement_type: 'access' | 'explicit' | 'contextual' | 'emotional';
    strength: number;
  }>;
  cross_references: string[]; // IDs of related memories
  memory_chain?: string; // ID of parent memory if this is part of a chain
}

export interface MemoryQuery {
  text?: string;
  type?: string;
  tags?: string[];
  entities?: Array<{ type: string; id: string }>;
  time_range?: { start: number; end: number };
  importance_threshold?: number;
  limit?: number;
}

export interface MemoryInsight {
  id: string;
  type: 'pattern' | 'trend' | 'anomaly' | 'opportunity' | 'warning';
  title: string;
  description: string;
  confidence: number;
  related_memories: string[];
  actionable: boolean;
  suggested_actions: string[];
  created_at: number;
}

export class DashAdvancedMemory {
  private static instance: DashAdvancedMemory;
  private memoryCache: Map<string, AdvancedMemoryItem> = new Map();
  private embeddingsCache: Map<string, number[]> = new Map();
  private memoryIndex: Map<string, Set<string>> = new Map(); // tag -> memory IDs
  private entityIndex: Map<string, Set<string>> = new Map(); // entity -> memory IDs
  private isInitialized = false;
  
  // Storage keys
  private static readonly MEMORY_KEY = 'dash_advanced_memory';
  private static readonly EMBEDDINGS_KEY = 'dash_memory_embeddings';
  private static readonly INDEX_KEY = 'dash_memory_index';
  private static readonly INSIGHTS_KEY = 'dash_memory_insights';

  public static getInstance(): DashAdvancedMemory {
    if (!DashAdvancedMemory.instance) {
      DashAdvancedMemory.instance = new DashAdvancedMemory();
    }
    return DashAdvancedMemory.instance;
  }

  /**
   * Initialize the advanced memory system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('[DashMemory] Initializing Advanced Memory System...');
      
      await this.loadMemoryFromStorage();
      await this.buildMemoryIndex();
      await this.cleanupExpiredMemories();
      await this.generateMemoryInsights();
      
      this.isInitialized = true;
      console.log('[DashMemory] Advanced Memory System initialized successfully');
    } catch (error) {
      console.error('[DashMemory] Failed to initialize:', error);
    }
  }

  /**
   * Store a new memory with semantic processing
   */
  public async storeMemory(
    type: AdvancedMemoryItem['type'],
    key: string,
    value: any,
    context: Partial<AdvancedMemoryItem['context']> = {},
    options: {
      importance?: number;
      emotional_weight?: number;
      expires_at?: number;
      tags?: string[];
      related_entities?: AdvancedMemoryItem['related_entities'];
    } = {}
  ): Promise<string> {
    const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const memory: AdvancedMemoryItem = {
      id: memoryId,
      type,
      key,
      value,
      confidence: 0.8, // Default confidence
      created_at: now,
      updated_at: now,
      expires_at: options.expires_at,
      access_count: 0,
      last_accessed: now,
      importance_score: options.importance || this.calculateImportanceScore(type, key, value),
      emotional_weight: options.emotional_weight || 0.5,
      related_entities: options.related_entities || [],
      tags: options.tags || [],
      context: {
        ...context,
        time_context: this.getTimeContext(now)
      },
      reinforcement_history: [],
      cross_references: []
    };

    // Generate embeddings for semantic search
    await this.generateEmbeddings(memory);
    
    // Store in cache and persistence
    this.memoryCache.set(memoryId, memory);
    await this.updateMemoryIndex(memory);
    await this.saveMemoryToStorage();
    
    // Check for cross-references and create memory chains
    await this.establishCrossReferences(memory);
    
    console.log(`[DashMemory] Stored memory: ${type}:${key}`);
    return memoryId;
  }

  /**
   * Retrieve memories using semantic search
   */
  public async retrieveMemories(query: MemoryQuery): Promise<AdvancedMemoryItem[]> {
    await this.initialize();
    
    let candidateIds = new Set<string>();
    
    // Text-based semantic search
    if (query.text) {
      const semanticIds = await this.semanticSearch(query.text);
      semanticIds.forEach(id => candidateIds.add(id));
    }
    
    // Type-based filtering
    if (query.type) {
      const typeIds = Array.from(this.memoryCache.values())
        .filter(m => m.type === query.type)
        .map(m => m.id);
      if (candidateIds.size > 0) {
        candidateIds = new Set([...candidateIds].filter(id => typeIds.includes(id)));
      } else {
        typeIds.forEach(id => candidateIds.add(id));
      }
    }
    
    // Tag-based filtering
    if (query.tags && query.tags.length > 0) {
      const tagIds = new Set<string>();
      query.tags.forEach(tag => {
        const ids = this.memoryIndex.get(tag) || new Set();
        ids.forEach(id => tagIds.add(id));
      });
      if (candidateIds.size > 0) {
        candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)));
      } else {
        tagIds.forEach(id => candidateIds.add(id));
      }
    }
    
    // Entity-based filtering
    if (query.entities && query.entities.length > 0) {
      const entityIds = new Set<string>();
      query.entities.forEach(entity => {
        const entityKey = `${entity.type}:${entity.id}`;
        const ids = this.entityIndex.get(entityKey) || new Set();
        ids.forEach(id => entityIds.add(id));
      });
      if (candidateIds.size > 0) {
        candidateIds = new Set([...candidateIds].filter(id => entityIds.has(id)));
      } else {
        entityIds.forEach(id => candidateIds.add(id));
      }
    }
    
    // Time range filtering
    if (query.time_range) {
      candidateIds = new Set([...candidateIds].filter(id => {
        const memory = this.memoryCache.get(id);
        return memory && 
          memory.created_at >= query.time_range!.start && 
          memory.created_at <= query.time_range!.end;
      }));
    }
    
    // Importance filtering
    if (query.importance_threshold) {
      candidateIds = new Set([...candidateIds].filter(id => {
        const memory = this.memoryCache.get(id);
        return memory && memory.importance_score >= query.importance_threshold!;
      }));
    }
    
    // Get memories and sort by relevance
    const memories = Array.from(candidateIds)
      .map(id => this.memoryCache.get(id))
      .filter((memory): memory is AdvancedMemoryItem => memory !== undefined)
      .sort((a, b) => {
        // Sort by importance, then by recency, then by access count
        if (b.importance_score !== a.importance_score) {
          return b.importance_score - a.importance_score;
        }
        if (b.last_accessed !== a.last_accessed) {
          return b.last_accessed - a.last_accessed;
        }
        return b.access_count - a.access_count;
      });
    
    // Update access counts
    memories.slice(0, 10).forEach(memory => {
      this.updateMemoryAccess(memory.id);
    });
    
    return memories.slice(0, query.limit || 20);
  }

  /**
   * Generate semantic embeddings for memory
   */
  private async generateEmbeddings(memory: AdvancedMemoryItem): Promise<void> {
    try {
      const textToEmbed = `${memory.type} ${memory.key} ${JSON.stringify(memory.value)} ${memory.tags.join(' ')}`;
      
      // Use a simple hash-based embedding for now (in production, use proper embedding service)
      const embedding = this.generateHashEmbedding(textToEmbed);
      
      memory.embeddings = embedding;
      this.embeddingsCache.set(memory.id, embedding);
      
      await this.saveEmbeddingsToStorage();
    } catch (error) {
      console.error('[DashMemory] Failed to generate embeddings:', error);
    }
  }

  /**
   * Generate hash-based embedding (placeholder for proper embedding service)
   */
  private generateHashEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding = new Array(128).fill(0);
    
    // Distribute hash across embedding dimensions
    for (let i = 0; i < 128; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
    }
    
    return embedding;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(query: string): Promise<string[]> {
    const queryEmbedding = this.generateHashEmbedding(query);
    const similarities: Array<{ id: string; similarity: number }> = [];
    
    for (const [memoryId, embedding] of this.embeddingsCache.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      if (similarity > 0.3) { // Threshold for relevance
        similarities.push({ id: memoryId, similarity });
      }
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20)
      .map(item => item.id);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate importance score for memory
   */
  private calculateImportanceScore(type: string, key: string, value: any): number {
    let score = 0.5; // Base score
    
    // Type-based importance
    const typeScores: Record<string, number> = {
      'preference': 0.8,
      'fact': 0.7,
      'skill': 0.9,
      'goal': 0.9,
      'pattern': 0.8,
      'insight': 0.9,
      'relationship': 0.8,
      'conversation': 0.6
    };
    score = typeScores[type] || 0.5;
    
    // Key-based importance (longer, more specific keys are more important)
    if (key.length > 10) score += 0.1;
    if (key.includes('important') || key.includes('critical')) score += 0.2;
    
    // Value-based importance
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value) && value.length > 3) score += 0.1;
      if (typeof value === 'object' && Object.keys(value).length > 5) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Get time context for memory
   */
  private getTimeContext(timestamp: number): string {
    const date = new Date(timestamp);
    const hour = date.getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Update memory access tracking
   */
  private async updateMemoryAccess(memoryId: string): Promise<void> {
    const memory = this.memoryCache.get(memoryId);
    if (!memory) return;
    
    memory.access_count++;
    memory.last_accessed = Date.now();
    
    // Add reinforcement
    memory.reinforcement_history.push({
      timestamp: Date.now(),
      reinforcement_type: 'access',
      strength: 0.1
    });
    
    await this.saveMemoryToStorage();
  }

  /**
   * Establish cross-references between related memories
   */
  private async establishCrossReferences(memory: AdvancedMemoryItem): Promise<void> {
    const relatedIds: string[] = [];
    
    // Find memories with similar entities
    for (const entity of memory.related_entities) {
      const entityKey = `${entity.type}:${entity.id}`;
      const relatedMemoryIds = this.entityIndex.get(entityKey) || new Set();
      relatedMemoryIds.forEach(id => {
        if (id !== memory.id && !relatedIds.includes(id)) {
          relatedIds.push(id);
        }
      });
    }
    
    // Find memories with similar tags
    for (const tag of memory.tags) {
      const tagMemoryIds = this.memoryIndex.get(tag) || new Set();
      tagMemoryIds.forEach(id => {
        if (id !== memory.id && !relatedIds.includes(id)) {
          relatedIds.push(id);
        }
      });
    }
    
    // Update cross-references
    memory.cross_references = relatedIds.slice(0, 10); // Limit to 10 cross-references
    
    // Bidirectional cross-references
    for (const relatedId of memory.cross_references) {
      const relatedMemory = this.memoryCache.get(relatedId);
      if (relatedMemory && !relatedMemory.cross_references.includes(memory.id)) {
        relatedMemory.cross_references.push(memory.id);
      }
    }
  }

  /**
   * Generate memory insights
   */
  private async generateMemoryInsights(): Promise<void> {
    const insights: MemoryInsight[] = [];
    
    // Pattern detection
    const patterns = await this.detectMemoryPatterns();
    insights.push(...patterns);
    
    // Trend analysis
    const trends = await this.analyzeMemoryTrends();
    insights.push(...trends);
    
    // Opportunity identification
    const opportunities = await this.identifyOpportunities();
    insights.push(...opportunities);
    
    await this.saveInsightsToStorage(insights);
  }

  /**
   * Detect patterns in memory
   */
  private async detectMemoryPatterns(): Promise<MemoryInsight[]> {
    const insights: MemoryInsight[] = [];
    const memories = Array.from(this.memoryCache.values());
    
    // Analyze access patterns
    const accessPatterns = new Map<string, number>();
    memories.forEach(memory => {
      const hour = new Date(memory.last_accessed).getHours();
      const timeSlot = `${Math.floor(hour / 4) * 4}-${Math.floor(hour / 4) * 4 + 4}`;
      accessPatterns.set(timeSlot, (accessPatterns.get(timeSlot) || 0) + 1);
    });
    
    const peakTime = Array.from(accessPatterns.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (peakTime && peakTime[1] > 5) {
      insights.push({
        id: `insight_${Date.now()}_pattern`,
        type: 'pattern',
        title: 'Peak Usage Time',
        description: `You're most active during ${peakTime[0]} hours. Consider scheduling important tasks during this time.`,
        confidence: 0.8,
        related_memories: memories
          .filter(m => {
            const hour = new Date(m.last_accessed).getHours();
            const timeSlot = `${Math.floor(hour / 4) * 4}-${Math.floor(hour / 4) * 4 + 4}`;
            return timeSlot === peakTime[0];
          })
          .map(m => m.id),
        actionable: true,
        suggested_actions: [
          'Schedule important tasks during peak hours',
          'Set reminders for optimal times',
          'Automate routine tasks during low-activity periods'
        ],
        created_at: Date.now()
      });
    }
    
    return insights;
  }

  /**
   * Analyze memory trends
   */
  private async analyzeMemoryTrends(): Promise<MemoryInsight[]> {
    const insights: MemoryInsight[] = [];
    const memories = Array.from(this.memoryCache.values());
    
    // Analyze memory types over time
    const typeCounts = new Map<string, number>();
    memories.forEach(memory => {
      typeCounts.set(memory.type, (typeCounts.get(memory.type) || 0) + 1);
    });
    
    const mostCommonType = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonType && mostCommonType[1] > 10) {
      insights.push({
        id: `insight_${Date.now()}_trend`,
        type: 'trend',
        title: 'Memory Type Trend',
        description: `You frequently store ${mostCommonType[0]} memories, indicating this is an important aspect of your workflow.`,
        confidence: 0.7,
        related_memories: memories
          .filter(m => m.type === mostCommonType[0])
          .map(m => m.id),
        actionable: true,
        suggested_actions: [
          `Optimize ${mostCommonType[0]} workflow`,
          'Create automation for this task type',
          'Set up reminders for related activities'
        ],
        created_at: Date.now()
      });
    }
    
    return insights;
  }

  /**
   * Identify opportunities
   */
  private async identifyOpportunities(): Promise<MemoryInsight[]> {
    const insights: MemoryInsight[] = [];
    
    // Look for memories that could be automated
    const memories = Array.from(this.memoryCache.values());
    const repetitiveTasks = memories.filter(m => 
      m.type === 'pattern' && 
      m.access_count > 5 &&
      m.key.includes('task')
    );
    
    if (repetitiveTasks.length > 0) {
      insights.push({
        id: `insight_${Date.now()}_opportunity`,
        type: 'opportunity',
        title: 'Automation Opportunity',
        description: `I've identified ${repetitiveTasks.length} repetitive tasks that could be automated to save time.`,
        confidence: 0.8,
        related_memories: repetitiveTasks.map(m => m.id),
        actionable: true,
        suggested_actions: [
          'Set up task automation',
          'Create workflow templates',
          'Schedule recurring tasks'
        ],
        created_at: Date.now()
      });
    }
    
    return insights;
  }

  /**
   * Load memory from storage
   */
  private async loadMemoryFromStorage(): Promise<void> {
    try {
      const memoryData = await AsyncStorage.getItem(DashAdvancedMemory.MEMORY_KEY);
      if (memoryData) {
        const memories: AdvancedMemoryItem[] = JSON.parse(memoryData);
        memories.forEach(memory => {
          this.memoryCache.set(memory.id, memory);
        });
      }
      
      const embeddingsData = await AsyncStorage.getItem(DashAdvancedMemory.EMBEDDINGS_KEY);
      if (embeddingsData) {
        const embeddings: Record<string, number[]> = JSON.parse(embeddingsData);
        Object.entries(embeddings).forEach(([id, embedding]) => {
          this.embeddingsCache.set(id, embedding);
        });
      }
      
      console.log(`[DashMemory] Loaded ${this.memoryCache.size} memories and ${this.embeddingsCache.size} embeddings`);
    } catch (error) {
      console.error('[DashMemory] Failed to load memory from storage:', error);
    }
  }

  /**
   * Save memory to storage
   */
  private async saveMemoryToStorage(): Promise<void> {
    try {
      const memories = Array.from(this.memoryCache.values());
      await AsyncStorage.setItem(DashAdvancedMemory.MEMORY_KEY, JSON.stringify(memories));
    } catch (error) {
      console.error('[DashMemory] Failed to save memory to storage:', error);
    }
  }

  /**
   * Save embeddings to storage
   */
  private async saveEmbeddingsToStorage(): Promise<void> {
    try {
      const embeddings: Record<string, number[]> = {};
      this.embeddingsCache.forEach((embedding, id) => {
        embeddings[id] = embedding;
      });
      await AsyncStorage.setItem(DashAdvancedMemory.EMBEDDINGS_KEY, JSON.stringify(embeddings));
    } catch (error) {
      console.error('[DashMemory] Failed to save embeddings to storage:', error);
    }
  }

  /**
   * Save insights to storage
   */
  private async saveInsightsToStorage(insights: MemoryInsight[]): Promise<void> {
    try {
      await AsyncStorage.setItem(DashAdvancedMemory.INSIGHTS_KEY, JSON.stringify(insights));
    } catch (error) {
      console.error('[DashMemory] Failed to save insights to storage:', error);
    }
  }

  /**
   * Build memory index for fast retrieval
   */
  private async buildMemoryIndex(): Promise<void> {
    this.memoryIndex.clear();
    this.entityIndex.clear();
    
    for (const memory of this.memoryCache.values()) {
      await this.updateMemoryIndex(memory);
    }
  }

  /**
   * Update memory index
   */
  private async updateMemoryIndex(memory: AdvancedMemoryItem): Promise<void> {
    // Index by tags
    memory.tags.forEach(tag => {
      if (!this.memoryIndex.has(tag)) {
        this.memoryIndex.set(tag, new Set());
      }
      this.memoryIndex.get(tag)!.add(memory.id);
    });
    
    // Index by entities
    memory.related_entities.forEach(entity => {
      const entityKey = `${entity.type}:${entity.id}`;
      if (!this.entityIndex.has(entityKey)) {
        this.entityIndex.set(entityKey, new Set());
      }
      this.entityIndex.get(entityKey)!.add(memory.id);
    });
  }

  /**
   * Clean up expired memories
   */
  private async cleanupExpiredMemories(): Promise<void> {
    const now = Date.now();
    const expiredIds: string[] = [];
    
    for (const [id, memory] of this.memoryCache.entries()) {
      if (memory.expires_at && memory.expires_at < now) {
        expiredIds.push(id);
      }
    }
    
    expiredIds.forEach(id => {
      this.memoryCache.delete(id);
      this.embeddingsCache.delete(id);
    });
    
    if (expiredIds.length > 0) {
      await this.saveMemoryToStorage();
      console.log(`[DashMemory] Cleaned up ${expiredIds.length} expired memories`);
    }
  }

  /**
   * Get memory insights
   */
  public async getMemoryInsights(): Promise<MemoryInsight[]> {
    try {
      const insightsData = await AsyncStorage.getItem(DashAdvancedMemory.INSIGHTS_KEY);
      if (insightsData) {
        return JSON.parse(insightsData);
      }
      return [];
    } catch (error) {
      console.error('[DashMemory] Failed to get memory insights:', error);
      return [];
    }
  }

  /**
   * Clear all memory (for debugging)
   */
  public async clearAllMemory(): Promise<void> {
    this.memoryCache.clear();
    this.embeddingsCache.clear();
    this.memoryIndex.clear();
    this.entityIndex.clear();
    
    await AsyncStorage.multiRemove([
      DashAdvancedMemory.MEMORY_KEY,
      DashAdvancedMemory.EMBEDDINGS_KEY,
      DashAdvancedMemory.INDEX_KEY,
      DashAdvancedMemory.INSIGHTS_KEY
    ]);
    
    console.log('[DashMemory] Cleared all memory');
  }
}