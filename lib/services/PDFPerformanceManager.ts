/**
 * PDF Performance Manager
 * 
 * Handles caching, background generation, progress tracking,
 * cloud storage integration, and performance optimizations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { assertSupabase } from '../supabase';
import { generateCorrelationId, trackAssistantEvent, trackAssistantPerformance } from '../monitoring';
import { getCurrentSession } from '../sessionManager';
import type { PDFDocument, PDFGenerationProgress } from './EnhancedPDFEngine';

// ====================================================================
// PERFORMANCE TYPES
// ====================================================================

export interface PDFCache {
  id: string;
  documentId: string;
  version: string;
  uri: string;
  size: number;
  mimeType: string;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  metadata: {
    pages: number;
    template: string;
    quality: string;
    format: string;
  };
  expiresAt?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface BackgroundTask {
  id: string;
  type: 'generate_pdf' | 'upload_cloud' | 'optimize_images' | 'process_annotations' | 'create_thumbnails';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  data: any;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
  correlationId: string;
}

export interface CloudStorageConfig {
  provider: 'supabase' | 'aws_s3' | 'google_cloud' | 'azure_blob';
  bucket: string;
  region?: string;
  cdnUrl?: string;
  compressionEnabled: boolean;
  encryption: 'none' | 'aes256' | 'kms';
  lifecycle: {
    deleteAfterDays?: number;
    transitionToIA?: number; // Infrequent Access
    transitionToGlacier?: number;
  };
}

export interface PerformanceMetrics {
  documentId: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  cacheHit?: boolean;
  fileSize?: number;
  resourceUsage: {
    memoryPeak: number;
    cpuTime: number;
    networkBytes?: number;
  };
  errors?: string[];
}

export interface OptimizationSettings {
  enableCaching: boolean;
  cacheMaxSize: number; // MB
  cacheTTL: number; // hours
  enablePrecompiling: boolean;
  enableLazyLoading: boolean;
  compressionLevel: 1 | 2 | 3 | 4 | 5; // 1=fast, 5=best compression
  imageQuality: number; // 0.1-1.0
  enableCloudStorage: boolean;
  prefetchCommonTemplates: boolean;
  enableBackgroundProcessing: boolean;
}

export interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  pages?: number[]; // Which pages to generate thumbnails for
}

// ====================================================================
// PDF PERFORMANCE MANAGER
// ====================================================================

export class PDFPerformanceManager {
  private supabase = assertSupabase();
  private cache = new Map<string, PDFCache>();
  private backgroundTasks = new Map<string, BackgroundTask>();
  private performanceMetrics: PerformanceMetrics[] = [];
  private taskQueue: BackgroundTask[] = [];
  private isProcessingQueue = false;

  private readonly settings: OptimizationSettings = {
    enableCaching: true,
    cacheMaxSize: 500, // 500 MB
    cacheTTL: 24, // 24 hours
    enablePrecompiling: true,
    enableLazyLoading: true,
    compressionLevel: 3,
    imageQuality: 0.8,
    enableCloudStorage: true,
    prefetchCommonTemplates: true,
    enableBackgroundProcessing: true
  };

  private readonly cloudConfig: CloudStorageConfig = {
    provider: 'supabase',
    bucket: 'pdf-documents',
    compressionEnabled: true,
    encryption: 'aes256',
    lifecycle: {
      deleteAfterDays: 90,
      transitionToIA: 30
    }
  };

  constructor() {
    this.initializePerformanceManager();
  }

  // ====================================================================
  // INITIALIZATION
  // ====================================================================

  private async initializePerformanceManager(): Promise<void> {
    try {
      await this.loadCacheFromStorage();
      await this.cleanExpiredCache();
      
      if (this.settings.prefetchCommonTemplates) {
        await this.prefetchCommonTemplates();
      }
      
      if (this.settings.enableBackgroundProcessing) {
        this.startBackgroundTaskProcessor();
      }

      trackAssistantEvent('pdf.performance.initialized', {
        correlation_id: generateCorrelationId(),
        cache_enabled: this.settings.enableCaching,
        cloud_storage: this.settings.enableCloudStorage,
        background_processing: this.settings.enableBackgroundProcessing
      });

    } catch (error) {
      console.error('Failed to initialize PDF Performance Manager:', error);
    }
  }

  // ====================================================================
  // CACHING SYSTEM
  // ====================================================================

  async getCachedPDF(
    documentId: string,
    version: string,
    options?: { format?: string; quality?: string }
  ): Promise<PDFCache | null> {
    if (!this.settings.enableCaching) return null;

    const cacheKey = this.generateCacheKey(documentId, version, options);
    let cachedItem = this.cache.get(cacheKey);

    if (!cachedItem) {
      // Try to load from persistent storage
      cachedItem = await this.loadCacheItem(cacheKey);
      if (cachedItem) {
        this.cache.set(cacheKey, cachedItem);
      }
    }

    if (cachedItem && !this.isCacheExpired(cachedItem)) {
      // Update access tracking
      cachedItem.lastAccessed = Date.now();
      cachedItem.accessCount += 1;
      await this.saveCacheItem(cachedItem);

      trackAssistantEvent('pdf.cache.hit', {
        correlation_id: generateCorrelationId(),
        document_id: documentId,
        cache_key: cacheKey,
        access_count: cachedItem.accessCount
      });

      return cachedItem;
    }

    // Cache miss or expired
    if (cachedItem) {
      await this.removeCacheItem(cacheKey);
    }

    return null;
  }

  async setCachedPDF(
    documentId: string,
    version: string,
    uri: string,
    metadata: PDFCache['metadata'],
    options?: { 
      priority?: PDFCache['priority']; 
      ttl?: number; 
      format?: string; 
      quality?: string;
    }
  ): Promise<void> {
    if (!this.settings.enableCaching) return;

    const cacheKey = this.generateCacheKey(documentId, version, options);
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error(`File not found: ${uri}`);
    }

    const cacheItem: PDFCache = {
      id: cacheKey,
      documentId,
      version,
      uri,
      size: fileInfo.size || 0,
      mimeType: 'application/pdf',
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      metadata,
      expiresAt: options?.ttl 
        ? Date.now() + (options.ttl * 60 * 60 * 1000) 
        : Date.now() + (this.settings.cacheTTL * 60 * 60 * 1000),
      priority: options?.priority || 'medium'
    };

    // Check cache size limits
    await this.enforceCacheSizeLimit(cacheItem.size);

    // Store in memory and persistent storage
    this.cache.set(cacheKey, cacheItem);
    await this.saveCacheItem(cacheItem);

    // Upload to cloud storage in background if enabled
    if (this.settings.enableCloudStorage) {
      await this.queueBackgroundTask({
        type: 'upload_cloud',
        priority: this.getPriorityScore(cacheItem.priority),
        data: {
          cacheKey,
          uri,
          documentId,
          version
        }
      });
    }

    trackAssistantEvent('pdf.cache.set', {
      correlation_id: generateCorrelationId(),
      document_id: documentId,
      cache_key: cacheKey,
      size: cacheItem.size,
      ttl: options?.ttl || this.settings.cacheTTL
    });
  }

  private generateCacheKey(
    documentId: string, 
    version: string, 
    options?: any
  ): string {
    const optionsHash = options 
      ? JSON.stringify(options).replace(/[^a-zA-Z0-9]/g, '') 
      : 'default';
    return `pdf_${documentId}_${version}_${optionsHash}`;
  }

  private isCacheExpired(cacheItem: PDFCache): boolean {
    return cacheItem.expiresAt ? Date.now() > cacheItem.expiresAt : false;
  }

  private async enforceCacheSizeLimit(newItemSize: number): Promise<void> {
    const maxSizeBytes = this.settings.cacheMaxSize * 1024 * 1024;
    let currentSize = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.size, 0);

    if (currentSize + newItemSize > maxSizeBytes) {
      // Remove least recently used items
      const sortedItems = Array.from(this.cache.values())
        .sort((a, b) => a.lastAccessed - b.lastAccessed);

      for (const item of sortedItems) {
        if (currentSize + newItemSize <= maxSizeBytes) break;

        await this.removeCacheItem(item.id);
        currentSize -= item.size;
      }
    }
  }

  // ====================================================================
  // BACKGROUND TASK PROCESSING
  // ====================================================================

  async queueBackgroundTask(taskData: {
    type: BackgroundTask['type'];
    priority: number;
    data: any;
    maxRetries?: number;
  }): Promise<string> {
    const task: BackgroundTask = {
      id: generateCorrelationId(),
      type: taskData.type,
      status: 'queued',
      priority: taskData.priority,
      createdAt: Date.now(),
      progress: 0,
      data: taskData.data,
      retries: 0,
      maxRetries: taskData.maxRetries || 3,
      correlationId: generateCorrelationId()
    };

    this.backgroundTasks.set(task.id, task);
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    trackAssistantEvent('pdf.background_task.queued', {
      correlation_id: task.correlationId,
      task_id: task.id,
      task_type: task.type,
      priority: task.priority
    });

    // Start processor if not running
    if (!this.isProcessingQueue) {
      this.processTaskQueue();
    }

    return task.id;
  }

  private async processTaskQueue(): Promise<void> {
    if (this.isProcessingQueue || this.taskQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task || task.status !== 'queued') continue;

      try {
        await this.executeBackgroundTask(task);
      } catch (error) {
        console.error(`Background task ${task.id} failed:`, error);
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  private async executeBackgroundTask(task: BackgroundTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      task.status = 'running';
      task.startedAt = Date.now();
      this.backgroundTasks.set(task.id, task);

      let result: any;

      switch (task.type) {
        case 'generate_pdf':
          result = await this.backgroundGeneratePDF(task);
          break;

        case 'upload_cloud':
          result = await this.backgroundUploadToCloud(task);
          break;

        case 'optimize_images':
          result = await this.backgroundOptimizeImages(task);
          break;

        case 'create_thumbnails':
          result = await this.backgroundCreateThumbnails(task);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      task.status = 'completed';
      task.completedAt = Date.now();
      task.progress = 100;
      task.result = result;

      trackAssistantEvent('pdf.background_task.completed', {
        correlation_id: task.correlationId,
        task_type: task.type,
        duration: task.completedAt - task.startedAt!,
        retries: task.retries
      });

    } catch (error) {
      task.retries += 1;
      
      if (task.retries >= task.maxRetries) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
        
        trackAssistantEvent('pdf.background_task.failed', {
          correlation_id: task.correlationId,
          task_id: task.id,
          error: task.error,
          retries: task.retries
        });
      } else {
        // Retry with exponential backoff
        task.status = 'queued';
        const delay = Math.pow(2, task.retries) * 1000;
        
        setTimeout(() => {
          this.taskQueue.unshift(task);
          this.taskQueue.sort((a, b) => b.priority - a.priority);
        }, delay);
      }
    }

    this.backgroundTasks.set(task.id, task);
  }

  // ====================================================================
  // BACKGROUND TASK IMPLEMENTATIONS
  // ====================================================================

  private async backgroundGeneratePDF(task: BackgroundTask): Promise<any> {
    const { document, options } = task.data;
    
    // This would integrate with the EnhancedPDFEngine
    // Simplified implementation for now
    task.progress = 50;
    
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    task.progress = 100;
    
    return {
      uri: `file://generated-pdf-${task.id}.pdf`,
      size: 1024 * 100, // 100KB
      pages: 5
    };
  }

  private async backgroundUploadToCloud(task: BackgroundTask): Promise<any> {
    const { cacheKey, uri, documentId, version } = task.data;
    
    // Upload to Supabase storage
    const fileName = `pdfs/${documentId}/${version}/${cacheKey}.pdf`;
    
    try {
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const { data, error } = await this.supabase.storage
        .from(this.cloudConfig.bucket)
        .upload(fileName, fileData, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: publicURL } = this.supabase.storage
        .from(this.cloudConfig.bucket)
        .getPublicUrl(fileName);

      return {
        cloudPath: fileName,
        publicUrl: publicURL.publicUrl,
        uploadedAt: Date.now()
      };

    } catch (error) {
      throw new Error(`Cloud upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async backgroundOptimizeImages(task: BackgroundTask): Promise<any> {
    // Image optimization would be implemented here
    // This is a placeholder
    return {
      optimized: true,
      originalSize: 1024 * 500,
      optimizedSize: 1024 * 200,
      compressionRatio: 0.4
    };
  }

  private async backgroundCreateThumbnails(task: BackgroundTask): Promise<any> {
    const { uri, pages, config } = task.data as {
      uri: string;
      pages: number[];
      config: ThumbnailConfig;
    };

    // Thumbnail generation would be implemented here
    // This is a placeholder
    const thumbnails = pages.map(page => ({
      page,
      uri: `file://thumbnail-${task.id}-page-${page}.${config.format}`,
      width: config.width,
      height: config.height
    }));

    return { thumbnails };
  }

  // ====================================================================
  // PERFORMANCE MONITORING
  // ====================================================================

  async trackPerformanceMetric(metric: Omit<PerformanceMetrics, 'duration'>): Promise<void> {
    const completeMetric: PerformanceMetrics = {
      ...metric,
      duration: metric.endTime - metric.startTime
    };

    this.performanceMetrics.push(completeMetric);

    // Store in database
    await this.supabase
      .from('pdf_performance_metrics')
      .insert({
        document_id: completeMetric.documentId,
        operation: completeMetric.operation,
        start_time: new Date(completeMetric.startTime).toISOString(),
        end_time: new Date(completeMetric.endTime).toISOString(),
        duration: completeMetric.duration,
        success: completeMetric.success,
        cache_hit: completeMetric.cacheHit,
        file_size: completeMetric.fileSize,
        resource_usage: completeMetric.resourceUsage,
        errors: completeMetric.errors
      });

    // Clean old metrics (keep last 1000)
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  getPerformanceAnalytics(timeRangeHours: number = 24): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    cacheHitRate: number;
    commonErrors: string[];
    resourceUsage: {
      averageMemory: number;
      averageCPU: number;
    };
  } {
    const cutoffTime = Date.now() - (timeRangeHours * 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(m => m.startTime >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        commonErrors: [],
        resourceUsage: {
          averageMemory: 0,
          averageCPU: 0
        }
      };
    }

    const successCount = recentMetrics.filter(m => m.success).length;
    const cacheHitCount = recentMetrics.filter(m => m.cacheHit).length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    
    const errors = recentMetrics
      .flatMap(m => m.errors || [])
      .reduce((acc, error) => {
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const commonErrors = Object.entries(errors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);

    const totalMemory = recentMetrics.reduce((sum, m) => sum + m.resourceUsage.memoryPeak, 0);
    const totalCPU = recentMetrics.reduce((sum, m) => sum + m.resourceUsage.cpuTime, 0);

    return {
      totalOperations: recentMetrics.length,
      successRate: successCount / recentMetrics.length,
      averageDuration: totalDuration / recentMetrics.length,
      cacheHitRate: cacheHitCount / recentMetrics.length,
      commonErrors,
      resourceUsage: {
        averageMemory: totalMemory / recentMetrics.length,
        averageCPU: totalCPU / recentMetrics.length
      }
    };
  }

  // ====================================================================
  // CLOUD STORAGE INTEGRATION
  // ====================================================================

  async uploadToCloud(
    documentId: string,
    uri: string,
    metadata: any
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      const fileName = `pdfs/${documentId}/${Date.now()}.pdf`;
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const { data, error } = await this.supabase.storage
        .from(this.cloudConfig.bucket)
        .upload(fileName, fileData, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) throw error;

      const { data: publicURL } = this.supabase.storage
        .from(this.cloudConfig.bucket)
        .getPublicUrl(fileName);

      await this.trackPerformanceMetric({
        documentId,
        operation: 'cloud_upload',
        startTime,
        endTime: Date.now(),
        success: true,
        resourceUsage: {
          memoryPeak: 0,
          cpuTime: 0,
          networkBytes: fileData.length
        }
      });

      return publicURL.publicUrl;

    } catch (error) {
      await this.trackPerformanceMetric({
        documentId,
        operation: 'cloud_upload',
        startTime,
        endTime: Date.now(),
        success: false,
        resourceUsage: {
          memoryPeak: 0,
          cpuTime: 0
        },
        errors: [error instanceof Error ? error.message : 'Upload failed']
      });

      throw error;
    }
  }

  async downloadFromCloud(cloudUrl: string): Promise<string> {
    const startTime = Date.now();
    const fileName = `downloaded_${Date.now()}.pdf`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;

    try {
      const downloadResult = await FileSystem.downloadAsync(cloudUrl, localUri);
      
      await this.trackPerformanceMetric({
        documentId: 'cloud_download',
        operation: 'cloud_download',
        startTime,
        endTime: Date.now(),
        success: true,
        fileSize: downloadResult.status === 200 ? 0 : undefined,
        resourceUsage: {
          memoryPeak: 0,
          cpuTime: 0,
          networkBytes: 0 // Would need to track actual bytes
        }
      });

      return downloadResult.uri;

    } catch (error) {
      await this.trackPerformanceMetric({
        documentId: 'cloud_download',
        operation: 'cloud_download',
        startTime,
        endTime: Date.now(),
        success: false,
        resourceUsage: {
          memoryPeak: 0,
          cpuTime: 0
        },
        errors: [error instanceof Error ? error.message : 'Download failed']
      });

      throw error;
    }
  }

  // ====================================================================
  // OPTIMIZATION FEATURES
  // ====================================================================

  async precompileCommonTemplates(): Promise<void> {
    const commonTemplates = ['educational-standard', 'playful-kids'];
    
    for (const templateId of commonTemplates) {
      await this.queueBackgroundTask({
        type: 'generate_pdf',
        priority: this.getPriorityScore('low'),
        data: {
          templateId,
          precompile: true
        }
      });
    }
  }

  async optimizeForDevice(): Promise<void> {
    // Device-specific optimizations
    if (Platform.OS === 'ios') {
      // iOS-specific optimizations
      this.settings.compressionLevel = 4;
      this.settings.imageQuality = 0.9;
    } else if (Platform.OS === 'android') {
      // Android-specific optimizations
      this.settings.compressionLevel = 3;
      this.settings.imageQuality = 0.8;
    }
  }

  async generateThumbnails(
    documentId: string,
    uri: string,
    config: ThumbnailConfig = {
      width: 200,
      height: 280,
      quality: 0.8,
      format: 'jpeg',
      pages: [1] // First page only
    }
  ): Promise<string[]> {
    const taskId = await this.queueBackgroundTask({
      type: 'create_thumbnails',
      priority: this.getPriorityScore('medium'),
      data: {
        documentId,
        uri,
        pages: config.pages || [1],
        config
      }
    });

    // Wait for completion (simplified - in reality you'd use callbacks/promises)
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const task = this.backgroundTasks.get(taskId);
        if (!task) {
          reject(new Error('Task not found'));
          return;
        }

        if (task.status === 'completed') {
          resolve(task.result?.thumbnails?.map((t: any) => t.uri) || []);
        } else if (task.status === 'failed') {
          reject(new Error(task.error || 'Thumbnail generation failed'));
        } else {
          setTimeout(checkStatus, 1000);
        }
      };

      checkStatus();
    });
  }

  // ====================================================================
  // UTILITY METHODS
  // ====================================================================

  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem('pdf_performance_cache');
      if (cacheData) {
        const items: PDFCache[] = JSON.parse(cacheData);
        items.forEach(item => {
          if (!this.isCacheExpired(item)) {
            this.cache.set(item.id, item);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private async saveCacheItem(item: PDFCache): Promise<void> {
    try {
      const allItems = Array.from(this.cache.values());
      await AsyncStorage.setItem('pdf_performance_cache', JSON.stringify(allItems));
    } catch (error) {
      console.warn('Failed to save cache item:', error);
    }
  }

  private async loadCacheItem(cacheKey: string): Promise<PDFCache | null> {
    try {
      const itemData = await AsyncStorage.getItem(`pdf_cache_${cacheKey}`);
      return itemData ? JSON.parse(itemData) : null;
    } catch (error) {
      return null;
    }
  }

  private async removeCacheItem(cacheKey: string): Promise<void> {
    this.cache.delete(cacheKey);
    try {
      await AsyncStorage.removeItem(`pdf_cache_${cacheKey}`);
    } catch (error) {
      console.warn('Failed to remove cache item:', error);
    }
  }

  private async cleanExpiredCache(): Promise<void> {
    const expiredKeys: string[] = [];
    
    for (const entry of Array.from(this.cache.entries())) {
      const [key, item] = entry;
      if (this.isCacheExpired(item)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.removeCacheItem(key);
    }

    if (expiredKeys.length > 0) {
      trackAssistantEvent('pdf.cache.cleanup', {
        correlation_id: generateCorrelationId(),
        expired_items: expiredKeys.length
      });
    }
  }

  private async prefetchCommonTemplates(): Promise<void> {
    // This would prefetch and cache common templates
    await this.precompileCommonTemplates();
  }

  private startBackgroundTaskProcessor(): void {
    // Start periodic task processing
    setInterval(() => {
      if (!this.isProcessingQueue && this.taskQueue.length > 0) {
        this.processTaskQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  private getPriorityScore(priority: PDFCache['priority']): number {
    switch (priority) {
      case 'critical': return 100;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  // ====================================================================
  // PUBLIC API METHODS
  // ====================================================================

  getTaskStatus(taskId: string): BackgroundTask | null {
    return this.backgroundTasks.get(taskId) || null;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem('pdf_performance_cache');
    
    trackAssistantEvent('pdf.cache.cleared', {
      correlation_id: generateCorrelationId()
    });
  }

  getCacheStats(): {
    totalItems: number;
    totalSize: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    const items = Array.from(this.cache.values());
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const totalAccess = items.reduce((sum, item) => sum + item.accessCount, 0);
    const hitCount = items.filter(item => item.accessCount > 1).length;

    return {
      totalItems: items.length,
      totalSize,
      hitRate: items.length > 0 ? hitCount / items.length : 0,
      oldestItem: items.length > 0 ? Math.min(...items.map(i => i.createdAt)) : 0,
      newestItem: items.length > 0 ? Math.max(...items.map(i => i.createdAt)) : 0
    };
  }

  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    Object.assign(this.settings, newSettings);
    
    trackAssistantEvent('pdf.performance.settings_updated', {
      correlation_id: generateCorrelationId(),
      settings: newSettings
    });
  }

  getSettings(): OptimizationSettings {
    return { ...this.settings };
  }
}

// Export singleton instance
export const pdfPerformanceManager = new PDFPerformanceManager();