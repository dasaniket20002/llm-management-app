import { createServerFn } from '@tanstack/react-start'
import type { PermissionAction } from '../db/roles_permissions'
import {
  checkPermissionService,
  checkPermissionsService,
} from '../services/permission.services'
import { authMiddleware } from './auth.functions'

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
