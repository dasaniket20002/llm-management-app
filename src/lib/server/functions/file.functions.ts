import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { createServerFn } from '@tanstack/react-start'
import { generateTxId } from '../db/db'
import type { Visibility } from '../db/generated/enums'
import {
  createFileResourceService,
  getFileDetailsService,
} from '../services/file.services'
import {
  getPresignedGetUrlService,
  getPresignedPutUrlService,
} from '../services/minio.services'
import {
  checkPermissionService,
  grantRoleService,
} from '../services/permission.services'
import { getResourceDetailsService } from '../services/resource.services'
import { authMiddleware } from './auth.functions'

export const createFileResource = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      originalName: string
      displayName?: string
      extension: string
      sizeBytes: number
      storageKey: string
      storageBucketId: string
      ownerResourceId?: string
      visibility?: Visibility
    }) => data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.ownerResourceId ?? context.session.user.id,
        permission: 'create:file',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          permissionsRequired: 'create:file',
          txid,
        })

      const file = await createFileResourceService({
        currentUserId: context.session.user.id,
        originalName: data.originalName,
        extension: data.extension,
        sizeBytes: data.sizeBytes,
        storageBucketId: data.storageBucketId,
        storageKey: data.storageKey,
        displayName: data.displayName,
        visibility: data.visibility,
        prisma: tx,
      })
      await grantRoleService({
        subjectResourceId: data.ownerResourceId ?? context.session.user.id,
        targetResourceId: file.id,
        role: 'file_owner',
        currentUserId: context.session.user.id,
        prisma: tx,
      })

      return serverFnSuccessResponse('Created', { file, txid })
    }),
  )

export const getPresignedPutUrl = createServerFn({
  method: 'POST',
})
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      originalName: string
      extension: string
      ownerResourceId?: string
      expiryTime?: number
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: data.ownerResourceId ?? context.session.user.id,
      permission: 'create:file',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'create:file',
      })

    const ownerResource = await getResourceDetailsService({
      id: data.ownerResourceId ?? context.session.user.id,
      prisma: context.prisma,
    })
    const bucketId =
      ownerResource?.organization?.storageBucketId ||
      ownerResource?.user?.storageBucketId
    if (!bucketId) {
      return serverFnErrorResponse('Not found', {
        id: data.ownerResourceId ?? context.session.user.id,
      })
    }

    const url = await getPresignedPutUrlService({
      bucketId,
      extension: data.extension,
      originalName: data.originalName,
      exipryTime: data.expiryTime,
    })

    return serverFnSuccessResponse('Success', url)
  })

export const getPresignedGetUrl = createServerFn({
  method: 'POST',
})
  .middleware([authMiddleware])
  .inputValidator(
    (data: { fileId: string; ownerResourceId?: string; expiryTime?: number }) =>
      data,
  )
  .handler(async ({ data, context }) => {
    const hasSelfPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: data.fileId,
      permission: 'read:file',
      prisma: context.prisma,
    })
    if (!hasSelfPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'read:file',
      })
    else if (data.ownerResourceId) {
      const hasOwnerPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.ownerResourceId,
        permission: 'read:file',
        prisma: context.prisma,
      })
      if (!hasOwnerPermission)
        return serverFnErrorResponse('Unauthorized', {
          permissionsRequired: 'read:file',
        })
    }

    const ownerResourcePromise = getResourceDetailsService({
      id: data.ownerResourceId ?? context.session.user.id,
      prisma: context.prisma,
    })
    const fileResourcePromise = getFileDetailsService({
      id: data.fileId,
      prisma: context.prisma,
    })

    const [ownerResource, fileResource] = await Promise.all([
      ownerResourcePromise,
      fileResourcePromise,
    ])

    const bucketId =
      ownerResource?.organization?.storageBucketId ||
      ownerResource?.user?.storageBucketId
    if (!bucketId) {
      return serverFnErrorResponse('Not found', {
        ownerId: data.ownerResourceId ?? context.session.user.id,
      })
    }

    if (!fileResource) {
      return serverFnErrorResponse('Not found', {
        fileId: data.fileId,
      })
    }

    const url = await getPresignedGetUrlService({
      bucketId,
      storageKey: fileResource.storageKey,
      expireTime: data.expiryTime,
    })

    return serverFnSuccessResponse('Success', url)
  })
