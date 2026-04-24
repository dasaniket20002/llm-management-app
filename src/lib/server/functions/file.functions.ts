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

/**
 * Creates a new file resource in the database and grants file ownership to the owner.
 * Requires authentication via authMiddleware.
 *
 * @param data.originalName - The original filename of the file.
 * @param data.displayName - Optional display name for the file.
 * @param data.extension - File extension (e.g., 'jpg', 'pdf').
 * @param data.sizeBytes - File size in bytes.
 * @param data.storageKey - The storage key/path in MinIO.
 * @param data.storageBucketId - The MinIO bucket ID for storage.
 * @param data.ownerResourceId - Optional ID of the owning resource (user or organization).
 * @param data.visibility - Optional visibility setting (public/private).
 * @returns A success response containing the created file object and transaction ID.
 * @throws Returns error if user lacks 'create:file' permission.
 * @example
 * const { data } = await createFileResource({
 *   originalName: 'photo.jpg',
 *   displayName: 'My Photo',
 *   extension: 'jpg',
 *   sizeBytes: 1024000,
 *   storageKey: 'files/photo.jpg',
 *   storageBucketId: 'bucket_123'
 * })
 */
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
          message: 'Permission required - create:file',
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

/**
 * Generates a presigned URL for uploading a file to MinIO storage.
 * Requires authentication via authMiddleware.
 *
 * @param data.originalName - The original filename being uploaded.
 * @param data.extension - File extension (e.g., 'jpg', 'pdf').
 * @param data.ownerResourceId - Optional ID of the owning resource (user or organization).
 * @param data.expiryTime - Optional URL expiration time in seconds (default: 3600).
 * @returns A success response containing the presigned PUT URL.
 * @throws Returns error if user lacks 'create:file' permission or resource not found.
 * @example
 * const { data } = await getPresignedPutUrl({
 *   originalName: 'photo.jpg',
 *   extension: 'jpg',
 *   expiryTime: 7200
 * })
 * // Use data.url to upload file directly to MinIO
 */
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
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.ownerResourceId ?? context.session.user.id,
        permission: 'create:file',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - create:file',
        })

      const ownerResource = await getResourceDetailsService({
        id: data.ownerResourceId ?? context.session.user.id,
        prisma: tx,
      })
      const bucketId =
        ownerResource?.organization?.storageBucketId ||
        ownerResource?.user?.storageBucketId
      if (!bucketId) {
        return serverFnErrorResponse('Not found', {
          message: `Resource not found with ID - ${data.ownerResourceId ?? context.session.user.id}`,
        })
      }

      const url = await getPresignedPutUrlService({
        bucketId,
        extension: data.extension,
        originalName: data.originalName,
        exipryTime: data.expiryTime,
      })

      return serverFnSuccessResponse('Success', url)
    }),
  )

/**
 * Generates a presigned URL for downloading a file from MinIO storage.
 * Requires authentication via authMiddleware. Checks both file and owner permissions.
 *
 * @param data.fileId - The ID of the file resource to download.
 * @param data.ownerResourceId - Optional ID of the owning resource (user or organization).
 * @param data.expiryTime - Optional URL expiration time in seconds (default: 3600).
 * @returns A success response containing the presigned GET URL.
 * @throws Returns error if user lacks 'read:file' permission or file/resource not found.
 * @example
 * const { data } = await getPresignedGetUrl({
 *   fileId: 'file_123',
 *   expiryTime: 3600
 * })
 * // Use data.url to download the file from MinIO
 */
export const getPresignedGetUrl = createServerFn({
  method: 'POST',
})
  .middleware([authMiddleware])
  .inputValidator(
    (data: { fileId: string; ownerResourceId?: string; expiryTime?: number }) =>
      data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const hasSelfPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.fileId,
        permission: 'read:file',
        prisma: tx,
      })
      if (!hasSelfPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - read:file',
        })
      else if (data.ownerResourceId) {
        const hasOwnerPermission = await checkPermissionService({
          subjectResourceId: context.session.user.id,
          targetResourceId: data.ownerResourceId,
          permission: 'read:file',
          prisma: tx,
        })
        if (!hasOwnerPermission)
          return serverFnErrorResponse('Unauthorized', {
            message: 'Permission required - read:file',
          })
      }

      const ownerResourcePromise = getResourceDetailsService({
        id: data.ownerResourceId ?? context.session.user.id,
        prisma: tx,
      })
      const fileResourcePromise = getFileDetailsService({
        id: data.fileId,
        prisma: tx,
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
          message: `Resource not found with ID - ${data.ownerResourceId ?? context.session.user.id}`,
        })
      }

      if (!fileResource) {
        return serverFnErrorResponse('Not found', {
          message: `File not found with ID - ${data.fileId}`,
        })
      }

      const url = await getPresignedGetUrlService({
        bucketId,
        storageKey: fileResource.storageKey,
        expireTime: data.expiryTime,
      })

      return serverFnSuccessResponse('Success', url)
    }),
  )
