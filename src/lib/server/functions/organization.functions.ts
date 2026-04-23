import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { createServerFn } from '@tanstack/react-start'
import { generateTxId } from '../db/db'
import type { Visibility } from '../db/generated/enums'
import type { Role } from '../db/roles_permissions'
import { createFileResourceService } from '../services/file.services'
import { createBucketService } from '../services/minio.services'
import {
  addMemberToOrganizationService,
  createOrganizationResourceService,
  deleteOrganizationResourceService,
  getOrganizationService,
  getPublicOrganizationsService,
  getUserOrganizationsService,
  updateOrganizationMemberUsernameService,
  updateOrganizationResourceService,
} from '../services/organization.services'
import {
  checkPermissionService,
  grantRoleService,
} from '../services/permission.services'
import { updateUserAvatarService } from '../services/user.services'
import {
  authMiddleware,
  authMiddlewareWithOrganization,
  dbMiddleware,
} from './auth.functions'

export const getOrganizationDetails = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.user.id,
      permission: 'read:organization',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'read:organization',
      })

    const organization = await getOrganizationService({
      id: data.id,
      prisma: context.prisma,
    })
    if (!organization) return serverFnErrorResponse('Not Found')
    return serverFnSuccessResponse('Success', { organization })
  })

export const createOrganizationResource = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: { name: string; identifier: string; visibility: Visibility }) =>
      data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.user.id,
        permission: 'create:organization',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          permissionsRequired: 'create:organization',
          txid,
        })

      const bucketId = await createBucketService({
        bucketPrefix: data.identifier,
      })

      const organization = await createOrganizationResourceService({
        currentUserId: context.session.user.id,
        name: data.name,
        identifier: data.identifier,
        storageBucketId: bucketId,
        visibility: data.visibility,
        prisma: tx,
      })

      const addMemberPromise = addMemberToOrganizationService({
        organizationId: organization.id,
        userId: context.session.user.id,
        status: 'active',
        prisma: tx,
      })
      const grantRolePromise = grantRoleService({
        subjectResourceId: context.session.user.id,
        targetResourceId: organization.id,
        currentUserId: context.session.user.id,
        role: 'org_owner',
        prisma: tx,
      })
      await Promise.all([addMemberPromise, grantRolePromise])

      return serverFnSuccessResponse('Created', { organization, txid })
    }),
  )

export const updateOrganizationResource = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      id: string
      name?: string
      identifier?: string
      imageFileId?: string
      visibility?: Visibility
    }) => data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.id,
        permission: 'update:organization',
        prisma: context.prisma,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          permissionsRequired: 'update:organization',
          txid,
        })

      const organization = await updateOrganizationResourceService({
        id: data.id,
        name: data.name,
        identifier: data.identifier,
        imageFileId: data.imageFileId,
        visibility: data.visibility,
        prisma: context.prisma,
      })

      return serverFnSuccessResponse('Updated', { organization, txid })
    }),
  )

export const deleteOrganizationResource = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.id,
        permission: 'delete:organization',
        prisma: context.prisma,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          permissionsRequired: 'delete:organization',
          txid,
        })

      const organization = await deleteOrganizationResourceService({
        id: data.id,
        prisma: tx,
      })

      return serverFnSuccessResponse('Deleted', { organization, txid })
    }),
  )

export const organizationIdentifierAvailable = createServerFn({
  method: 'POST',
})
  .middleware([dbMiddleware])
  .inputValidator((data: { identifier: string }) => data)
  .handler(async ({ data, context }) => {
    const org = await context.prisma.organization.findUnique({
      where: { identifier: data.identifier },
    })

    const available = !org
    return serverFnSuccessResponse('Success', { available })
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

    const updated = await updateOrganizationMemberUsernameService({
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
        visibility: 'private',
        prisma: tx,
      })
      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.session.organizationId,
        targetResourceId: file.id,
        role: 'file_owner',
        prisma: tx,
      })
      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: data.userId,
        targetResourceId: file.id,
        role: 'file_editor',
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

export const getPublicOrganizations = createServerFn({ method: 'GET' })
  .middleware([dbMiddleware])
  .handler(async ({ context }) =>
    getPublicOrganizationsService({
      prisma: context.prisma,
    }),
  )

export const getSelfOrganizations = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    getUserOrganizationsService({
      userId: context.session.user.id,
      prisma: context.prisma,
    }),
  )
