import { auth } from '#/lib/auth'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { createFileResourceService } from '../services/file.services'
import {
  checkPermissionService,
  grantRoleService,
} from '../services/permission.services'
import {
  updateUserAvatarService,
  updateUserBucketService,
  updateUsernameService,
} from '../services/user.services'
import { authMiddleware } from './auth.functions'

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

export const isUsernameSet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const us = !!context.session.user.username
    return serverFnSuccessResponse(us ? 'Username Set' : 'Username Unset', us)
  })

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
        permissionsRequired: 'user:update:password',
      })

    const headers = getRequestHeaders()
    const res = await auth.api.setPassword({
      body: {
        newPassword: data.newPassword,
      },
      headers: headers,
    })

    if (!res.status) return serverFnErrorResponse('Internal Error', null)
    return serverFnSuccessResponse('Success', null)
  })

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
        permissionsRequired: 'update_username:user',
      })

    const updated = await updateUsernameService({
      userId: context.session.user.id,
      newUsername: data.newUsername,
      prisma: context.prisma,
    })

    if (!updated.id) return serverFnErrorResponse('Not Found', updated)
    return serverFnSuccessResponse('Success', updated)
  })

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
        permissionsRequired: 'create_bucket:user',
      })

    await updateUserBucketService({
      userId: context.session.user.id,
      storageBucketId: data.storageBucketId,
      prisma: context.prisma,
    })
  })

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
  .handler(async ({ data, context }) => {
    const hasSelfPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.user.id,
      permission: 'update_avatar:user',
      prisma: context.prisma,
    })
    if (hasSelfPermission)
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'update_avatar:user',
      })

    const bucket = await context.prisma.user.findUnique({
      where: { id: context.session.user.id },
      select: { storageBucketId: true },
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
        storageBucketId: bucket.storageBucketId!,
        prisma: tx,
      })
      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.user.id,
        targetResourceId: file.id,
        role: 'file_owner',
        prisma: tx,
      })
      const _updated = await updateUserAvatarService({
        userId: context.session.user.id,
        imageFileId: file.id,
        prisma: tx,
      })
      return _updated
    })

    return serverFnSuccessResponse('Created', updated)
  })
