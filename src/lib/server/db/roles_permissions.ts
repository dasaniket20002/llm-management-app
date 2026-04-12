// Core principle:
// SubjectResource has a Role on a TargetResource
// Role grants a set of Permissions
// Permission = Action on a ResourceType inside/owned-by the TargetResource

import type { ResourceType } from './generated/enums'

export type PermissionActionTemplate = `${string}:${ResourceType}`

export const PERMISSIONS_DEFINATIONS = [
  // ===================================================================
  // USER RESOURCE (self profile or members inside org scope)
  // ===================================================================
  {
    action: 'read:user',
    description: 'View basic user profile',
  },
  {
    action: 'read_full:user',
    description: 'View full user profile (email, metadata, admin only)',
  },
  {
    action: 'update_name:user',
    description: 'Change display name',
  },
  {
    action: 'update_username:user',
    description: 'Change username',
  },
  {
    action: 'update_password:user',
    description: 'Change password',
  },
  {
    action: 'update_avatar:user',
    description: 'Change avatar',
  },
  {
    action: 'create:user',
    description: 'Create an user account',
  },
  {
    action: 'delete:user',
    description: 'Delete the user account',
  },
  {
    action: 'create_bucket:user',
    description: 'Create personal storage bucket (usually one-time)',
  },

  // ===================================================================
  // ORGANIZATION RESOURCE (the org itself + global org actions)
  // ===================================================================
  {
    action: 'create:organization',
    description: 'Create a new organization (global permission)',
  },
  {
    action: 'read:organization',
    description: 'View organization details',
  },
  {
    action: 'update:organization',
    description: 'Update organization settings (name, billing, etc.)',
  },
  {
    action: 'delete:organization',
    description: 'Delete the entire organization',
  },
  {
    action: 'join:organization',
    description: 'Join an organization (via invite/link)',
  },
  {
    action: 'leave:organization',
    description: 'Leave an organization',
  },

  // ===================================================================
  // MEMBER MANAGEMENT (users inside an organization scope)
  // ===================================================================
  {
    action: 'invite:user',
    description: 'Invite new members to the organization',
  },
  {
    action: 'remove:user',
    description: 'Remove/kick members from the organization',
  },
  {
    action: 'assign_role:user',
    description: 'Assign roles to members in the organization',
  },

  // ===================================================================
  // CUSTOM ROLES MANAGEMENT (inside organization scope)
  // ===================================================================
  {
    action: 'read_role:organization',
    description: 'View custom roles & permissions',
  },
  {
    action: 'create_role:organization',
    description: 'Create new custom roles',
  },
  {
    action: 'update_role:organization',
    description: 'Edit custom role permissions',
  },
  {
    action: 'delete_role:organization',
    description: 'Delete custom roles',
  },

  // ===================================================================
  // FILE RESOURCE (files inside organization scope OR personal scope OR specific file scope)
  // ===================================================================
  {
    action: 'create:file',
    description: 'Upload/create files in the scoped container',
  },
  {
    action: 'read:file',
    description: 'View/download files',
  },
  {
    action: 'update:file',
    description: 'Edit file content or metadata',
  },
  {
    action: 'delete:file',
    description: 'Delete files',
  },
  {
    action: 'move:file',
    description: 'Move files (including cross-bucket if allowed)',
  },
  {
    action: 'copy:file',
    description: 'Copy files',
  },
  {
    action: 'rename:file',
    description: 'Rename files',
  },
  {
    action: 'share:file',
    description: 'Generate share links or share with users/orgs',
  },
] as const satisfies readonly {
  action: PermissionActionTemplate
  description: string
}[]

export type PermissionAction =
  (typeof PERMISSIONS_DEFINATIONS)[number]['action']

export const PERMISSION_ACTIONS = Object.fromEntries(
  PERMISSIONS_DEFINATIONS.map((p) => [p.action, p.action]),
) as { [K in PermissionAction]: K }

