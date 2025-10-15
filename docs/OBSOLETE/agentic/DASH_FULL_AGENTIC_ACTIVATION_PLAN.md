# Dash Full Agentic Activation Plan
**Version:** 2.0  
**Date:** October 13, 2025  
**Status:** 🎯 Ready for Implementation  
**Analyst:** Warp AI Agent

---

## 🎯 Executive Summary

**Mission:** Transform Dash from a capable AI assistant into a **truly agentic AI partner** with full awareness of EduDash Pro's architecture, features, and capabilities. Enable safe, proactive, context-aware assistance that anticipates needs and auto-executes low-risk actions.

**Current State:**
- ✅ Strong agentic foundation (7.5/10 maturity)
- ✅ Multi-engine architecture in place
- ⚠️ Limited EduDash Pro self-awareness
- ⚠️ Conservative autonomy (assistant level)
- ⚠️ Scattered legacy code

**Target State:**
- 🎯 Full platform knowledge base (features, DB, screens, tiers)
- 🎯 Partner-level autonomy by default (auto-exec low-risk)
- 🎯 >70% proactive suggestion rate on relevant interactions
- 🎯 Clean codebase with archived legacy
- 🎯 Telemetry-driven self-improvement

---

## 📊 Architecture Overview

### Current Architecture
```
User Message
  ↓
generateResponse()
  ↓
DashContextAnalyzer → DashProactiveEngine → AI Service
  ↓
Response with suggestions (conservative)
```

### Target Architecture
```
User Message
  ↓
DashContextAnalyzer (intent detection)
  ↓
DashEduDashKnowledge (platform awareness)
  ↓
DashCapabilityDiscovery (relevant features)
  ↓
DashAutonomyManager (risk policy)
  ↓
DashAgenticEngine (auto-exec or suggest)
  ↓
Enhanced Response + Auto-executed Actions
  ↓
DashTelemetry (learning & improvement)
```

---

## 🏗️ Implementation Roadmap

### Phase 1: Knowledge Foundation (Days 1-2)
**Goal:** Give Dash comprehensive self-awareness of EduDash Pro

#### Task 1.1: Create EduDash Feature Constants
**File:** `lib/constants/edudash-features.ts`

