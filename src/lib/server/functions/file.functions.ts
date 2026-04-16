import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from './auth.functions'
import {
  checkPermissionService,
  grantRoleService,
} from '../services/permission.services'
import { generateTxId } from '../db/db'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { createFileResourceService } from '../services/file.services'
import type { Visibility } from '../db/generated/enums'

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
