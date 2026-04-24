import { auth } from '#/lib/auth'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { generateTxId } from '../db/db'
import type { Visibility } from '../db/generated/enums'
import { createFileResourceService } from '../services/file.services'
import {
  checkPermissionService,
  grantRoleService,
} from '../services/permission.services'
import {
  createUserResourceService,
  deleteUserResourceService,
  updateUserAvatarService,
  updateUserBucketService,
  updateUsernameService,
} from '../services/user.services'
import {
  authMiddleware,
  authMiddlewareWithOrganization,
} from './auth.functions'

/**
 * Creates a new user resource within the current organization and grants ownership roles.
 * Requires authentication via authMiddlewareWithOrganization.
 *
 * @param data.name - Display name of the user.
 * @param data.email - Email address of the user.
 * @param data.emailVerified - Optional flag indicating if email is verified.
 * @param data.imageFileId - Optional profile image file ID.
 * @param data.username - Unique username for the user.
 * @param data.visibility - Optional visibility setting (public/private).
 * @returns A success response containing the created user and transaction ID.
 * @throws Returns error if user lacks 'create:user' permission.
 * @example
 * const { data } = await createUserResource({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   username: 'john_doe'
 * })
 */
export const createUserResource = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator(
    (data: {
      name: string
      email: string
      emailVerified?: boolean
      imageFileId?: string
      username: string
      visibility?: Visibility
    }) => data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        permission: 'create:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - create:user',
          txid,
        })

      const user = await createUserResourceService({
        ...data,
        currentUserId: context.session.user.id,
        prisma: tx,
      })

      const roleOwnerPromise = grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.session.organizationId,
        targetResourceId: user.id,
        role: 'user_owner',
        prisma: tx,
      })
      const roleManagedPromise = grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: user.id,
        targetResourceId: user.id,
        role: 'user_managed',
        prisma: tx,
      })
      await Promise.all([roleOwnerPromise, roleManagedPromise])

      return serverFnSuccessResponse('Created', { user, txid })
    }),
  )

export const deleteUserResource = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.session.organizationId,
        targetResourceId: data.userId,
        permission: 'delete:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - delete:user',
          txid,
        })

      const user = await deleteUserResourceService({
        id: data.userId,
        prisma: tx,
      })

      return serverFnSuccessResponse('Deleted', { user, txid })
    }),
  )

/**
 * Checks if the current user has a password set on their account.
 * Requires authentication via authMiddleware.
 *
 * @returns A success response containing { data: boolean } - true if password is set.
 * @example
 * const { data } = await isPasswordSet()
 * if (data) { console.log('User has a password') }
 */
export const isPasswordSet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const accs = await context.prisma.account.findMany({
      where: { userId: context.session.user.id },
      select: { password: true },
    })

    const ps = accs.some((_a) => !!_a.password)
    return serverFnSuccessResponse(ps ? 'Password Set' : 'Password Unset', ps)
  })

/**
 * Checks if the current user has any passkeys registered.
 * Requires authentication via authMiddleware.
 *
 * @returns A success response containing { data: boolean } - true if passkeys exist.
 * @example
 * const { data } = await isPasskeySet()
 * if (data) { console.log('User has passkeys') }
 */
export const isPasskeySet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const passkeys = await context.prisma.passkey.findMany({
      where: { userId: context.session.user.id },
      select: { id: true },
    })

    const ps = passkeys.length > 0
    return serverFnSuccessResponse(ps ? 'Passkey Set' : 'Passkey Unset', ps)
  })

/**
 * Checks if the current user has a username set.
 * Requires authentication via authMiddleware.
 *
 * @returns A success response containing { data: string | null } - the username or null.
 * @example
 * const { data } = await isUsernameSet()
 * if (data) { console.log(`Username: ${data}`) }
 */
export const isUsernameSet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const user = await context.prisma.user.findUnique({
      where: { id: context.session.user.id },
      select: { username: true },
    })
    return serverFnSuccessResponse(
      user?.username ? 'Username Set' : 'Username Unset',
      user?.username,
    )
  })

