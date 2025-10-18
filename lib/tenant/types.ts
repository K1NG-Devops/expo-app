/**
 * Organization type system for multi-organizational support
 * Supports preschools, K-12 schools, universities, corporate training, sports clubs, etc.
 */

/**
 * Supported organization types
 */
export type OrganizationType =
  | 'preschool'
  | 'k12_school'
  | 'university'
  | 'corporate'
  | 'sports_club'
  | 'community_org'
  | 'training_center'
  | 'tutoring_center';

/**
 * Organization information
 */
export interface OrganizationInfo {
  id: string;
  name: string;
  type: OrganizationType;
  plan_tier: 'free' | 'starter' | 'premium' | 'enterprise';
  subscription_status?: string;
  tenant_slug?: string;
  features?: Record<string, boolean>;
  config?: Record<string, any>;
}

/**
 * Terminology mapping for UI labels
 * Different organization types use different terminology
 */
export interface TerminologyMap {
  organization: string;        // e.g., "School", "Company", "Club"
  organizationPlural: string;   // e.g., "Schools", "Companies", "Clubs"
  member: string;               // e.g., "Student", "Employee", "Member"
  memberPlural: string;         // e.g., "Students", "Employees", "Members"
  group: string;                // e.g., "Class", "Department", "Team"
  groupPlural: string;          // e.g., "Classes", "Departments", "Teams"
  instructor: string;           // e.g., "Teacher", "Trainer", "Coach"
  instructorPlural: string;     // e.g., "Teachers", "Trainers", "Coaches"
  leader: string;               // e.g., "Principal", "Manager", "Director"
  leaderPlural: string;         // e.g., "Principals", "Managers", "Directors"
  guardian: string;             // e.g., "Parent", "Guardian", "Sponsor"
  guardianPlural: string;       // e.g., "Parents", "Guardians", "Sponsors"
}

/**
 * Extended organization context with terminology
 */
export interface OrganizationContext {
  organization: OrganizationInfo;
  terminology: TerminologyMap;
}

/**
 * Legacy compatibility: map old field names
 */
export interface LegacySchoolCompat {
  /** @deprecated Use organizationId */
  schoolId: string;
  /** @deprecated Use organizationName */
  schoolName?: string;
  organizationId: string;
  organizationName?: string;
  organizationType: OrganizationType;
}
