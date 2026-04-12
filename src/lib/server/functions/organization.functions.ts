import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import {
  authMiddleware,
  authMiddlewareWithOrganization,
} from './auth.functions'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { prisma } from '../db/db'
import {
  checkPermissionService,
  grantRoleService,
} from '../services/permission.services'
import { updateOrganizationMemberUsername } from '../services/organization.services'
import { createFileResourceService } from '../services/file.services'
import { updateUserAvatarService } from '../services/user.services'
import type { Role } from '../db/roles_permissions'

export const createOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data) => data)
  .handler(async () => {
    return 0
  })

export const updateOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data) => data)
  .handler(async () => {
    return 0
  })

export const deleteOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data) => data)
  .handler(async () => {
    return 0
  })

export const organizationIdentifierAvailable = createServerFn({
  method: 'POST',
})
  .inputValidator((data) =>
    z.object({ identifier: z.string() }).safeParse(data),
  )
  .handler(async ({ data }) => {
    if (!data.success) return serverFnErrorResponse('Validation Error', null)
    const inputData = data.data

    const org = await prisma.organization.findUnique({
      where: { identifier: inputData.identifier },
    })

    const available = !org
    return serverFnSuccessResponse(
      available ? 'Identifer Valid' : 'Identifier Invalid',
      available,
    )
  })

export const updateMemberUsername = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator((data: { newUsername: string; userId: string }) => data)
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.session.organizationId,
      targetResourceId: data.userId,
      permission: 'update_username:user',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'update_username:user',
      })

    const updated = await updateOrganizationMemberUsername({
      userId: data.userId,
      organizationId: context.session.session.organizationId,
      username: data.newUsername,
      prisma: context.prisma,
    })

    if (!updated.organizationId || !updated.userId)
      return serverFnErrorResponse('Not Found', null)
    return serverFnSuccessResponse('Success', updated)
  })

export const updateMemberAvatar = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator(
    (data: {
      originalName: string
      displayName?: string
      mimeType: string
      extension: string
      sizeBytes: number
      storageKey: string
      userId: string
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.session.organizationId,
      targetResourceId: data.userId,
      permission: 'update_avatar:user',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'update_avatar:user',
      })

    const bucket = await context.prisma.organization.findUnique({
      where: {
        id: context.session.session.organizationId,
      },
      select: {
        storageBucketId: true,
      },
    })
    if (!bucket || !bucket.storageBucketId)
      return serverFnErrorResponse('Not Found', {
        message: 'Bucket not available',
      })

    const updated = await context.prisma.$transaction(async (tx) => {
      const file = await createFileResourceService({
        currentUserId: context.session.user.id,
        originalName: data.originalName,
        displayName: data.displayName,
        extension: data.extension,
        sizeBytes: data.sizeBytes,
        storageKey: data.storageKey,
        storageBucketId: bucket.storageBucketId,
        prisma: tx,
      })
      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.session.organizationId,
        targetResourceId: file.id,
        role: 'file_owner',
        prisma: tx,
      })
      const _updated = await updateUserAvatarService({
        userId: data.userId,
        imageFileId: file.id,
        prisma: tx,
      })
      return _updated
    })

    return serverFnSuccessResponse('Created', updated)
  })

export const grantRoleToMember = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator(
    (data: {
      role: Role | (string & {})
      userId: string
      expiresAt?: Date | null
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.session.organizationId,
      permission: 'assign_role:user',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'assign_role:user',
      })

    const role = await grantRoleService({
      currentUserId: context.session.user.id,
      subjectResourceId: data.userId,
      targetResourceId: context.session.session.organizationId,
      role: data.role,
      expiresAt: data.expiresAt,
      prisma: context.prisma,
    })

    return serverFnSuccessResponse('Success', role)
  })