```typescript
export interface Feature {
  id: string;
  name: string;
  description: string;
  roles: ('teacher' | 'principal' | 'parent' | 'super_admin')[];
  tiers: ('free' | 'starter' | 'premium' | 'enterprise')[];
  riskLevel: 'low' | 'medium' | 'high';
  triggers: string[];
  utterances: string[];
  relatedScreens: string[];
  dbTables?: string[];
}

export const EDUDASH_FEATURES: Record<string, Feature> = {
  attendance: {
    id: 'attendance',
    name: 'Attendance Tracking',
    description: 'Daily attendance marking and reporting for classes',
    roles: ['teacher', 'principal'],
    tiers: ['starter', 'premium', 'enterprise'],
    riskLevel: 'low',
    triggers: ['morning', '8:00-9:00', 'class start', 'daily'],
    utterances: [
      'Mark attendance',
      'Take attendance for class A',
      'Who is absent today',
      'Attendance report'
    ],
    relatedScreens: ['/screens/attendance'],
    dbTables: ['attendance_records', 'students', 'classes']
  },
  
  lessonPlanning: {
    id: 'lesson_planning',
    name: 'AI Lesson Generator',
    description: 'Generate CAPS-aligned lesson plans with activities and assessments',
    roles: ['teacher', 'principal'],
    tiers: ['free', 'starter', 'premium', 'enterprise'],
    riskLevel: 'low',
    triggers: ['weekend', 'Sunday', 'planning time', 'new topic'],
    utterances: [
      'Create a lesson plan',
      'Generate lesson for shapes',
      'Plan math activity',
      'Lesson for grade R'
    ],
    relatedScreens: ['/screens/ai-lesson-generator'],
    dbTables: ['lessons', 'lesson_categories', 'age_groups']
  },
  
  grading: {
    id: 'grading',
    name: 'Assignment Grading',
    description: 'Grade student assignments and provide feedback',
    roles: ['teacher', 'principal'],
    tiers: ['starter', 'premium', 'enterprise'],
    riskLevel: 'medium',
    triggers: ['assignment due', 'Friday', 'end of week'],
    utterances: [
      'Grade assignments',
      'Check homework',
      'Provide feedback',
      'Assessment results'
    ],
    relatedScreens: ['/screens/grading'],
    dbTables: ['assignments', 'submissions', 'grades']
  },
  
  parentCommunication: {
    id: 'parent_communication',
    name: 'Parent Messaging',
    description: 'Send messages and updates to parents',
    roles: ['teacher', 'principal'],
    tiers: ['starter', 'premium', 'enterprise'],
    riskLevel: 'medium',
    triggers: ['incident', 'achievement', 'reminder needed'],
    utterances: [
      'Message parents',
      'Send update to parents',
      'Contact guardian',
      'Notify parents'
    ],
    relatedScreens: ['/screens/teacher-messages', '/screens/parent-messages'],
    dbTables: ['messages', 'parents', 'students']
  },
  
  financialDashboard: {
    id: 'financial_dashboard',
    name: 'Financial Dashboard',
    description: 'View fee payments, outstanding balances, and financial insights',
    roles: ['principal', 'super_admin'],
    tiers: ['premium', 'enterprise'],
    riskLevel: 'low',
    triggers: ['month end', 'fee due', 'financial query'],
    utterances: [
      'Show financial dashboard',
      'Fee payments',
      'Outstanding fees',
      'Revenue report'
    ],
    relatedScreens: ['/screens/financial-dashboard'],
    dbTables: ['fee_payments', 'invoices', 'preschools']
  },
  
  worksheetGeneration: {
    id: 'worksheet_generation',
    name: 'Worksheet Generator',
    description: 'Generate educational worksheets for practice and assessment',
    roles: ['teacher', 'principal'],
    tiers: ['starter', 'premium', 'enterprise'],
    riskLevel: 'low',
    triggers: ['homework needed', 'practice needed', 'assessment prep'],
    utterances: [
      'Create worksheet',
      'Generate math worksheet',
      'Practice activities',
      'Homework sheet'
    ],
    relatedScreens: ['/screens/worksheet-demo'],
    dbTables: []
  },
  
  studentManagement: {
    id: 'student_management',
    name: 'Student Management',
    description: 'Manage student records, enrollment, and profiles',
    roles: ['teacher', 'principal'],
    tiers: ['starter', 'premium', 'enterprise'],
    riskLevel: 'high',
    triggers: ['enrollment', 'new student', 'update needed'],
    utterances: [
      'Add student',
      'View students',
      'Student profile',
      'Enrollment'
    ],
    relatedScreens: ['/screens/student-management'],
    dbTables: ['students', 'enrollments', 'classes']
  },
  
  reports: {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Generate progress reports, analytics, and insights',
    roles: ['teacher', 'principal'],
    tiers: ['premium', 'enterprise'],
    riskLevel: 'low',
    triggers: ['end of term', 'Friday', 'reporting period'],
    utterances: [
      'Generate report',
      'Student progress report',
      'Class analytics',
      'Performance summary'
    ],
    relatedScreens: ['/screens/teacher-reports'],
    dbTables: ['students', 'grades', 'attendance_records']
  },
  
  whatsappIntegration: {
    id: 'whatsapp_integration',
    name: 'WhatsApp Integration',
    description: 'Connect and broadcast messages via WhatsApp',
    roles: ['principal', 'teacher'],
    tiers: ['premium', 'enterprise'],
    riskLevel: 'medium',
    triggers: ['urgent', 'broadcast needed', 'bulk message'],
    utterances: [
      'Send WhatsApp',
      'Broadcast to parents',
      'WhatsApp message',
      'Connect WhatsApp'
    ],
    relatedScreens: ['/screens/whatsapp-connector'],
    dbTables: ['whatsapp_connections', 'messages']
  },
  
  voiceNotes: {
    id: 'voice_notes',
    name: 'Voice Note Transcription',
    description: 'Record, transcribe, and send voice notes',
    roles: ['teacher', 'principal', 'parent'],
    tiers: ['free', 'starter', 'premium', 'enterprise'],
    riskLevel: 'low',
    triggers: ['voice message', 'quick note', 'hands-free'],
    utterances: [
      'Record voice note',
      'Send voice message',
      'Transcribe audio',
      'Voice recording'
    ],
    relatedScreens: ['/screens/dash-assistant'],
    dbTables: ['voice_notes', 'messages']
  }
};

export interface DbTable {
  table: string;
  tenantKey: string;
  keyCols: string[];
  commonFilters: string[];
  purpose: string;
  notes: string;
}

export const EDUDASH_DB: Record<string, DbTable> = {
  students: {
    table: 'students',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'class_id', 'status'],
    commonFilters: ['class_id', 'status', 'age_group_id'],
    purpose: 'Student enrollment and profile data',
    notes: 'RLS enforced by preschool_id. PII includes full_name, date_of_birth.'
  },
  
  classes: {
    table: 'classes',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'teacher_id', 'age_group_id'],
    commonFilters: ['teacher_id', 'age_group_id', 'academic_year'],
    purpose: 'Class groups and teacher assignments',
    notes: 'RLS enforced. Links teachers to students via teacher_id.'
  },
  
  attendance_records: {
    table: 'attendance_records',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'student_id', 'date', 'status'],
    commonFilters: ['student_id', 'class_id', 'date', 'status'],
    purpose: 'Daily attendance tracking',
    notes: 'Time-series data. Common query: last 7 days by class.'
  },
  
  lessons: {
    table: 'lessons',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'teacher_id', 'category_id'],
    commonFilters: ['teacher_id', 'category_id', 'age_group_id'],
    purpose: 'Lesson plans and educational content',
    notes: 'Can be shared across preschools if published=true.'
  },
  
  assignments: {
    table: 'assignments',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'class_id', 'teacher_id'],
    commonFilters: ['class_id', 'due_date', 'status'],
    purpose: 'Homework and assignments',
    notes: 'Links to submissions table. Due_date commonly filtered.'
  },
  
  messages: {
    table: 'messages',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'sender_id', 'recipient_id'],
    commonFilters: ['sender_id', 'recipient_id', 'created_at'],
    purpose: 'Parent-teacher messaging',
    notes: 'Time-ordered. Filter by role for inbox views.'
  },
  
  fee_payments: {
    table: 'fee_payments',
    tenantKey: 'preschool_id',
    keyCols: ['id', 'student_id', 'amount', 'status'],
    commonFilters: ['student_id', 'status', 'payment_date'],
    purpose: 'Fee payment tracking',
    notes: 'Financial data. Restricted to principal and super_admin roles.'
  }
};

export interface Screen {
  route: string;
  title: string;
  roles: string[];
  description: string;
  nav: 'Stack';
  quickActions?: string[];
}

export const EDUDASH_SCREENS: Record<string, Screen> = {
  teacherDashboard: {
    route: '/',
    title: 'Teacher Dashboard',
    roles: ['teacher'],
    description: 'Overview of classes, students, and quick actions',
    nav: 'Stack',
    quickActions: ['Take Attendance', 'View Students', 'Create Lesson']
  },
  
  principalDashboard: {
    route: '/',
    title: 'Principal Dashboard',
    roles: ['principal'],
    description: 'School overview, applications, and metrics',
    nav: 'Stack',
    quickActions: ['View Applications', 'Financial Dashboard', 'Reports']
  },
  
  parentDashboard: {
    route: '/',
    title: 'Parent Dashboard',
    roles: ['parent'],
    description: 'Child overview, messages, and calendar',
    nav: 'Stack',
    quickActions: ['View Children', 'Messages', 'Homework']
  },
  
  aiLessonGenerator: {
    route: '/screens/ai-lesson-generator',
    title: 'AI Lesson Generator',
    roles: ['teacher', 'principal'],
    description: 'Generate CAPS-aligned lessons with AI',
    nav: 'Stack',
    quickActions: ['Generate Lesson', 'View Templates', 'Save Draft']
  },
  
  worksheetDemo: {
    route: '/screens/worksheet-demo',
    title: 'Worksheet Generator',
    roles: ['teacher', 'principal'],
    description: 'Create printable worksheets',
    nav: 'Stack',
    quickActions: ['Generate Worksheet', 'Customize', 'Download PDF']
  },
  
  financialDashboard: {
    route: '/screens/financial-dashboard',
    title: 'Financial Dashboard',
    roles: ['principal', 'super_admin'],
    description: 'Fee tracking, payments, and insights',
    nav: 'Stack',
    quickActions: ['View Outstanding', 'Generate Invoice', 'Payment Report']
  },
  
  studentManagement: {
    route: '/screens/student-management',
    title: 'Student Management',
    roles: ['teacher', 'principal'],
    description: 'Manage student enrollment and profiles',
    nav: 'Stack',
    quickActions: ['Add Student', 'View Roster', 'Export List']
  },
  
  teacherMessages: {
    route: '/screens/teacher-messages',
    title: 'Messages',
    roles: ['teacher', 'principal'],
    description: 'Communicate with parents',
    nav: 'Stack',
    quickActions: ['New Message', 'View Inbox', 'Templates']
  },
  
  teacherReports: {
    route: '/screens/teacher-reports',
    title: 'Reports',
    roles: ['teacher', 'principal'],
    description: 'Student progress and analytics',
    nav: 'Stack',
    quickActions: ['Generate Report', 'View Analytics', 'Export Data']
  },
  
  dashAssistant: {
    route: '/screens/dash-assistant',
    title: 'Dash AI Assistant',
    roles: ['teacher', 'principal', 'parent'],
    description: 'AI-powered educational assistant',
    nav: 'Stack',
    quickActions: ['Ask Question', 'Voice Note', 'View History']
  }
};

export interface SubscriptionTier {
  name: string;
  features: string[];
  aiLimits: {
    requestsPerHour: number;
    requestsPerDay: number;
    modelsAllowed: string[];
  };
  storage: {
    documents: number;
    voiceNotes: number;
  };
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    name: 'Free',
    features: ['chat', 'basic_lessons', 'voice_notes'],
    aiLimits: {
      requestsPerHour: 10,
      requestsPerDay: 50,
      modelsAllowed: ['claude-3-haiku']
    },
    storage: {
      documents: 10,
      voiceNotes: 20
    }
  },
  
  starter: {
    name: 'Starter',
    features: [
      'chat',
      'lesson_planning',
      'worksheet_generation',
      'attendance',
      'grading',
      'parent_communication',
      'voice_notes'
    ],
    aiLimits: {
      requestsPerHour: 50,
      requestsPerDay: 300,
      modelsAllowed: ['claude-3-haiku', 'claude-3-sonnet']
    },
    storage: {
      documents: 100,
      voiceNotes: 200
    }
  },
  
  premium: {
    name: 'Premium',
    features: [
      'all_starter_features',
      'financial_dashboard',
      'reports',
      'whatsapp_integration',
      'advanced_analytics',
      'bulk_operations'
    ],
    aiLimits: {
      requestsPerHour: 200,
      requestsPerDay: 1500,
      modelsAllowed: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus']
    },
    storage: {
      documents: 500,
      voiceNotes: 1000
    }
  },
  
  enterprise: {
    name: 'Enterprise',
    features: [
      'all_premium_features',
      'custom_integrations',
      'priority_support',
      'dedicated_training',
      'sla_guarantees'
    ],
    aiLimits: {
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      modelsAllowed: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus']
    },
    storage: {
      documents: -1, // unlimited
      voiceNotes: -1 // unlimited
    }
  }
};

export const EDGE_FUNCTIONS = {
  aiGateway: {
    name: 'ai-gateway',
    description: 'Central AI request router with rate limiting',
    actions: ['general_assistance', 'homework_help', 'lesson_generation', 'grading']
  },
  
  transcribeAudio: {
    name: 'transcribe-audio',
    description: 'Voice note transcription service',
    features: ['openai-whisper', 'language-detection']
  },
  
  ragAnswer: {
    name: 'rag-answer',
    description: 'RAG-based question answering with document search',
    features: ['vector-search', 'citation']
  }
};

export const SA_CONTEXT = {
  curriculum: 'CAPS',
  locale: 'en-ZA',
  targetAudience: 'South African preschools',
  notes: [
    'CAPS (Curriculum and Assessment Policy Statement) aligned',
    'Focus on early childhood development (ages 3-7)',
    'Multi-lingual support (English, Afrikaans, Zulu, Sesotho)',
    'Culturally appropriate content',
    'Mobile-first design for low-bandwidth environments'
  ]
};
```