/**
 * Updates the current user's password.
 * Requires authentication via authMiddleware.
 *
 * @param data.newPassword - The new password to set.
 * @returns A success response on success.
 * @throws Returns error if user lacks 'update_password:user' permission.
 * @example
 * const { data } = await updatePassword({ newPassword: 'newPass123!' })
 */
export const updatePassword = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { newPassword: string }) => data)
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.user.id,
      permission: 'update_password:user',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        message: 'Permission required - update_password:user',
      })

    const headers = getRequestHeaders()
    const res = await auth.api.setPassword({
      body: {
        newPassword: data.newPassword,
      },
      headers: headers,
    })

    if (!res.status)
      return serverFnErrorResponse('Internal Error', {
        message: `An Internal Error has occured`,
      })
    return serverFnSuccessResponse('Success', null)
  })

/**
 * Updates the current user's username.
 * Requires authentication via authMiddleware.
 *
 * @param data.newUsername - The new username to set.
 * @returns A success response containing the updated user object.
 * @throws Returns error if user lacks 'update_username:user' permission.
 * @example
 * const { data } = await updateUsername({ newUsername: 'new_username' })
 */
export const updateUsername = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { newUsername: string }) => data)
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.user.id,
      permission: 'update_username:user',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        message: 'Permission required - update_username:user',
      })

    const updated = await updateUsernameService({
      userId: context.session.user.id,
      newUsername: data.newUsername,
      prisma: context.prisma,
    })

    return serverFnSuccessResponse('Success', updated)
  })

/**
 * Updates the current user's storage bucket ID.
 * Requires authentication via authMiddleware.
 *
 * @param data.storageBucketId - The ID of the storage bucket to assign.
 * @returns A success response on success.
 * @throws Returns error if user lacks 'create_bucket:user' permission.
 * @example
 * const { data } = await updateUserBucket({ storageBucketId: 'bucket_123' })
 */
export const updateUserBucket = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { storageBucketId: string }) => data)
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.user.id,
      permission: 'create_bucket:user',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        message: 'Permission required - create_bucket:user',
      })

    await updateUserBucketService({
      userId: context.session.user.id,
      storageBucketId: data.storageBucketId,
      prisma: context.prisma,
    })
  })

/**
 * Updates the current user's avatar by creating a new file resource and linking it.
 * Requires authentication via authMiddleware.
 *
 * @param data.originalName - Original filename of the avatar image.
 * @param data.displayName - Optional display name for the image.
 * @param data.mimeType - MIME type of the image.
 * @param data.extension - File extension (e.g., 'jpg', 'png').
 * @param data.sizeBytes - File size in bytes.
 * @param data.storageKey - Storage key/path in MinIO.
 * @returns A success response containing the updated user object.
 * @throws Returns error if user lacks 'update_avatar:user' permission or bucket not found.
 * @example
 * const { data } = await updateUserAvatar({
 *   originalName: 'avatar.jpg',
 *   extension: 'jpg',
 *   sizeBytes: 50000,
 *   storageKey: 'avatars/user.jpg'
 * })
 */
export const updateUserAvatar = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (data: {
      originalName: string
      displayName?: string
      mimeType: string
      extension: string
      sizeBytes: number
      storageKey: string
    }) => data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.user.id,
        permission: 'update_avatar:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - update_avatar:user',
        })

      const bucket = await tx.user.findUnique({
        where: { id: context.session.user.id },
        select: { storageBucketId: true },
      })
      if (!bucket || !bucket.storageBucketId)
        return serverFnErrorResponse('Not Found', {
          message: 'Bucket not available',
        })

      const file = await createFileResourceService({
        currentUserId: context.session.user.id,
        originalName: data.originalName,
        displayName: data.displayName,
        extension: data.extension,
        sizeBytes: data.sizeBytes,
        storageKey: data.storageKey,
        storageBucketId: bucket.storageBucketId,
        visibility: 'public',
        prisma: tx,
      })
      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.user.id,
        targetResourceId: file.id,
        role: 'file_owner',
        prisma: tx,
      })
      const updated = await updateUserAvatarService({
        userId: context.session.user.id,
        imageFileId: file.id,
        prisma: tx,
      })

      return serverFnSuccessResponse('Created', updated)
    }),
  )
