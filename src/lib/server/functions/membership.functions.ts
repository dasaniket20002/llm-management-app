import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { createServerFn } from '@tanstack/react-start'
import { generateTxId } from '../db/db'
import type { UserOrgStatus } from '../db/generated/enums'
import {
  addMemberToOrganizationService,
  updateUserMembershipStatusService,
} from '../services/organization.services'
import {
  checkPermissionService,
  grantRoleService,
  revokeAllRolesService,
} from '../services/permission.services'
import {
  authMiddleware,
  authMiddlewareWithOrganization,
} from './auth.functions'

/**
 * Requests to join an organization. Creates a membership request with 'requested' status.
 * Requires authentication via authMiddleware.
 *
 * @param data.organizationId - The ID of the organization to join.
 * @returns A success response containing the created membership object.
 * @throws Returns error if user lacks 'join:organization' permission.
 * @example
 * const { data } = await requestJoin({ organizationId: 'org_123' })
 */
export const requestJoin = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { organizationId: string }) => data)
  .handler(({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.user.id,
        permission: 'join:organization',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - join:organization',
          txid,
        })

      const membership = await addMemberToOrganizationService({
        organizationId: data.organizationId,
        userId: context.session.user.id,
        status: 'requested',
        prisma: tx,
      })

      return serverFnSuccessResponse('Created', { membership, txid })
    }),
  )

/**
 * Invites a user to join the current organization. Creates a membership with 'invited' status.
 * Requires authentication via authMiddlewareWithOrganization.
 *
 * @param data.userId - The ID of the user to invite.
 * @returns A success response containing the created membership object.
 * @throws Returns error if user lacks 'invite:user' permission.
 * @example
 * const { data } = await inviteUser({ userId: 'user_456' })
 */
export const inviteUser = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator((data: { userId: string }) => data)
  .handler(({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        permission: 'invite:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - invite:user',
          txid,
        })

      const membership = await addMemberToOrganizationService({
        organizationId: context.session.session.organizationId,
        userId: data.userId,
        status: 'invited',
        prisma: tx,
      })

      return serverFnSuccessResponse('Created', { membership, txid })
    }),
  )

/**
 * Accepts a user's membership request/invite, setting status to 'active' and granting 'org_member' role.
 * Requires authentication via authMiddlewareWithOrganization.
 *
 * @param data.userId - The ID of the user whose membership to accept.
 * @returns A success response containing the updated membership object.
 * @throws Returns error if user lacks 'assign_role:user' permission or membership not found.
 * @example
 * const { data } = await acceptUser({ userId: 'user_456' })
 */
export const acceptUser = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator((data: { userId: string }) => data)
  .handler(({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        permission: 'assign_role:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - assign_role:user',
          txid,
        })

      const membership = await updateUserMembershipStatusService({
        organizationId: context.session.session.organizationId,
        userId: data.userId,
        status: 'active',
        prisma: tx,
      })

      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: data.userId,
        targetResourceId: context.session.session.organizationId,
        role: 'org_member',
        prisma: tx,
      })

      return serverFnSuccessResponse('Success', { membership, txid })
    }),
  )

/**
 * Accepts an organization invitation/request, setting membership status to 'active' and granting 'org_member' role.
 * Requires authentication via authMiddleware.
 *
 * @param data.organizationId - The ID of the organization to accept invitation from.
 * @returns A success response containing the updated membership object.
 * @throws Returns error if user lacks 'join:organization' permission or membership not found.
 * @example
 * const { data } = await acceptOrganization({ organizationId: 'org_123' })
 */
export const acceptOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.user.id,
        permission: 'join:organization',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - join:organization',
          txid,
        })

      const membership = await updateUserMembershipStatusService({
        organizationId: data.organizationId,
        userId: context.session.user.id,
        status: 'active',
        prisma: tx,
      })

      await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.user.id,
        targetResourceId: data.organizationId,
        role: 'org_member',
        prisma: tx,
      })

      return serverFnSuccessResponse('Success', { membership, txid })
    }),
  )

export const removeUser = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator(
    (data: {
      userId: string
      status: Extract<UserOrgStatus, 'suspended' | 'left'>
    }) => data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        permission: 'remove:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - remove:user',
          txid,
        })

      const membership = await updateUserMembershipStatusService({
        organizationId: context.session.session.organizationId,
        userId: data.userId,
        status: data.status,
        prisma: tx,
      })

      await revokeAllRolesService({
        currentUserId: context.session.user.id,
        subjectResourceId: data.userId,
        targetResourceId: context.session.session.organizationId,
        prisma: tx,
      })

      return serverFnSuccessResponse('Success', { membership, txid })
    }),
  )

export const leaveOrganization = createServerFn({ method: 'GET' })
  .middleware([authMiddlewareWithOrganization])
  .handler(async ({ context }) =>
    context.prisma.$transaction(async (tx) => {
      const txid = await generateTxId(tx)

      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        permission: 'leave:organization',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - leave:organization',
          txid,
        })

      const membership = await updateUserMembershipStatusService({
        organizationId: context.session.session.organizationId,
        userId: context.session.user.id,
        status: 'left',
        prisma: tx,
      })

      const userRolesPromise = revokeAllRolesService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        prisma: tx,
      })
      const organizationRolesPromise = revokeAllRolesService({
        currentUserId: context.session.user.id,
        subjectResourceId: context.session.session.organizationId,
        targetResourceId: context.session.user.id,
        prisma: tx,
      })
      await Promise.all([userRolesPromise, organizationRolesPromise])

      return serverFnSuccessResponse('Success', { membership, txid })
    }),
  )
