/**
 * PDF Collaboration Manager
 * 
 * Manages sharing, version control, collaborative editing,
 * and comment system for PDF documents.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { assertSupabase } from '../supabase';
import { generateCorrelationId, trackAssistantEvent } from '../monitoring';
import { getCurrentSession } from '../sessionManager';
// @ts-ignore - PDFAnnotation type from preview system
import type { PDFAnnotation } from '../../components/PDFPreviewSystem';

// ====================================================================
// COLLABORATION TYPES
// ====================================================================

export interface PDFDocument {
  id: string;
  name: string;
  title?: string;
  data: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  content?: any[];
}

export interface PDFVersion {
  id: string;
  documentId: string;
  version: string;
  data: string;
  metadata: any;
  createdBy: string;
  createdAt: number;
  changeLog?: string[];
  parentVersion?: string;
  changes?: any;
  author?: string;
  size?: number;
  uri?: string;
}

export interface PDFShare {
  id: string;
  documentId: string;
  shareToken: string;
  sharedBy: string;
  sharedWith?: string; // email or userId
  permissions: SharePermissions;
  expiresAt?: number;
  createdAt: number;
  accessCount: number;
  lastAccessAt?: number;
  message?: string;
}

export interface SharePermissions {
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  canShare: boolean;
  canDownload: boolean;
  canPrint: boolean;
}

export interface PDFComment {
  id: string;
  documentId: string;
  page: number;
  x: number;
  y: number;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: number;
  modifiedAt?: number;
  replies: PDFCommentReply[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface PDFCommentReply {
  id: string;
  commentId: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: number;
  modifiedAt?: number;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  participants: Participant[];
  startedAt: number;
  endedAt?: number;
  changes: CollaborationChange[];
}

export interface Participant {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  joinedAt: number;
  lastActiveAt: number;
  online: boolean;
  cursor?: {
    page: number;
    x: number;
    y: number;
  };
}

export interface CollaborationChange {
  id: string;
  type: 'content' | 'comment' | 'annotation' | 'permission';
  author: string;
  timestamp: number;
  description: string;
  data: any;
  reverted?: boolean;
}

export interface VersionComparison {
  documentId: string;
  fromVersion: string;
  toVersion: string;
  changes: VersionChange[];
  generatedAt: number;
}

export interface VersionChange {
  type: 'added' | 'removed' | 'modified';
  location: {
    page?: number;
    blockId?: string;
  };
  content: {
    before?: any;
    after?: any;
  };
  description: string;
}

// ====================================================================
// PDF COLLABORATION MANAGER
// ====================================================================

export class PDFCollaborationManager {
  private supabase = assertSupabase();
  private activeSessions = new Map<string, CollaborationSession>();
  private shareCache = new Map<string, PDFShare>();

  // ====================================================================
  // SHARING & ACCESS CONTROL
  // ====================================================================

  async shareDocument(
    documentId: string,
    permissions: SharePermissions,
    options?: {
      email?: string;
      message?: string;
      expiresIn?: number; // hours
      requireAuth?: boolean;
    }
  ): Promise<PDFShare> {
    const correlationId = generateCorrelationId();
    const session = await getCurrentSession();
    
    if (!session?.user_id) {
      throw new Error('Authentication required to share documents');
    }

    trackAssistantEvent('pdf.share.create', {
      correlation_id: correlationId,
      document_id: documentId,
      permissions,
      expires_in: options?.expiresIn,
      shared_with_email: !!options?.email
    });

    const shareToken = this.generateShareToken();
    const expiresAt = options?.expiresIn 
      ? Date.now() + (options.expiresIn * 60 * 60 * 1000)
      : undefined;

    const share: PDFShare = {
      id: correlationId,
      documentId,
      shareToken,
      sharedBy: session.user_id,
      sharedWith: options?.email,
      permissions,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      message: options?.message
    };

    // Store in Supabase
    const { error } = await this.supabase
      .from('pdf_shares')
      .insert({
        id: share.id,
        document_id: share.documentId,
        share_token: share.shareToken,
        shared_by: share.sharedBy,
        shared_with: share.sharedWith,
        permissions: share.permissions,
        expires_at: share.expiresAt ? new Date(share.expiresAt).toISOString() : null,
        message: share.message,
        created_at: new Date(share.createdAt).toISOString(),
        access_count: 0
      });

    if (error) {
      throw new Error(`Failed to create share: ${error.message}`);
    }

    // Cache the share
    this.shareCache.set(share.shareToken, share);

    // Send email notification if specified
    if (options?.email) {
      await this.sendShareNotification(share);
    }

    return share;
  }

  async accessSharedDocument(shareToken: string): Promise<{ share: PDFShare; document: PDFDocument }> {
    let share = this.shareCache.get(shareToken);
    
    if (!share) {
      const { data, error } = await this.supabase
        .from('pdf_shares')
        .select('*')
        .eq('share_token', shareToken)
        .single();

      if (error || !data) {
        throw new Error('Invalid or expired share link');
      }

      share = {
        id: data.id,
        documentId: data.document_id,
        shareToken: data.share_token,
        sharedBy: data.shared_by,
        sharedWith: data.shared_with,
        permissions: data.permissions,
        expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
        createdAt: new Date(data.created_at).getTime(),
        accessCount: data.access_count || 0,
        lastAccessAt: data.last_access_at ? new Date(data.last_access_at).getTime() : undefined,
        message: data.message
      };
    }

    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt) {
      throw new Error('Share link has expired');
    }

    // Update access count
    await this.updateShareAccess(share);

    // Load document (simplified - would need to integrate with PDFEngine)
    const document = await this.loadSharedDocument(share.documentId);

    trackAssistantEvent('pdf.share.access', {
      correlation_id: generateCorrelationId(),
      share_id: share.id,
      document_id: share.documentId,
      permissions: share.permissions
    });

    return { share, document };
  }

  private async updateShareAccess(share: PDFShare): Promise<void> {
    const now = Date.now();
    share.accessCount += 1;
    share.lastAccessAt = now;

    await this.supabase
      .from('pdf_shares')
      .update({
        access_count: share.accessCount,
        last_access_at: new Date(now).toISOString()
      })
      .eq('id', share.id);

    this.shareCache.set(share.shareToken, share);
  }

  private async loadSharedDocument(documentId: string): Promise<PDFDocument> {
    // This would integrate with the PDFEngine to load the document
    // For now, return a placeholder
    return {
      id: documentId,
      title: 'Shared Document',
      content: [],
      metadata: {
        author: 'Unknown',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        version: '1.0.0'
      },
      template: {} as any,
      settings: {} as any,
      status: 'ready',
      versions: [],
      permissions: {} as any
    };
  }

  // ====================================================================
  // VERSION CONTROL
  // ====================================================================

  async createVersion(
    documentId: string,
    changes: string[],
    author?: string
  ): Promise<PDFVersion> {
    const correlationId = generateCorrelationId();
    const session = await getCurrentSession();
    
    const version: PDFVersion = {
      id: correlationId,
      version: await this.generateVersionNumber(documentId),
      createdAt: Date.now(),
      changes,
      author: author || session?.email || 'Anonymous',
      size: 0 // Would be calculated from actual document
    };

    // Store version in Supabase
    const { error } = await this.supabase
      .from('pdf_versions')
      .insert({
        id: version.id,
        document_id: documentId,
        version: version.version,
        changes: version.changes,
        author: version.author,
        size: version.size,
        created_at: new Date(version.createdAt).toISOString()
      });

    if (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }

    trackAssistantEvent('pdf.version.create', {
      correlation_id: correlationId,
      document_id: documentId,
      version: version.version,
      changes_count: changes.length
    });

    return version;
  }

  async getVersionHistory(documentId: string): Promise<PDFVersion[]> {
    const { data, error } = await this.supabase
      .from('pdf_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load version history: ${error.message}`);
    }

    return data.map(row => ({
      id: row.id,
      version: row.version,
      createdAt: new Date(row.created_at).getTime(),
      changes: row.changes || [],
      author: row.author,
      size: row.size,
      uri: row.file_uri
    }));
  }

  async compareVersions(
    documentId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<VersionComparison> {
    const correlationId = generateCorrelationId();
    
    // Load both versions
    const [from, to] = await Promise.all([
      this.getVersion(documentId, fromVersion),
      this.getVersion(documentId, toVersion)
    ]);

    if (!from || !to) {
      throw new Error('One or both versions not found');
    }

    // Generate comparison (simplified)
    const changes: VersionChange[] = [
      {
        type: 'modified',
        location: { page: 1 },
        content: {
          before: `Version ${fromVersion}`,
          after: `Version ${toVersion}`
        },
        description: `Updated from ${fromVersion} to ${toVersion}`
      }
    ];

    const comparison: VersionComparison = {
      documentId,
      fromVersion,
      toVersion,
      changes,
      generatedAt: Date.now()
    };

    trackAssistantEvent('pdf.version.compare', {
      correlation_id: correlationId,
      document_id: documentId,
      from_version: fromVersion,
      to_version: toVersion,
      changes_count: changes.length
    });

    return comparison;
  }

  private async getVersion(documentId: string, version: string): Promise<PDFVersion | null> {
    const { data, error } = await this.supabase
      .from('pdf_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('version', version)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      version: data.version,
      createdAt: new Date(data.created_at).getTime(),
      changes: data.changes || [],
      author: data.author,
      size: data.size,
      uri: data.file_uri
    };
  }

  private async generateVersionNumber(documentId: string): Promise<string> {
    const versions = await this.getVersionHistory(documentId);
    const latest = versions[0];
    
    if (!latest) return '1.0.0';
    
    // Simple version increment (major.minor.patch)
    const [major, minor, patch] = latest.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  // ====================================================================
  // COMMENTING SYSTEM
  // ====================================================================

  async addComment(
    documentId: string,
    page: number,
    x: number,
    y: number,
    content: string
  ): Promise<PDFComment> {
    const correlationId = generateCorrelationId();
    const session = await getCurrentSession();
    
    if (!session?.user_id) {
      throw new Error('Authentication required to add comments');
    }

    const comment: PDFComment = {
      id: correlationId,
      documentId,
      page,
      x,
      y,
      content,
      author: {
        id: session.user_id,
        name: 'User', // Would need to get from profile
        email: session.email || 'unknown@example.com',
        avatar: undefined
      },
      createdAt: Date.now(),
      replies: [],
      resolved: false
    };

    const { error } = await this.supabase
      .from('pdf_comments')
      .insert({
        id: comment.id,
        document_id: comment.documentId,
        page: comment.page,
        x: comment.x,
        y: comment.y,
        content: comment.content,
        author_id: comment.author.id,
        author_name: comment.author.name,
        author_email: comment.author.email,
        author_avatar: comment.author.avatar,
        created_at: new Date(comment.createdAt).toISOString(),
        resolved: false
      });

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    trackAssistantEvent('pdf.comment.add', {
      correlation_id: correlationId,
      document_id: documentId,
      page,
      author: comment.author.email
    });

    return comment;
  }

  async getComments(documentId: string, page?: number): Promise<PDFComment[]> {
    let query = this.supabase
      .from('pdf_comments')
      .select(`
        *,
        pdf_comment_replies (
          id,
          content,
          author_id,
          author_name,
          author_email,
          author_avatar,
          created_at,
          modified_at
        )
      `)
      .eq('document_id', documentId);

    if (page !== undefined) {
      query = query.eq('page', page);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load comments: ${error.message}`);
    }

    return data.map(row => ({
      id: row.id,
      documentId: row.document_id,
      page: row.page,
      x: row.x,
      y: row.y,
      content: row.content,
      author: {
        id: row.author_id,
        name: row.author_name,
        email: row.author_email,
        avatar: row.author_avatar
      },
      createdAt: new Date(row.created_at).getTime(),
      modifiedAt: row.modified_at ? new Date(row.modified_at).getTime() : undefined,
      replies: (row.pdf_comment_replies || []).map((reply: any) => ({
        id: reply.id,
        commentId: row.id,
        content: reply.content,
        author: {
          id: reply.author_id,
          name: reply.author_name,
          email: reply.author_email,
          avatar: reply.author_avatar
        },
        createdAt: new Date(reply.created_at).getTime(),
        modifiedAt: reply.modified_at ? new Date(reply.modified_at).getTime() : undefined
      })),
      resolved: row.resolved,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : undefined
    }));
  }

  async resolveComment(commentId: string): Promise<void> {
    const session = await getCurrentSession();
    
    if (!session?.user_id) {
      throw new Error('Authentication required to resolve comments');
    }

    const { error } = await this.supabase
      .from('pdf_comments')
      .update({
        resolved: true,
        resolved_by: session.user_id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to resolve comment: ${error.message}`);
    }

    trackAssistantEvent('pdf.comment.resolve', {
      correlation_id: generateCorrelationId(),
      comment_id: commentId,
      resolved_by: session.email || 'unknown'
    });
  }

  // ====================================================================
  // COLLABORATION SESSIONS
  // ====================================================================

  async startCollaborationSession(documentId: string): Promise<CollaborationSession> {
    const correlationId = generateCorrelationId();
    const session = await getCurrentSession();
    
    if (!session?.user_id) {
      throw new Error('Authentication required for collaboration');
    }

    const collaborationSession: CollaborationSession = {
      id: correlationId,
      documentId,
      participants: [{
        userId: session.user_id,
        name: 'User', // Would get from profile
        email: session.email || 'unknown@example.com',
        avatar: undefined,
        role: 'owner',
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        online: true
      }],
      startedAt: Date.now(),
      changes: []
    };

    this.activeSessions.set(collaborationSession.id, collaborationSession);

    trackAssistantEvent('pdf.collaboration.start', {
      correlation_id: correlationId,
      document_id: documentId,
      session_id: collaborationSession.id
    });

    return collaborationSession;
  }

  async joinCollaborationSession(
    sessionId: string,
    permissions: SharePermissions
  ): Promise<Participant> {
    const session = await getCurrentSession();
    
    if (!session?.user_id) {
      throw new Error('Authentication required to join collaboration');
    }

    const collaborationSession = this.activeSessions.get(sessionId);
    if (!collaborationSession) {
      throw new Error('Collaboration session not found');
    }

    const participant: Participant = {
      userId: session.user_id,
      name: 'User', // Would get from profile
      email: session.email || 'unknown@example.com',
      avatar: undefined,
      role: permissions.canEdit ? 'editor' : (permissions.canComment ? 'commenter' : 'viewer'),
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      online: true
    };

    collaborationSession.participants.push(participant);

    trackAssistantEvent('pdf.collaboration.join', {
      correlation_id: generateCorrelationId(),
      session_id: sessionId,
      participant: participant.email,
      role: participant.role
    });

    return participant;
  }

  // ====================================================================
  // UTILITY METHODS
  // ====================================================================

  private generateShareToken(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async sendShareNotification(share: PDFShare): Promise<void> {
    // Integration with email service would go here
    console.log(`Share notification would be sent to ${share.sharedWith}`);
  }

  // ====================================================================
  // PUBLIC API METHODS
  // ====================================================================

  async revokeShare(shareId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pdf_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      throw new Error(`Failed to revoke share: ${error.message}`);
    }

    // Remove from cache
    const share = Array.from(this.shareCache.values()).find(s => s.id === shareId);
    if (share) {
      this.shareCache.delete(share.shareToken);
    }

    trackAssistantEvent('pdf.share.revoke', {
      correlation_id: generateCorrelationId(),
      share_id: shareId
    });
  }

  async getSharesByDocument(documentId: string): Promise<PDFShare[]> {
    const { data, error } = await this.supabase
      .from('pdf_shares')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load shares: ${error.message}`);
    }

    return data.map(row => ({
      id: row.id,
      documentId: row.document_id,
      shareToken: row.share_token,
      sharedBy: row.shared_by,
      sharedWith: row.shared_with,
      permissions: row.permissions,
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
      createdAt: new Date(row.created_at).getTime(),
      accessCount: row.access_count || 0,
      lastAccessAt: row.last_access_at ? new Date(row.last_access_at).getTime() : undefined,
      message: row.message
    }));
  }

  getActiveSession(documentId: string): CollaborationSession | null {
    return Array.from(this.activeSessions.values())
      .find(session => session.documentId === documentId) || null;
  }

  async endCollaborationSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.endedAt = Date.now();
      this.activeSessions.delete(sessionId);

      trackAssistantEvent('pdf.collaboration.end', {
        correlation_id: generateCorrelationId(),
        session_id: sessionId,
        duration: session.endedAt - session.startedAt,
        participants_count: session.participants.length,
        changes_count: session.changes.length
      });
    }
  }
}

// Export singleton instance
export const pdfCollaborationManager = new PDFCollaborationManager();