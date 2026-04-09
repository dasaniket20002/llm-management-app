import type { ResourceType } from './generated/client'

export type PermissionActionTemplate = `${ResourceType}:${string}`

export const PERMISSIONS = [
  // ============================================================================
  // USER PERMISSIONS (Actions user can perform)
  // ============================================================================

  {
    action: 'user:organization:create',
    description: 'Create new organizations',
  },
  {
    action: 'user:organization:join',
    description: 'Join organizations via invite',
  },
  { action: 'user:organization:leave', description: 'Leave organizations' },

  { action: 'user:read:full', description: 'View user full profile' },
  { action: 'user:read', description: 'View user restricted profile' },
  { action: 'user:delete', description: 'Delete user account' },

  { action: 'user:bucket:create', description: 'Create personal bucket' },
  { action: 'user:update:name', description: 'Update display name' },
  { action: 'user:update:username', description: 'Update username' },
  { action: 'user:update:password', description: 'Update password' },
  { action: 'user:update:avatar', description: 'Update profile picture' },

  // ============================================================================
  // ORGANIZATION PERMISSIONS
  // ============================================================================

  // Org - Settings
  { action: 'organization:read', description: 'View organization details' },
  {
    action: 'organization:update',
    description: 'Update organization settings',
  },
  { action: 'organization:delete', description: 'Delete organization' },

  // Org - Members
  {
    action: 'organization:member:read',
    description: 'View organization members',
  },
  { action: 'organization:member:invite', description: 'Invite new members' },
  { action: 'organization:member:create', description: 'Create new members' },
  {
    action: 'organization:member:update',
    description: 'Update member details',
  },
  {
    action: 'organization:member:remove',
    description: 'Remove members from organization',
  },

  // Org - Roles & Permissions
  {
    action: 'organization:role:read',
    description: 'View roles and permissions',
  },
  { action: 'organization:role:create', description: 'Create custom roles' },
  {
    action: 'organization:role:update',
    description: 'Update role permissions',
  },
  { action: 'organization:role:delete', description: 'Delete custom roles' },
  {
    action: 'organization:role:assign',
    description: 'Assign roles to members',
  },

  // Org - Files/Folders
  { action: 'organization:file:read', description: 'View files' },
  { action: 'organization:file:create', description: 'Create files' },
  { action: 'organization:file:update', description: 'Update file details' },
  { action: 'organization:file:delete', description: 'Delete files' },

  // ============================================================================
  // FILE PERMISSIONS
  // ============================================================================

  { action: 'file:create', description: 'Upload new files' },
  { action: 'file:read', description: 'View files' },
  { action: 'file:update', description: 'Edit file content' },
  { action: 'file:delete', description: 'Delete file' },
  { action: 'file:move', description: 'Move file between buckets' },
  { action: 'file:copy', description: 'Copy file' },
  { action: 'file:rename', description: 'Rename file' },
  { action: 'file:share', description: 'Share file' },
] as const satisfies readonly {
  action: PermissionActionTemplate
  description: string
}[]

export type PermissionAction = (typeof PERMISSIONS)[number]['action']

