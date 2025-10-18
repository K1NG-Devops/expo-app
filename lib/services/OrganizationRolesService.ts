/**
 * Organization Roles Service
 * Manages dynamic role definitions per organization
 */

import { assertSupabase } from '@/lib/supabase';
import type { Capability } from '@/lib/rbac';

export interface OrganizationRole {
  id: string;
  organization_id: string;
  role_id: string;
  role_name: string;
  display_name: string;
  description?: string;
  permissions: string[];
  hierarchy_level: number;
  capabilities: Capability[];
  ai_config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleParams {
  organization_id: string;
  role_id: string;
  role_name: string;
  display_name: string;
  description?: string;
  permissions?: string[];
  hierarchy_level?: number;
  capabilities?: Capability[];
  ai_config?: Record<string, any>;
}

export interface UpdateRoleParams {
  display_name?: string;
  description?: string;
  permissions?: string[];
  hierarchy_level?: number;
  capabilities?: Capability[];
  ai_config?: Record<string, any>;
  is_active?: boolean;
}

export class OrganizationRolesService {
  /**
   * Get all roles for an organization
   */
  static async getRolesByOrganization(organizationId: string): Promise<OrganizationRole[]> {
    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('hierarchy_level', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organization roles: ${error.message}`);
    }

    return (data as any[]) || [];
  }

  /**
   * Get a specific role by ID
   */
  static async getRoleById(roleId: string): Promise<OrganizationRole | null> {
    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Get a role by organization and role_id
   */
  static async getRoleByOrgAndRoleId(
    organizationId: string,
    roleId: string
  ): Promise<OrganizationRole | null> {
    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('role_id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Create a new organization role
   */
  static async createRole(params: CreateRoleParams): Promise<OrganizationRole> {
    const roleData = {
      organization_id: params.organization_id,
      role_id: params.role_id,
      role_name: params.role_name,
      display_name: params.display_name,
      description: params.description || null,
      permissions: params.permissions || [],
      hierarchy_level: params.hierarchy_level ?? 0,
      capabilities: params.capabilities || [],
      ai_config: params.ai_config || {},
      is_active: true,
    };

    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .insert(roleData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Update an existing role
   */
  static async updateRole(
    roleId: string,
    params: UpdateRoleParams
  ): Promise<OrganizationRole> {
    const updateData: any = { ...params };
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Soft delete a role (set is_active = false)
   */
  static async deleteRole(roleId: string): Promise<void> {
    const { error } = await assertSupabase()
      .from('organization_roles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', roleId);

    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  /**
   * Get capabilities for a role
   * Merges organization-specific capabilities with system defaults
   */
  static async getRoleCapabilities(
    organizationId: string,
    roleId: string
  ): Promise<Capability[]> {
    const role = await this.getRoleByOrgAndRoleId(organizationId, roleId);

    if (!role) {
      return [];
    }

    return role.capabilities as Capability[];
  }

  /**
   * Check if a role exists in an organization
   */
  static async roleExists(organizationId: string, roleId: string): Promise<boolean> {
    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('role_id', roleId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check role existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Get roles that a user can assign (based on hierarchy)
   */
  static async getAssignableRoles(
    organizationId: string,
    userHierarchyLevel: number
  ): Promise<OrganizationRole[]> {
    const { data, error } = await assertSupabase()
      .from('organization_roles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lte('hierarchy_level', userHierarchyLevel)
      .order('hierarchy_level', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch assignable roles: ${error.message}`);
    }

    return (data as any[]) || [];
  }

  /**
   * Initialize default roles for a new organization
   */
  static async initializeDefaultRoles(
    organizationId: string,
    organizationType: string = 'preschool'
  ): Promise<void> {
    // Define default roles based on organization type
    const defaultRoles = this.getDefaultRolesForType(organizationType);

    // Create each default role
    for (const roleParams of defaultRoles) {
      try {
        await this.createRole({
          ...roleParams,
          organization_id: organizationId,
        });
      } catch (error) {
        console.warn(`Failed to create default role ${roleParams.role_id}:`, error);
        // Continue with other roles even if one fails
      }
    }
  }

  /**
   * Get default role definitions for an organization type
   */
  private static getDefaultRolesForType(orgType: string): CreateRoleParams[] {
    // Map organization types to their default role structures
    switch (orgType) {
      case 'preschool':
      case 'k12_school':
        return [
          {
            organization_id: '', // Will be set by caller
            role_id: 'principal',
            role_name: 'principal',
            display_name: 'Principal',
            description: 'School administrator with full access',
            hierarchy_level: 100,
            permissions: ['*'],
            capabilities: ['manage_organization', 'manage_teachers', 'manage_students'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'teacher',
            role_name: 'teacher',
            display_name: 'Teacher',
            description: 'Classroom teacher',
            hierarchy_level: 50,
            permissions: ['view_students', 'manage_classes', 'create_assignments'],
            capabilities: ['manage_classes', 'create_assignments', 'grade_assignments'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'parent',
            role_name: 'parent',
            display_name: 'Parent',
            description: 'Student guardian',
            hierarchy_level: 10,
            permissions: ['view_own_children'],
            capabilities: ['view_child_progress', 'communicate_with_teachers'] as Capability[],
          },
        ];

      case 'corporate':
        return [
          {
            organization_id: '',
            role_id: 'manager',
            role_name: 'manager',
            display_name: 'Manager',
            description: 'Department manager',
            hierarchy_level: 100,
            permissions: ['*'],
            capabilities: ['manage_organization', 'manage_teachers'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'trainer',
            role_name: 'trainer',
            display_name: 'Trainer',
            description: 'Training facilitator',
            hierarchy_level: 50,
            permissions: ['manage_courses', 'view_trainees'],
            capabilities: ['create_assignments', 'view_class_analytics'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'employee',
            role_name: 'employee',
            display_name: 'Employee',
            description: 'Regular employee',
            hierarchy_level: 10,
            permissions: ['view_own_progress'],
            capabilities: ['access_homework_help'] as Capability[],
          },
        ];

      case 'sports_club':
        return [
          {
            organization_id: '',
            role_id: 'director',
            role_name: 'director',
            display_name: 'Director',
            description: 'Club director',
            hierarchy_level: 100,
            permissions: ['*'],
            capabilities: ['manage_organization', 'manage_teachers'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'coach',
            role_name: 'coach',
            display_name: 'Coach',
            description: 'Team coach',
            hierarchy_level: 50,
            permissions: ['manage_teams', 'view_athletes'],
            capabilities: ['manage_classes', 'create_assignments'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'athlete',
            role_name: 'athlete',
            display_name: 'Athlete',
            description: 'Team member',
            hierarchy_level: 10,
            permissions: ['view_own_progress'],
            capabilities: ['view_child_progress'] as Capability[],
          },
        ];

      default:
        // Generic defaults
        return [
          {
            organization_id: '',
            role_id: 'admin',
            role_name: 'admin',
            display_name: 'Administrator',
            description: 'Organization administrator',
            hierarchy_level: 100,
            permissions: ['*'],
            capabilities: ['manage_organization'] as Capability[],
          },
          {
            organization_id: '',
            role_id: 'member',
            role_name: 'member',
            display_name: 'Member',
            description: 'Regular member',
            hierarchy_level: 10,
            permissions: ['view_own_data'],
            capabilities: ['view_dashboard'] as Capability[],
          },
        ];
    }
  }
}