export const ROLES_DEFINATIONS = [
  {
    name: 'super_admin',
    description: 'God mode - full access to everything globally',
    permissions: PERMISSIONS_DEFINATIONS.map((p) => p.action), // literally everything
  },
  {
    name: 'support_admin',
    description: 'Support team - read-most-things + light user fixes (global)',
    permissions: [
      'read_full:user',
      'read:user',
      'update_name:user',
      'update_username:user',
      'update_avatar:user',
      'read:organization',
      'read_role:organization',
      'read:user', // members in any org
      'read:file',
    ],
  },
  {
    name: 'org_owner',
    description:
      'Complete owner of an organization (assigned on organization target)',
    permissions: [
      // Org itself
      'read:organization',
      'update:organization',
      'delete:organization',

      // Members
      'invite:user',
      'create:user', // create managed users for organization
      'remove:user',

      'assign_role:user',

      // Custom roles
      'read_role:organization',
      'create_role:organization',
      'update_role:organization',
      'delete_role:organization',

      // Files in this org
      'create:file',
      'read:file',
      'update:file',
      'delete:file',
      'move:file',
      'copy:file',
      'rename:file',
      'share:file',
    ],
  },
  {
    name: 'org_admin',
    description:
      'Administrator of an organization - cannot delete org or custom roles',
    permissions: [
      'read:organization',
      'update:organization',

      'invite:user',
      'remove:user',
      'create:user', // create managed users for organization

      'assign_role:user',

      'read_role:organization',
      'create_role:organization',
      'update_role:organization',

      'create:file',
      'read:file',
      'update:file',
      'delete:file',
      'move:file',
      'copy:file',
      'rename:file',
      'share:file',
    ],
  },
  {
    name: 'org_member',
    description: 'Standard member - can upload own files and view everything',
    permissions: [
      'read:organization',
      'read:user',
      'read_role:organization',

      'create:file',
      'read:file',
      'update:file',
    ],
  },
  {
    name: 'org_viewer',
    description: 'Read-only access to organization content',
    permissions: [
      'read:organization',
      'read:user',
      'read_role:organization',
      'read:file',
    ],
  },
  {
    name: 'file_owner',
    description: 'Full control over a specific file (assigned on file target)',
    permissions: [
      'read:file',
      'update:file',
      'delete:file',
      'move:file',
      'copy:file',
      'rename:file',
      'share:file',
    ],
  },
  {
    name: 'file_editor',
    description: 'Can edit a specific file but not delete or share',
    permissions: [
      'read:file',
      'update:file',
      'move:file',
      'copy:file',
      'rename:file',
    ],
  },
  {
    name: 'file_viewer',
    description: 'Read-only access to a specific file',
    permissions: ['read:file'],
  },
  {
    name: 'user_owner',
    description:
      'Standard authenticated user rights over own account & personal storage (assigned on own user resource)',
    permissions: [
      'read:user',
      'read_full:user',
      'update_name:user',
      'update_username:user',
      'update_password:user',
      'update_avatar:user',
      'delete:user',
      'create_bucket:user',

      // Personal files (target = own user resource)
      'create:file',
      'read:file',
      'update:file',
      'delete:file',
      'move:file',
      'copy:file',
      'rename:file',
      'share:file',

      // Global actions every real user should have
      'create:organization',
      'join:organization',
      'leave:organization',
    ],
  },
  {
    name: 'user_managed',
    description: 'SCIM/managed user - limited self-service',
    permissions: [
      'read_full:user',
      'update_name:user',
      'update_password:user',
      'update_avatar:user',
    ],
  },
  {
    name: 'external_collaborator',
    description:
      'Guest from another org - limited access (usually assigned on shared files or org)',
    permissions: [
      'read:organization',
      'read:user',
      'read:file',
      'update:file', // can edit shared files
      'copy:file',
    ],
  },
  {
    name: 'guest',
    description: 'Unauthenticated or public share link access',
    permissions: [],
  },
] as const satisfies readonly {
  name: string
  description: string
  permissions: readonly PermissionAction[]
}[]

export type Role = (typeof ROLES_DEFINATIONS)[number]['name']

export const ROLES = Object.fromEntries(
  ROLES_DEFINATIONS.map((r) => [r.name, r.name]),
) as { [K in Role]: K }