export const ROLES = [
  {
    name: 'super_admin',
    description: 'Full access to everything across the platform',
    permissions: [
      'user:organization:create',
      'user:organization:join',
      'user:organization:leave',
      'user:read:full',
      'user:read',
      'user:delete',
      'user:bucket:create',
      'user:update:name',
      'user:update:username',
      'user:update:password',
      'user:update:avatar',
      'organization:read',
      'organization:update',
      'organization:delete',
      'organization:member:read',
      'organization:member:invite',
      'organization:member:create',
      'organization:member:update',
      'organization:member:remove',
      'organization:role:read',
      'organization:role:create',
      'organization:role:update',
      'organization:role:delete',
      'organization:role:assign',
      'organization:file:read',
      'organization:file:create',
      'organization:file:update',
      'organization:file:delete',
      'file:create',
      'file:read',
      'file:update',
      'file:delete',
      'file:move',
      'file:copy',
      'file:rename',
      'file:share',
    ],
  },
  {
    name: 'support_admin',
    description: 'Support access for user and organization assistance',
    permissions: [
      'user:read:full',
      'user:read',
      'user:update:name',
      'user:update:username',
      'user:update:avatar',
      'organization:read',
      'organization:member:read',
      'organization:file:read',
      'file:read',
    ],
  },
  {
    name: 'org_owner',
    description: 'Full control of an organization and its resources',
    permissions: [
      'organization:read',
      'organization:update',
      'organization:delete',
      'organization:member:read',
      'organization:member:invite',
      'organization:member:create',
      'organization:member:update',
      'organization:member:remove',
      'organization:role:read',
      'organization:role:create',
      'organization:role:update',
      'organization:role:delete',
      'organization:role:assign',
      'organization:file:read',
      'organization:file:create',
      'organization:file:update',
      'organization:file:delete',
      'file:create',
      'file:read',
      'file:update',
      'file:delete',
      'file:move',
      'file:copy',
      'file:rename',
      'file:share',
      'user:read:full',
      'user:read',
      'user:organization:join',
      'user:organization:leave',
      'user:update:name',
      'user:update:username',
      'user:update:avatar',
    ],
  },
  {
    name: 'org_admin',
    description: 'Administrative access without organization deletion',
    permissions: [
      'organization:read',
      'organization:update',
      'organization:member:read',
      'organization:member:invite',
      'organization:member:create',
      'organization:member:update',
      'organization:member:remove',
      'organization:role:read',
      'organization:role:create',
      'organization:role:update',
      'organization:role:assign',
      'organization:file:read',
      'organization:file:create',
      'organization:file:update',
      'organization:file:delete',
      'file:create',
      'file:read',
      'file:update',
      'file:delete',
      'file:move',
      'file:copy',
      'file:rename',
      'file:share',
      'user:read:full',
      'user:read',
      'user:organization:join',
      'user:organization:leave',
      'user:update:name',
      'user:update:username',
      'user:update:avatar',
    ],
  },
  {
    name: 'org_member',
    description: 'Basic member access inside an organization',
    permissions: [
      'organization:read',
      'organization:member:read',
      'organization:file:read',
      'file:create',
      'file:read',
      'user:read',
      'user:organization:join',
      'user:organization:leave',
      'user:update:name',
      'user:update:username',
      'user:update:avatar',
    ],
  },
  {
    name: 'org_viewer',
    description: 'Read-only access to organization data',
    permissions: [
      'organization:read',
      'organization:member:read',
      'organization:file:read',
      'file:read',
      'user:read',
    ],
  },
  {
    name: 'file_owner',
    description: 'Full control of a file',
    permissions: [
      'file:read',
      'file:update',
      'file:delete',
      'file:move',
      'file:copy',
      'file:rename',
      'file:share',
    ],
  },
  {
    name: 'file_editor',
    description: 'Can read and modify a file',
    permissions: [
      'file:read',
      'file:update',
      'file:move',
      'file:copy',
      'file:rename',
    ],
  },
  {
    name: 'file_viewer',
    description: 'Read-only access to a file',
    permissions: ['file:read'],
  },
  {
    name: 'user_owner',
    description: 'Full control over own account and profile',
    permissions: [
      'user:read:full',
      'user:read',
      'user:delete',
      'user:bucket:create',
      'user:update:name',
      'user:update:username',
      'user:update:password',
      'user:update:avatar',
      'user:organization:create',
      'user:organization:join',
      'user:organization:leave',
      'file:create',
    ],
  },
  {
    name: 'user_managed',
    description: 'Managed user account with limited self-service access',
    permissions: [
      'user:read',
      'user:update:name',
      'user:update:password',
      'user:update:avatar',
      'user:organization:join',
      'user:organization:leave',
    ],
  },
  {
    name: 'user_viewer',
    description: 'Read-only profile access',
    permissions: ['user:read'],
  },
  {
    name: 'guest',
    description: 'Unauthenticated or minimal access',
    permissions: [],
  },
  {
    name: 'external_collaborator',
    description: 'Limited cross-org collaboration access',
    permissions: [
      'organization:read',
      'organization:member:read',
      'organization:file:read',
      'file:read',
      'file:update',
      'file:copy',
      'user:read',
    ],
  },
] as const satisfies {
  name: string
  description: string
  permissions: readonly PermissionAction[]
}[]

export type Roles = (typeof ROLES)[number]['name']
