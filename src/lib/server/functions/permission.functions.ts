import { createServerFn } from '@tanstack/react-start'
import type { PermissionAction } from '../db/roles_permissions'
import {
  checkPermissionService,
  checkPermissionsService,
} from '../services/permission.services'
import { authMiddleware } from './auth.functions'

/**
 * Checks if a subject has a specific permission on a target resource.
 * Requires authentication via authMiddleware.
 *
 * @param data.subjectResourceId - The ID of the resource that owns the permission check (usually a user).
 * @param data.targetResourceId - The ID of the resource being accessed.
 * @param data.permission - The permission action to check (e.g., 'read:file', 'create:organization').
 * @returns A success response containing a boolean.
 * @example
 * const data = await checkPermission({
 *   subjectResourceId: 'user_123',
 *   targetResourceId: 'org_456',
 *   permission: 'read:organization'
 * })
 * if (data) { console.log('Permission granted') }
 */
export const checkPermission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      subjectResourceId: string
      targetResourceId: string
      permission: PermissionAction
    }) => data,
  )
  .handler(async ({ data, context }) =>
    checkPermissionService({
      ...data,
      prisma: context.prisma,
    }),
  )

/**
 * Checks if a subject has multiple permissions on a target resource.
 * Requires authentication via authMiddleware.
 *
 * @param data.subjectResourceId - The ID of the resource that owns the permission check (usually a user).
 * @param data.targetResourceId - The ID of the resource being accessed.
 * @param data.permissions - An array of permission actions to check.
 * @returns A success response containing an array of booleans.
 * @example
 * const [ permission1, permission2 ] = await checkPermissions({
 *   subjectResourceId: 'user_123',
 *   targetResourceId: 'org_456',
 *   permissions: ['read:organization', 'update:organization']
 * })
 */
export const checkPermissions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      subjectResourceId: string
      targetResourceId: string
      permissions: PermissionAction[]
    }) => data,
  )
  .handler(async ({ data, context }) =>
    checkPermissionsService({
      ...data,
      prisma: context.prisma,
    }),
  )
