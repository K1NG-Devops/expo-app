/**
 * Terminology mapping system for multi-organizational support
 * Maps UI labels based on organization type
 */

import type { OrganizationType, TerminologyMap } from './types';

/**
 * Default terminology maps for each organization type
 */
const TERMINOLOGY_MAPS: Record<OrganizationType, TerminologyMap> = {
  preschool: {
    organization: 'Preschool',
    organizationPlural: 'Preschools',
    member: 'Student',
    memberPlural: 'Students',
    group: 'Class',
    groupPlural: 'Classes',
    instructor: 'Teacher',
    instructorPlural: 'Teachers',
    leader: 'Principal',
    leaderPlural: 'Principals',
    guardian: 'Parent',
    guardianPlural: 'Parents',
  },
  k12_school: {
    organization: 'School',
    organizationPlural: 'Schools',
    member: 'Student',
    memberPlural: 'Students',
    group: 'Class',
    groupPlural: 'Classes',
    instructor: 'Teacher',
    instructorPlural: 'Teachers',
    leader: 'Principal',
    leaderPlural: 'Principals',
    guardian: 'Parent',
    guardianPlural: 'Parents',
  },
  university: {
    organization: 'University',
    organizationPlural: 'Universities',
    member: 'Student',
    memberPlural: 'Students',
    group: 'Course',
    groupPlural: 'Courses',
    instructor: 'Professor',
    instructorPlural: 'Professors',
    leader: 'Dean',
    leaderPlural: 'Deans',
    guardian: 'Guardian',
    guardianPlural: 'Guardians',
  },
  corporate: {
    organization: 'Company',
    organizationPlural: 'Companies',
    member: 'Employee',
    memberPlural: 'Employees',
    group: 'Department',
    groupPlural: 'Departments',
    instructor: 'Trainer',
    instructorPlural: 'Trainers',
    leader: 'Manager',
    leaderPlural: 'Managers',
    guardian: 'Sponsor',
    guardianPlural: 'Sponsors',
  },
  sports_club: {
    organization: 'Club',
    organizationPlural: 'Clubs',
    member: 'Athlete',
    memberPlural: 'Athletes',
    group: 'Team',
    groupPlural: 'Teams',
    instructor: 'Coach',
    instructorPlural: 'Coaches',
    leader: 'Director',
    leaderPlural: 'Directors',
    guardian: 'Guardian',
    guardianPlural: 'Guardians',
  },
  community_org: {
    organization: 'Organization',
    organizationPlural: 'Organizations',
    member: 'Member',
    memberPlural: 'Members',
    group: 'Group',
    groupPlural: 'Groups',
    instructor: 'Facilitator',
    instructorPlural: 'Facilitators',
    leader: 'Director',
    leaderPlural: 'Directors',
    guardian: 'Guardian',
    guardianPlural: 'Guardians',
  },
  training_center: {
    organization: 'Training Center',
    organizationPlural: 'Training Centers',
    member: 'Trainee',
    memberPlural: 'Trainees',
    group: 'Course',
    groupPlural: 'Courses',
    instructor: 'Instructor',
    instructorPlural: 'Instructors',
    leader: 'Director',
    leaderPlural: 'Directors',
    guardian: 'Sponsor',
    guardianPlural: 'Sponsors',
  },
  tutoring_center: {
    organization: 'Tutoring Center',
    organizationPlural: 'Tutoring Centers',
    member: 'Student',
    memberPlural: 'Students',
    group: 'Session',
    groupPlural: 'Sessions',
    instructor: 'Tutor',
    instructorPlural: 'Tutors',
    leader: 'Director',
    leaderPlural: 'Directors',
    guardian: 'Parent',
    guardianPlural: 'Parents',
  },
};

/**
 * Get terminology map for an organization type
 */
export function getTerminology(orgType: OrganizationType): TerminologyMap {
  return TERMINOLOGY_MAPS[orgType];
}

/**
 * Get a specific term for an organization type
 */
export function getTerm(
  orgType: OrganizationType,
  key: keyof TerminologyMap
): string {
  return TERMINOLOGY_MAPS[orgType][key];
}

/**
 * Get terminology with fallback to preschool if type is unknown
 */
export function getTerminologyWithFallback(
  orgType?: OrganizationType | null
): TerminologyMap {
  if (!orgType || !(orgType in TERMINOLOGY_MAPS)) {
    return TERMINOLOGY_MAPS.preschool;
  }
  return TERMINOLOGY_MAPS[orgType];
}

/**
 * Check if an organization type is education-focused
 */
export function isEducationOrg(orgType: OrganizationType): boolean {
  return ['preschool', 'k12_school', 'university', 'tutoring_center'].includes(orgType);
}

/**
 * Check if an organization type uses parent/guardian terminology
 */
export function hasGuardians(orgType: OrganizationType): boolean {
  return ['preschool', 'k12_school', 'university', 'sports_club', 'tutoring_center'].includes(orgType);
}

/**
 * Get role display name based on organization type
 * Maps technical role names to human-readable labels
 */
export function getRoleDisplayName(
  role: string,
  orgType: OrganizationType = 'preschool'
): string {
  const terminology = getTerminology(orgType);
  
  const normalized = role.toLowerCase().trim();
  
  // Map roles to terminology
  if (normalized === 'teacher') {
    return terminology.instructor;
  }
  if (normalized === 'principal' || normalized === 'principal_admin') {
    return terminology.leader;
  }
  if (normalized === 'parent') {
    return terminology.guardian;
  }
  if (normalized === 'student') {
    return terminology.member;
  }
  if (normalized === 'super_admin' || normalized === 'superadmin') {
    return 'Super Admin';
  }
  
  // Fallback to capitalized role name
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get plural role display name
 */
export function getRolePluralName(
  role: string,
  orgType: OrganizationType = 'preschool'
): string {
  const terminology = getTerminology(orgType);
  
  const normalized = role.toLowerCase().trim();
  
  if (normalized === 'teacher') {
    return terminology.instructorPlural;
  }
  if (normalized === 'principal' || normalized === 'principal_admin') {
    return terminology.leaderPlural;
  }
  if (normalized === 'parent') {
    return terminology.guardianPlural;
  }
  if (normalized === 'student') {
    return terminology.memberPlural;
  }
  
  // Fallback: add 's' to singular form
  return getRoleDisplayName(role, orgType) + 's';
}

/**
 * Export terminology maps for advanced usage
 */
export { TERMINOLOGY_MAPS };