**Acceptance:** Feature catalog complete with 10+ features, DB schema, screens, tiers, Edge Functions

---

#### Task 1.2: Build DashEduDashKnowledge Service
**File:** `services/DashEduDashKnowledge.ts`

```typescript
import {
  EDUDASH_FEATURES,
  EDUDASH_DB,
  EDUDASH_SCREENS,
  SUBSCRIPTION_TIERS,
  EDGE_FUNCTIONS,
  SA_CONTEXT,
  type Feature,
  type DbTable,
  type Screen,
  type SubscriptionTier
} from '@/lib/constants/edudash-features';
import type { AutonomyLevel } from './DashAIAssistant';

export class DashEduDashKnowledge {
  /**
   * Get complete feature catalog
   */
  static getFeatureCatalog(): Record<string, Feature> {
    return EDUDASH_FEATURES;
  }

  /**
   * Get database schema information
   */
  static getDbSchema(): Record<string, DbTable> {
    return EDUDASH_DB;
  }

  /**
   * Get all available screens
   */
  static getScreens(): Record<string, Screen> {
    return EDUDASH_SCREENS;
  }

  /**
   * Get tier limits and features
   */
  static getTierLimits(tier: string): SubscriptionTier {
    return SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.starter;
  }

  /**
   * Get Edge Functions metadata
   */
  static getEdgeFunctions() {
    return EDGE_FUNCTIONS;
  }

  /**
   * Get South African context
   */
  static getSaContext() {
    return SA_CONTEXT;
  }

  /**
   * Get capabilities available for a given role and tier
   */
  static getRoleCapabilities(role: string, tier: string): Feature[] {
    const tierData = this.getTierLimits(tier);
    const features = Object.values(EDUDASH_FEATURES);
    
    return features.filter(feature => 
      feature.roles.includes(role as any) &&
      (tierData.features.includes(feature.id) || 
       tierData.features.includes('all_' + tier + '_features') ||
       tierData.features.includes('all_premium_features'))
    );
  }

  /**
   * Search across features, screens, and schema
   */
  static search(query: string, options?: {
    includeFeatures?: boolean;
    includeScreens?: boolean;
    includeDb?: boolean;
  }): Array<{ type: string; id: string; name: string; relevance: number; data: any }> {
    const results: Array<{ type: string; id: string; name: string; relevance: number; data: any }> = [];
    const lowerQuery = query.toLowerCase();
    
    const opts = {
      includeFeatures: true,
      includeScreens: true,
      includeDb: true,
      ...options
    };

    // Search features
    if (opts.includeFeatures) {
      Object.values(EDUDASH_FEATURES).forEach(feature => {
        let relevance = 0;
        
        if (feature.name.toLowerCase().includes(lowerQuery)) relevance += 10;
        if (feature.description.toLowerCase().includes(lowerQuery)) relevance += 5;
        if (feature.utterances.some(u => u.toLowerCase().includes(lowerQuery))) relevance += 8;
        if (feature.triggers.some(t => t.toLowerCase().includes(lowerQuery))) relevance += 3;
        
        if (relevance > 0) {
          results.push({
            type: 'feature',
            id: feature.id,
            name: feature.name,
            relevance,
            data: feature
          });
        }
      });
    }

    // Search screens
    if (opts.includeScreens) {
      Object.values(EDUDASH_SCREENS).forEach(screen => {
        let relevance = 0;
        
        if (screen.title.toLowerCase().includes(lowerQuery)) relevance += 10;
        if (screen.description.toLowerCase().includes(lowerQuery)) relevance += 5;
        if (screen.route.toLowerCase().includes(lowerQuery)) relevance += 3;
        
        if (relevance > 0) {
          results.push({
            type: 'screen',
            id: screen.route,
            name: screen.title,
            relevance,
            data: screen
          });
        }
      });
    }

    // Search DB tables
    if (opts.includeDb) {
      Object.values(EDUDASH_DB).forEach(table => {
        let relevance = 0;
        
        if (table.table.toLowerCase().includes(lowerQuery)) relevance += 10;
        if (table.purpose.toLowerCase().includes(lowerQuery)) relevance += 5;
        
        if (relevance > 0) {
          results.push({
            type: 'db_table',
            id: table.table,
            name: table.table,
            relevance,
            data: table
          });
        }
      });
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Suggest capabilities based on context
   */
  static suggestForContext(context: {
    role: string;
    tier: string;
    hour?: number;
    dayOfWeek?: number;
    currentScreen?: string;
    recentActions?: string[];
  }): Feature[] {
    const capabilities = this.getRoleCapabilities(context.role, context.tier);
    const scored: Array<{ feature: Feature; score: number }> = [];

    capabilities.forEach(feature => {
      let score = 0;

      // Time-based triggers
      if (context.hour !== undefined) {
        feature.triggers.forEach(trigger => {
          if (trigger.includes('-') && trigger.includes(':')) {
            const [start, end] = trigger.split('-').map(t => parseInt(t.split(':')[0]));
            if (context.hour! >= start && context.hour! <= end) score += 5;
          }
        });

        // Day-based triggers
        if (context.dayOfWeek !== undefined) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const currentDay = dayNames[context.dayOfWeek];
          if (feature.triggers.some(t => t.toLowerCase().includes(currentDay.toLowerCase()))) {
            score += 5;
          }
        }
      }

      // Screen context
      if (context.currentScreen && feature.relatedScreens?.includes(context.currentScreen)) {
        score += 8;
      }

      // Recent actions
      if (context.recentActions) {
        const hasRelated = context.recentActions.some(action =>
          feature.utterances.some(u => action.toLowerCase().includes(u.toLowerCase()))
        );
        if (hasRelated) score += 3;
      }

      scored.push({ feature, score });
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.feature);
  }

  /**
   * Build compact prompt context string
   */
  static buildPromptContext(
    profile: any,
    awareness: any,
    tier: string
  ): string {
    const capabilities = this.getRoleCapabilities(profile?.role || 'teacher', tier);
    const tierData = this.getTierLimits(tier);
    
    let prompt = `\n## EDUDASH PRO PLATFORM KNOWLEDGE\n\n`;
    
    // Platform overview
    prompt += `**Platform:** EduDash Pro - South African Preschool Management System\n`;
    prompt += `**Focus:** ${SA_CONTEXT.targetAudience} (ages 3-7)\n`;
    prompt += `**Curriculum:** ${SA_CONTEXT.curriculum} aligned\n`;
    prompt += `**Navigation:** Stack-based (no tabs/drawer)\n\n`;
    
    // User context
    prompt += `**Current User:**\n`;
    prompt += `- Role: ${profile?.role || 'teacher'}\n`;
    prompt += `- Tier: ${tier} (${tierData.name})\n`;
    prompt += `- Organization: ${profile?.organization_name || 'unknown'}\n\n`;
    
    // Available features
    prompt += `**Available Capabilities (${capabilities.length}):**\n`;
    capabilities.slice(0, 8).forEach(cap => {
      prompt += `- ${cap.name}: ${cap.description}\n`;
    });
    
    if (capabilities.length > 8) {
      prompt += `- ... and ${capabilities.length - 8} more\n`;
    }
    prompt += `\n`;
    
    // Database awareness
    prompt += `**Data Model Notes:**\n`;
    prompt += `- Multi-tenant: All queries filtered by preschool_id (RLS enforced)\n`;
    prompt += `- Key tables: students, classes, attendance_records, lessons, messages, fee_payments\n`;
    prompt += `- Always respect tenant isolation - NEVER query across preschools\n\n`;
    
    // Edge Functions
    prompt += `**Available Edge Functions:**\n`;
    prompt += `- ai-gateway: Central AI router (use for all AI requests)\n`;
    prompt += `- transcribe-audio: Voice note transcription\n`;
    prompt += `- rag-answer: Document-based Q&A\n\n`;
    
    // Guardrails
    prompt += `**CRITICAL GUARDRAILS:**\n`;
    prompt += `- NEVER claim files are attached; use Export/Save options or open screens\n`;
    prompt += `- ALWAYS use Edge Functions; NEVER expose API keys client-side\n`;
    prompt += `- Stack navigation only; no tabs or drawer\n`;
    prompt += `- High-risk actions require approval (grades, deletions, external messages)\n`;
    prompt += `- Respect tier limits: ${tierData.aiLimits.requestsPerHour} requests/hour\n`;
    
    return prompt;
  }

  /**
   * Determine risk level for an action
   */
  static getRiskForAction(action: {
    type: string;
    parameters?: Record<string, any>;
  }): 'low' | 'medium' | 'high' {
    const { type, parameters } = action;

    // High risk actions
    const highRiskActions = [
      'email_send',
      'data_update',
      'api_call'
    ];

    if (highRiskActions.includes(type)) {
      // Check if it's a destructive operation
      if (parameters?.operation === 'delete') return 'high';
      if (parameters?.table === 'grades' || parameters?.table === 'students') return 'high';
      if (parameters?.external === true) return 'high';
      
      return 'medium';
    }

    // Medium risk actions
    const mediumRiskActions = [
      'notification',
      'file_generation'
    ];

    if (mediumRiskActions.includes(type)) {
      return 'medium';
    }

    // Low risk actions (navigation, read-only)
    return 'low';
  }

  /**
   * Get feature by ID
   */
  static getFeature(featureId: string): Feature | undefined {
    return EDUDASH_FEATURES[featureId];
  }

  /**
   * Get screen by route
   */
  static getScreen(route: string): Screen | undefined {
    return Object.values(EDUDASH_SCREENS).find(s => s.route === route);
  }

  /**
   * Check if feature is available for role and tier
   */
  static isFeatureAvailable(featureId: string, role: string, tier: string): boolean {
    const feature = this.getFeature(featureId);
    if (!feature) return false;

    const tierData = this.getTierLimits(tier);
    const hasRole = feature.roles.includes(role as any);
    const hasTier = feature.tiers.includes(tier as any) ||
                    tierData.features.includes(featureId) ||
                    tierData.features.includes('all_' + tier + '_features');

    return hasRole && hasTier;
  }
}
```

**Acceptance:** Knowledge service provides searchable, queryable access to all EduDash Pro knowledge

---

### Phase 2: Autonomy & Decision Making (Days 3-4)
**Goal:** Enable safe auto-execution with configurable autonomy levels

[Continuing in next file due to length...]

---

## 📈 Success Metrics

### Quantitative KPIs
- ✅ Proactive suggestion rate: >70% of relevant interactions
- ✅ Auto-execution success rate: >95% for low-risk actions
- ✅ User satisfaction score: >4.5/5 (via telemetry)
- ✅ Response time: <3s for simple, <8s for complex queries
- ✅ Feature discovery: Users discover 5+ features in first week

### Qualitative KPIs
- ✅ Dash correctly explains any EduDash Pro feature on request
- ✅ Database queries include proper preschool_id filtering
- ✅ Navigation auto-opens without extra confirmation in partner mode
- ✅ Legacy code archived with clear documentation
- ✅ Clean separation of concerns across modules

---

## 🚨 Risk Mitigation

### Technical Risks
1. **Token Bloat:** Comprehensive prompts may exceed token limits
   - *Mitigation:* Use bulleted summaries; dynamic context selection
   
2. **Rate Limiting:** Increased AI calls may hit limits
   - *Mitigation:* Existing aiRequestQueue; respect cooldowns

3. **Breaking Changes:** New modules may conflict with existing code
   - *Mitigation:* Comprehensive testing; gradual rollout with feature flags

### Safety Risks
1. **Unauthorized Auto-Exec:** Partner mode auto-executes medium-risk actions
   - *Mitigation:* Strict risk classification; telemetry monitoring; kill switch

2. **PII Exposure:** Telemetry may accidentally log sensitive data
   - *Mitigation:* No PII in payloads; RLS enforcement; anonymized IDs only

3. **Multi-Tenant Breach:** Context analyzer suggests cross-tenant queries
   - *Mitigation:* Knowledge base emphasizes RLS; prompt guardrails; testing

---

## 📚 Documentation Deliverables

1. **docs/agentic/DASH_FULL_AGENTIC_ACTIVATION.md** (this file)
2. **docs/agentic/AUTONOMY_LEVELS.md** - User-facing guide
3. **docs/agentic/KNOWLEDGE_BASE.md** - Feature catalog reference
4. **docs/agentic/TELEMETRY_PRIVACY.md** - Data collection transparency
5. **docs/archive/LEGACY_CODE_MIGRATION.md** - Archive index

---

## ✅ Definition of Done

**Phase 1 Complete When:**
- [ ] Feature constants module created with 10+ features
- [ ] DashEduDashKnowledge service implemented and tested
- [ ] Prompts include buildPromptContext output
- [ ] Dash correctly answers "What features do you have?"

**Phase 2 Complete When:**
- [ ] DashAutonomyManager with 4 levels implemented
- [ ] Risk classification working for all action types
- [ ] Partner mode auto-opens low-risk screens
- [ ] Settings UI allows autonomy configuration

**Phase 3 Complete When:**
- [ ] DashCapabilityDiscovery integrated into generateResponse
- [ ] Proactive suggestions appear in >70% of relevant queries
- [ ] Telemetry tables created with RLS
- [ ] Auto-exec logged to agentic_events

**Phase 4 Complete When:**
- [ ] Legacy code archived to docs/archive
- [ ] All obsolete backups moved
- [ ] LEGACY_DASH_IMPLEMENTATION.md updated
- [ ] scripts/archive-legacy.sh created

**Full Activation Complete When:**
- [ ] All phases done
- [ ] Test suite passes (tests/agentic/)
- [ ] Documentation complete
- [ ] Feature flags deployed
- [ ] Telemetry monitoring active

---

## 🎓 Team Training Notes

**For Developers:**
- New modules are dependency-light; start with constants
- Knowledge base is the source of truth; update it first
- Test autonomy policies thoroughly; safety critical
- Use DashTelemetry for all agentic events

**For QA:**
- Focus on autonomy boundary tests (can/can't auto-exec)
- Verify multi-tenant isolation in all suggestions
- Check that high-risk actions always require approval
- Validate proactive suggestion relevance

**For Product:**
- Monitor agentic_events for adoption metrics
- Survey users on autonomy level preferences
- Track feature discovery via telemetry
- A/B test partner vs assistant default

---

**Next Action:** Begin Phase 1, Task 1.1 - Create EduDash Feature Constants Module

**Estimated Timeline:** 7-10 days for full implementation
