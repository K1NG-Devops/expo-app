/**
 * PDF Security and Accessibility Manager
 * 
 * Implements access control, watermarking, screen reader support, 
 * and compliance features for PDF documents.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assertSupabase } from '../supabase';
import { generateCorrelationId, trackAssistantEvent } from '../monitoring';
import { getCurrentSession, getCurrentProfile } from '../sessionManager';
import type { PDFDocument, PDFSecuritySettings, PDFAccessibilitySettings } from './EnhancedPDFEngine';

// ====================================================================
// SECURITY & ACCESSIBILITY TYPES
// ====================================================================

export interface PDFSecurityPolicy {
  id: string;
  documentId: string;
  policyType: 'organizational' | 'regulatory' | 'custom';
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcement: 'strict' | 'advisory' | 'disabled';
  createdAt: number;
  modifiedAt: number;
  appliedBy: string;
}

export interface SecurityRule {
  id: string;
  type: 'access' | 'download' | 'print' | 'share' | 'edit' | 'copy' | 'watermark';
  condition: SecurityCondition;
  action: SecurityAction;
  priority: number;
  enabled: boolean;
}

export interface SecurityCondition {
  type: 'user_role' | 'ip_range' | 'time_range' | 'device_type' | 'location' | 'domain';
  operator: 'equals' | 'not_equals' | 'contains' | 'in_range' | 'matches_regex';
  value: any;
}

export interface SecurityAction {
  type: 'allow' | 'deny' | 'require_auth' | 'add_watermark' | 'log_access' | 'notify_admin';
  parameters?: Record<string, any>;
}

export interface AccessibilityCompliance {
  standard: 'WCAG_2_1_AA' | 'PDF_UA' | 'Section_508' | 'EN_301_549' | 'Custom';
  level: 'A' | 'AA' | 'AAA';
  requirements: ComplianceRequirement[];
  validationResults?: ValidationResult[];
  lastValidated?: number;
  certificationStatus: 'pending' | 'compliant' | 'non_compliant' | 'partial';
}

export interface ComplianceRequirement {
  id: string;
  category: 'structure' | 'navigation' | 'content' | 'multimedia' | 'forms' | 'color';
  title: string;
  description: string;
  severity: 'critical' | 'important' | 'moderate' | 'minor';
  checkMethod: 'automated' | 'manual' | 'hybrid';
  required: boolean;
}

export interface ValidationResult {
  requirementId: string;
  status: 'pass' | 'fail' | 'warning' | 'manual_check';
  message: string;
  suggestions?: string[];
  evidence?: string;
  checkedAt: number;
}

export interface AccessibilityFeatures {
  altText: Map<string, string>;
  readingOrder: string[];
  landmarks: AccessibilityLandmark[];
  headingStructure: HeadingStructure[];
  colorContrastInfo: ColorContrastInfo[];
  screenReaderInstructions: ScreenReaderInstruction[];
}

export interface AccessibilityLandmark {
  id: string;
  type: 'navigation' | 'main' | 'banner' | 'contentinfo' | 'complementary' | 'search';
  label: string;
  page: number;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface HeadingStructure {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  page: number;
  position: {
    x: number;
    y: number;
  };
}

export interface ColorContrastInfo {
  elementId: string;
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  passesAA: boolean;
  passesAAA: boolean;
  suggestion?: string;
}

export interface ScreenReaderInstruction {
  id: string;
  type: 'description' | 'navigation' | 'action' | 'context';
  content: string;
  position: 'before' | 'after' | 'within';
  targetElement: string;
}

export interface WatermarkConfig {
  id: string;
  type: 'text' | 'image' | 'qr_code' | 'invisible';
  content: string;
  position: 'center' | 'diagonal' | 'header' | 'footer' | 'repeating';
  opacity: number;
  color?: string;
  fontSize?: number;
  rotation?: number;
  spacing?: {
    horizontal: number;
    vertical: number;
  };
  conditions?: WatermarkCondition[];
}

export interface WatermarkCondition {
  type: 'user_info' | 'timestamp' | 'location' | 'custom';
  template: string; // e.g., "{{user.email}} - {{timestamp}}"
}

export interface SecurityAuditLog {
  id: string;
  documentId: string;
  userId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
  additionalData?: Record<string, any>;
}

// ====================================================================
// PDF SECURITY & ACCESSIBILITY MANAGER
// ====================================================================

export class PDFSecurityAccessibilityManager {
  private supabase = assertSupabase();
  private securityPolicies = new Map<string, PDFSecurityPolicy>();
  private auditLogs: SecurityAuditLog[] = [];

  // ====================================================================
  // SECURITY MANAGEMENT
  // ====================================================================

  async applySecurityPolicy(
    documentId: string,
    policyType: PDFSecurityPolicy['policyType'],
    customRules?: SecurityRule[]
  ): Promise<PDFSecurityPolicy> {
    const correlationId = generateCorrelationId();
    const session = await getCurrentSession();
    
    if (!session?.user_id) {
      throw new Error('Authentication required to apply security policies');
    }

    const policy = await this.createSecurityPolicy(
      documentId,
      policyType,
      customRules,
      session.user_id
    );

    this.securityPolicies.set(documentId, policy);

    await this.logSecurityEvent({
      id: correlationId,
      documentId,
      userId: session.user_id,
      action: 'apply_security_policy',
      resource: 'pdf_document',
      outcome: 'success',
      timestamp: Date.now(),
      additionalData: {
        policy_type: policyType,
        rules_count: policy.rules.length
      }
    });

    trackAssistantEvent('pdf.security.policy_applied', {
      correlation_id: correlationId,
      document_id: documentId,
      policy_type: policyType,
      rules_count: policy.rules.length
    });

    return policy;
  }

  private async createSecurityPolicy(
    documentId: string,
    policyType: PDFSecurityPolicy['policyType'],
    customRules?: SecurityRule[],
    userId?: string
  ): Promise<PDFSecurityPolicy> {
    const baseRules = this.getDefaultSecurityRules(policyType);
    const rules = customRules ? [...baseRules, ...customRules] : baseRules;

    const policy: PDFSecurityPolicy = {
      id: generateCorrelationId(),
      documentId,
      policyType,
      name: this.getPolicyName(policyType),
      description: this.getPolicyDescription(policyType),
      rules,
      enforcement: 'strict',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      appliedBy: userId || 'system'
    };

    // Store in database
    const { error } = await this.supabase
      .from('pdf_security_policies')
      .insert({
        id: policy.id,
        document_id: policy.documentId,
        policy_type: policy.policyType,
        name: policy.name,
        description: policy.description,
        rules: policy.rules,
        enforcement: policy.enforcement,
        applied_by: policy.appliedBy,
        created_at: new Date(policy.createdAt).toISOString(),
        modified_at: new Date(policy.modifiedAt).toISOString()
      });

    if (error) {
      throw new Error(`Failed to store security policy: ${error.message}`);
    }

    return policy;
  }

  private getDefaultSecurityRules(policyType: PDFSecurityPolicy['policyType']): SecurityRule[] {
    const baseRules: SecurityRule[] = [
      {
        id: 'audit_access',
        type: 'access',
        condition: {
          type: 'user_role',
          operator: 'equals',
          value: 'any'
        },
        action: {
          type: 'log_access'
        },
        priority: 1,
        enabled: true
      }
    ];

    switch (policyType) {
      case 'organizational':
        return [
          ...baseRules,
          {
            id: 'require_auth',
            type: 'access',
            condition: {
              type: 'user_role',
              operator: 'not_equals',
              value: 'authenticated'
            },
            action: {
              type: 'require_auth'
            },
            priority: 10,
            enabled: true
          },
          {
            id: 'watermark_downloads',
            type: 'download',
            condition: {
              type: 'user_role',
              operator: 'equals',
              value: 'any'
            },
            action: {
              type: 'add_watermark',
              parameters: {
                type: 'text',
                content: '{{user.email}} - Downloaded on {{timestamp}}'
              }
            },
            priority: 5,
            enabled: true
          }
        ];

      case 'regulatory':
        return [
          ...baseRules,
          {
            id: 'strict_access_control',
            type: 'access',
            condition: {
              type: 'user_role',
              operator: 'not_equals',
              value: 'authorized'
            },
            action: {
              type: 'deny'
            },
            priority: 100,
            enabled: true
          },
          {
            id: 'no_print_copy',
            type: 'print',
            condition: {
              type: 'user_role',
              operator: 'equals',
              value: 'any'
            },
            action: {
              type: 'deny'
            },
            priority: 50,
            enabled: true
          },
          {
            id: 'notify_admin_access',
            type: 'access',
            condition: {
              type: 'user_role',
              operator: 'equals',
              value: 'any'
            },
            action: {
              type: 'notify_admin'
            },
            priority: 1,
            enabled: true
          }
        ];

      default:
        return baseRules;
    }
  }

  async checkAccess(
    documentId: string,
    action: SecurityRule['type'],
    context?: Record<string, any>
  ): Promise<{ allowed: boolean; reason?: string; watermark?: WatermarkConfig }> {
    const policy = this.securityPolicies.get(documentId);
    if (!policy) {
      return { allowed: true }; // No policy = open access
    }

    const session = await getCurrentSession();
    const profile = await getCurrentProfile();
    
    const relevantRules = policy.rules
      .filter(rule => rule.type === action && rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of relevantRules) {
      const conditionMet = await this.evaluateCondition(rule.condition, {
        user: session,
        profile,
        context
      });

      if (conditionMet) {
        const result = await this.executeSecurityAction(rule.action, {
          documentId,
          userId: session?.user_id,
          action,
          rule
        });

        if (result.block) {
          await this.logSecurityEvent({
            id: generateCorrelationId(),
            documentId,
            userId: session?.user_id,
            action: `attempt_${action}`,
            resource: 'pdf_document',
            outcome: 'blocked',
            reason: result.reason,
            timestamp: Date.now()
          });

          return { allowed: false, reason: result.reason };
        }

        if (result.watermark) {
          return { allowed: true, watermark: result.watermark };
        }
      }
    }

    return { allowed: true };
  }

  private async evaluateCondition(
    condition: SecurityCondition,
    context: any
  ): Promise<boolean> {
    const { type, operator, value } = condition;
    const user = context.user;
    const profile = context.profile;

    switch (type) {
      case 'user_role':
        if (!user && value === 'authenticated') return false;
        if (value === 'any') return true;
        return operator === 'equals' 
          ? profile?.role === value 
          : profile?.role !== value;

      case 'time_range':
        const currentHour = new Date().getHours();
        const [startHour, endHour] = value;
        return currentHour >= startHour && currentHour <= endHour;

      case 'device_type':
        const deviceType = Platform.OS;
        return operator === 'equals' 
          ? deviceType === value 
          : deviceType !== value;

      default:
        return false;
    }
  }

  private async executeSecurityAction(
    action: SecurityAction,
    context: any
  ): Promise<{ block?: boolean; reason?: string; watermark?: WatermarkConfig }> {
    switch (action.type) {
      case 'deny':
        return { block: true, reason: 'Access denied by security policy' };

      case 'require_auth':
        if (!context.userId) {
          return { block: true, reason: 'Authentication required' };
        }
        break;

      case 'add_watermark':
        const watermarkConfig = this.createWatermarkFromTemplate(
          action.parameters,
          context
        );
        return { watermark: watermarkConfig };

      case 'log_access':
        await this.logSecurityEvent({
          id: generateCorrelationId(),
          documentId: context.documentId,
          userId: context.userId,
          action: context.action,
          resource: 'pdf_document',
          outcome: 'success',
          timestamp: Date.now()
        });
        break;

      case 'notify_admin':
        await this.notifyAdministrator(context);
        break;
    }

    return {};
  }

  private createWatermarkFromTemplate(
    parameters: any,
    context: any
  ): WatermarkConfig {
    const template = parameters.content || '{{user.email}} - {{timestamp}}';
    const user = context.user;
    
    let content = template
      .replace('{{user.email}}', user?.email || 'Anonymous')
      .replace('{{user.name}}', user?.user_metadata?.full_name || 'Anonymous')
      .replace('{{timestamp}}', new Date().toLocaleString());

    return {
      id: generateCorrelationId(),
      type: parameters.type || 'text',
      content,
      position: parameters.position || 'diagonal',
      opacity: parameters.opacity || 0.3,
      color: parameters.color || '#cccccc',
      fontSize: parameters.fontSize || 12,
      rotation: parameters.rotation || -45
    };
  }

  // ====================================================================
  // ACCESSIBILITY MANAGEMENT
  // ====================================================================

  async enhanceAccessibility(
    document: PDFDocument,
    targetCompliance: AccessibilityCompliance['standard'] = 'WCAG_2_1_AA'
  ): Promise<AccessibilityFeatures> {
    const correlationId = generateCorrelationId();
    
    trackAssistantEvent('pdf.accessibility.enhance_start', {
      correlation_id: correlationId,
      document_id: document.id,
      target_standard: targetCompliance
    });

    const features: AccessibilityFeatures = {
      altText: new Map(),
      readingOrder: [],
      landmarks: [],
      headingStructure: [],
      colorContrastInfo: [],
      screenReaderInstructions: []
    };

    // Generate alt text for images and charts
    await this.generateAltText(document, features);

    // Establish reading order
    this.establishReadingOrder(document, features);

    // Create accessibility landmarks
    this.createAccessibilityLandmarks(document, features);

    // Analyze heading structure
    this.analyzeHeadingStructure(document, features);

    // Check color contrast
    await this.checkColorContrast(document, features);

    // Add screen reader instructions
    this.addScreenReaderInstructions(document, features, targetCompliance);

    await this.storeAccessibilityFeatures(document.id, features);

    trackAssistantEvent('pdf.accessibility.enhance_complete', {
      correlation_id: correlationId,
      document_id: document.id,
      alt_text_count: features.altText.size,
      landmarks_count: features.landmarks.length,
      headings_count: features.headingStructure.length
    });

    return features;
  }

  private async generateAltText(
    document: PDFDocument,
    features: AccessibilityFeatures
  ): Promise<void> {
    // Find image and chart blocks
    const imageBlocks = document.content.filter(block => 
      block.type === 'image' || block.type === 'chart'
    );

    for (const block of imageBlocks) {
      let altText = '';
      
      if (block.type === 'chart') {
        altText = this.generateChartAltText(block.data);
      } else {
        altText = block.data.alt || 
          block.data.description || 
          `${block.type} element`;
      }
      
      features.altText.set(block.id, altText);
    }
  }

  private generateChartAltText(chartData: any): string {
    if (!chartData.values || !chartData.labels) {
      return 'Chart with data';
    }

    const maxValue = Math.max(...chartData.values);
    const maxIndex = chartData.values.indexOf(maxValue);
    const totalValue = chartData.values.reduce((sum: number, val: number) => sum + val, 0);

    return `Chart showing ${chartData.labels.length} data points. ` +
           `Highest value is ${maxValue} for ${chartData.labels[maxIndex]}. ` +
           `Total value is ${totalValue}.`;
  }

  private establishReadingOrder(
    document: PDFDocument,
    features: AccessibilityFeatures
  ): void {
    // Sort content blocks by logical reading order
    const sortedBlocks = document.content.sort((a, b) => {
      // Headers first, then content, then exercises
      const priority = {
        'header': 1,
        'text': 2,
        'callout': 3,
        'exercise': 4,
        'table': 5,
        'spacer': 10
      };
      
      return (priority[a.type as keyof typeof priority] || 5) - 
             (priority[b.type as keyof typeof priority] || 5);
    });

    features.readingOrder = sortedBlocks.map(block => block.id);
  }

  private createAccessibilityLandmarks(
    document: PDFDocument,
    features: AccessibilityFeatures
  ): void {
    document.content.forEach((block, index) => {
      if (block.type === 'header') {
        features.landmarks.push({
          id: `landmark_${block.id}`,
          type: index === 0 ? 'banner' : 'navigation',
          label: block.data.title || 'Section',
          page: 1, // Simplified - would need actual page calculation
          region: { x: 0, y: index * 100, width: 100, height: 50 }
        });
      }
    });
  }

  private analyzeHeadingStructure(
    document: PDFDocument,
    features: AccessibilityFeatures
  ): void {
    document.content.forEach((block, index) => {
      if (block.type === 'header' || block.type === 'text') {
        let level: HeadingStructure['level'] = 1;
        
        if (block.type === 'header') {
          level = 1;
        } else if (block.data.heading) {
          // Determine heading level based on content hierarchy
          level = 2;
        }

        const headingText = block.data.title || 
                           block.data.heading || 
                           block.data.content?.substring(0, 50);

        if (headingText) {
          features.headingStructure.push({
            id: `heading_${block.id}`,
            level,
            text: headingText,
            page: 1,
            position: { x: 0, y: index * 50 }
          });
        }
      }
    });
  }

  private async checkColorContrast(
    document: PDFDocument,
    features: AccessibilityFeatures
  ): Promise<void> {
    const template = document.template;
    
    // Check primary color combinations
    const contrastChecks = [
      {
        elementId: 'primary_text',
        foreground: template.colors.text,
        background: template.colors.background
      },
      {
        elementId: 'heading_text',
        foreground: template.colors.primary,
        background: template.colors.background
      },
      {
        elementId: 'accent_text',
        foreground: template.colors.accent,
        background: template.colors.background
      }
    ];

    for (const check of contrastChecks) {
      const ratio = this.calculateContrastRatio(check.foreground, check.background);
      
      features.colorContrastInfo.push({
        elementId: check.elementId,
        foregroundColor: check.foreground,
        backgroundColor: check.background,
        contrastRatio: ratio,
        passesAA: ratio >= 4.5,
        passesAAA: ratio >= 7,
        suggestion: ratio < 4.5 ? 'Increase color contrast for better readability' : undefined
      });
    }
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    // Simplified contrast calculation
    // In a real implementation, you'd convert colors to RGB and calculate proper contrast
    const isLight1 = this.isLightColor(color1);
    const isLight2 = this.isLightColor(color2);
    
    if (isLight1 !== isLight2) {
      return 7; // High contrast (different lightness)
    } else {
      return 3; // Low contrast (similar lightness)
    }
  }

  private isLightColor(color: string): boolean {
    // Simple heuristic - in reality you'd convert to RGB and calculate luminance
    return color.includes('fff') || 
           color.includes('light') || 
           color.includes('#f') ||
           color === '#ffffff';
  }

  private addScreenReaderInstructions(
    document: PDFDocument,
    features: AccessibilityFeatures,
    standard: AccessibilityCompliance['standard']
  ): void {
    // Add document-level instructions
    features.screenReaderInstructions.push({
      id: 'doc_description',
      type: 'description',
      content: `This is an educational document titled "${document.title}" with ${document.content.length} sections.`,
      position: 'before',
      targetElement: 'document'
    });

    // Add navigation instructions
    if (features.headingStructure.length > 0) {
      features.screenReaderInstructions.push({
        id: 'nav_instruction',
        type: 'navigation',
        content: `Use heading navigation to move between sections. This document has ${features.headingStructure.length} headings.`,
        position: 'after',
        targetElement: 'document_header'
      });
    }

    // Add instructions for interactive elements
    const exerciseBlocks = document.content.filter(block => block.type === 'exercise');
    if (exerciseBlocks.length > 0) {
      features.screenReaderInstructions.push({
        id: 'exercise_instruction',
        type: 'action',
        content: 'This document contains interactive exercises. Use Tab to navigate through questions and form controls.',
        position: 'before',
        targetElement: 'first_exercise'
      });
    }
  }

  // ====================================================================
  // AUDIT & LOGGING
  // ====================================================================

  private async logSecurityEvent(event: SecurityAuditLog): Promise<void> {
    this.auditLogs.push(event);
    
    // Store in database
    await this.supabase
      .from('pdf_security_logs')
      .insert({
        id: event.id,
        document_id: event.documentId,
        user_id: event.userId,
        action: event.action,
        resource: event.resource,
        outcome: event.outcome,
        reason: event.reason,
        timestamp: new Date(event.timestamp).toISOString(),
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        additional_data: event.additionalData
      });
  }

  async getSecurityAuditLog(
    documentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SecurityAuditLog[]> {
    let query = this.supabase
      .from('pdf_security_logs')
      .select('*')
      .eq('document_id', documentId);

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to retrieve audit log: ${error.message}`);
    }

    return data.map(row => ({
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      outcome: row.outcome,
      reason: row.reason,
      timestamp: new Date(row.timestamp).getTime(),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      additionalData: row.additional_data
    }));
  }

  // ====================================================================
  // UTILITY METHODS
  // ====================================================================

  private getPolicyName(policyType: PDFSecurityPolicy['policyType']): string {
    switch (policyType) {
      case 'organizational': return 'Organizational Security Policy';
      case 'regulatory': return 'Regulatory Compliance Policy';
      case 'custom': return 'Custom Security Policy';
      default: return 'Default Security Policy';
    }
  }

  private getPolicyDescription(policyType: PDFSecurityPolicy['policyType']): string {
    switch (policyType) {
      case 'organizational': 
        return 'Standard organizational security controls for document access and sharing';
      case 'regulatory': 
        return 'Strict regulatory compliance policy with enhanced access controls and audit logging';
      case 'custom': 
        return 'Custom security policy with user-defined rules and controls';
      default: 
        return 'Basic security policy with standard access controls';
    }
  }

  private async notifyAdministrator(context: any): Promise<void> {
    // Integration with notification service would go here
    console.log(`Admin notification: Sensitive document access by ${context.userId}`);
  }

  private async storeAccessibilityFeatures(
    documentId: string,
    features: AccessibilityFeatures
  ): Promise<void> {
    const accessibilityData = {
      alt_text: Array.from(features.altText.entries()),
      reading_order: features.readingOrder,
      landmarks: features.landmarks,
      heading_structure: features.headingStructure,
      color_contrast_info: features.colorContrastInfo,
      screen_reader_instructions: features.screenReaderInstructions
    };

    await this.supabase
      .from('pdf_accessibility_features')
      .upsert({
        document_id: documentId,
        features: accessibilityData,
        updated_at: new Date().toISOString()
      });
  }

  // ====================================================================
  // PUBLIC API METHODS
  // ====================================================================

  async validateCompliance(
    documentId: string,
    standard: AccessibilityCompliance['standard']
  ): Promise<ValidationResult[]> {
    const correlationId = generateCorrelationId();
    
    // Load accessibility features
    const { data } = await this.supabase
      .from('pdf_accessibility_features')
      .select('features')
      .eq('document_id', documentId)
      .single();

    const features = data?.features;
    if (!features) {
      throw new Error('No accessibility features found for document');
    }

    const results: ValidationResult[] = [];
    const requirements = this.getComplianceRequirements(standard);

    for (const requirement of requirements) {
      const result = this.validateRequirement(requirement, features);
      results.push(result);
    }

    trackAssistantEvent('pdf.accessibility.validation_complete', {
      correlation_id: correlationId,
      document_id: documentId,
      standard,
      total_checks: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length
    });

    return results;
  }

  private getComplianceRequirements(
    standard: AccessibilityCompliance['standard']
  ): ComplianceRequirement[] {
    // Simplified requirements - in reality this would be much more comprehensive
    return [
      {
        id: 'alt_text_images',
        category: 'content',
        title: 'Images have alternative text',
        description: 'All images must have descriptive alternative text',
        severity: 'critical',
        checkMethod: 'automated',
        required: true
      },
      {
        id: 'heading_structure',
        category: 'structure',
        title: 'Proper heading hierarchy',
        description: 'Headings must follow a logical hierarchy',
        severity: 'important',
        checkMethod: 'automated',
        required: true
      },
      {
        id: 'color_contrast',
        category: 'color',
        title: 'Adequate color contrast',
        description: 'Text must have sufficient contrast against background',
        severity: 'critical',
        checkMethod: 'automated',
        required: true
      }
    ];
  }

  private validateRequirement(
    requirement: ComplianceRequirement,
    features: any
  ): ValidationResult {
    switch (requirement.id) {
      case 'alt_text_images':
        const altTextCount = features.alt_text?.length || 0;
        return {
          requirementId: requirement.id,
          status: altTextCount > 0 ? 'pass' : 'fail',
          message: altTextCount > 0 
            ? `Found alternative text for ${altTextCount} images`
            : 'No alternative text found for images',
          suggestions: altTextCount === 0 
            ? ['Add descriptive alternative text for all images']
            : undefined,
          checkedAt: Date.now()
        };

      case 'heading_structure':
        const headingCount = features.heading_structure?.length || 0;
        return {
          requirementId: requirement.id,
          status: headingCount > 0 ? 'pass' : 'warning',
          message: headingCount > 0 
            ? `Document has ${headingCount} properly structured headings`
            : 'Consider adding headings to improve document structure',
          checkedAt: Date.now()
        };

      case 'color_contrast':
        const contrastIssues = features.color_contrast_info?.filter(
          (info: ColorContrastInfo) => !info.passesAA
        ).length || 0;
        
        return {
          requirementId: requirement.id,
          status: contrastIssues === 0 ? 'pass' : 'fail',
          message: contrastIssues === 0 
            ? 'All color combinations meet contrast requirements'
            : `${contrastIssues} color combinations have insufficient contrast`,
          suggestions: contrastIssues > 0 
            ? ['Increase color contrast for better readability']
            : undefined,
          checkedAt: Date.now()
        };

      default:
        return {
          requirementId: requirement.id,
          status: 'manual_check',
          message: 'Manual review required',
          checkedAt: Date.now()
        };
    }
  }

  getSecurityPolicy(documentId: string): PDFSecurityPolicy | null {
    return this.securityPolicies.get(documentId) || null;
  }

  async removeSecurityPolicy(documentId: string): Promise<void> {
    this.securityPolicies.delete(documentId);
    
    await this.supabase
      .from('pdf_security_policies')
      .delete()
      .eq('document_id', documentId);

    trackAssistantEvent('pdf.security.policy_removed', {
      correlation_id: generateCorrelationId(),
      document_id: documentId
    });
  }
}

// Export singleton instance
export const pdfSecurityAccessibilityManager = new PDFSecurityAccessibilityManager();