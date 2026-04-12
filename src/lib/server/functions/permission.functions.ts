import { createServerFn } from '@tanstack/react-start'
import {
  checkPermissionService,
  checkPermissionsService,
  grantRoleService,
} from '../services/permission.services'
import { authMiddleware } from './auth.functions'
import type { PermissionAction, Role } from '../db/roles_permissions'

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

export const grantRole = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      subjectResourceId: string
      targetResourceId: string
      role: Role | (string & {})
      currentUserId: string
      expiresAt?: Date
    }) => data,
  )
  .handler(async ({ data, context }) =>
    grantRoleService({
      ...data,
      prisma: context.prisma,
    }),
  )
