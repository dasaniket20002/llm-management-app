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

/**
 * Retrieves details of a specific organization by ID.
 * Requires authentication via authMiddleware.
 *
 * @param data.organizationId - The ID of the organization to retrieve.
 * @returns A success response containing the organization object.
 * @throws Returns error if user lacks 'read:organization' permission or org not found.
 * @example
 * const { data } = await getOrganizationDetails({ organizationId: 'org_123' })
 */
export const getOrganizationDetails = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data, context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.user.id,
      permission: 'read:organization',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        message: 'Permission required - read:organization',
      })

    const organization = await getOrganizationService({
      id: data.organizationId,
      prisma: context.prisma,
    })
    if (!organization)
      return serverFnErrorResponse('Not Found', {
        message: `Organization not found with ID - ${data.organizationId}`,
      })
    return serverFnSuccessResponse('Success', { organization })
  })

/**
 * Creates a new organization, storage bucket, and adds creator as owner.
 * Requires authentication via authMiddleware.
 *
 * @param data.name - Display name of the organization.
 * @param data.identifier - Unique URL-friendly identifier.
 * @param data.visibility - Visibility setting (public/private).
 * @returns A success response containing the created organization and transaction ID.
 * @throws Returns error if user lacks 'create:organization' permission.
 * @example
 * const { data } = await createOrganizationResource({
 *   name: 'My Org',
 *   identifier: 'my-org',
 *   visibility: 'private'
 * })
 */
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
          message: 'Permission required - create:organization',
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

/**
 * Updates an organization's properties (name, identifier, image, visibility).
 * Requires authentication via authMiddleware.
 *
 * @param data.id - The ID of the organization to update.
 * @param data.name - Optional new display name.
 * @param data.identifier - Optional new unique identifier.
 * @param data.imageFileId - Optional new image file ID.
 * @param data.visibility - Optional new visibility setting.
 * @returns A success response containing the updated organization and transaction ID.
 * @throws Returns error if user lacks 'update:organization' permission.
 * @example
 * const { data } = await updateOrganizationResource({
 *   id: 'org_123',
 *   name: 'New Name'
 * })
 */
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
          message: 'Permission required - update:organization',
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

/**
 * Deletes an organization and all associated data.
 * Requires authentication via authMiddleware.
 *
 * @param data.id - The ID of the organization to delete.
 * @returns A success response containing the deleted organization and transaction ID.
 * @throws Returns error if user lacks 'delete:organization' permission.
 * @example
 * const { data } = await deleteOrganizationResource({ id: 'org_123' })
 */
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
          message: 'Permission required - delete:organization',
          txid,
        })

      const organization = await deleteOrganizationResourceService({
        id: data.id,
        prisma: tx,
      })

      return serverFnSuccessResponse('Deleted', { organization, txid })
    }),
  )

/**
 * Checks if an organization identifier is available (not already taken).
 * Requires dbMiddleware (no auth required).
 *
 * @param data.identifier - The identifier to check for availability.
 * @returns A success response containing { available: boolean }.
 * @example
 * const { data } = await organizationIdentifierAvailable({ identifier: 'my-org' })
 * if (data.available) { console.log('Identifier is available!') }
 */
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

/**
 * Updates a member's username within the current organization.
 * Requires authentication via authMiddlewareWithOrganization.
 *
 * @param data.newUsername - The new username to set.
 * @param data.userId - The ID of the user whose username to update.
 * @returns A success response containing the updated membership.
 * @throws Returns error if user lacks 'update_username:user' permission or user not found.
 * @example
 * const { data } = await updateMemberUsername({
 *   newUsername: 'john_doe',
 *   userId: 'user_456'
 * })
 */
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
        message: 'Permission required - update_username:user',
      })

    const updated = await updateOrganizationMemberUsernameService({
      userId: data.userId,
      organizationId: context.session.session.organizationId,
      username: data.newUsername,
      prisma: context.prisma,
    })

    if (!updated.organizationId || !updated.userId)
      return serverFnErrorResponse('Not Found', {
        message: `User not found with ID - ${data.userId}`,
      })
    return serverFnSuccessResponse('Success', updated)
  })

/**
 * Updates a member's avatar by creating a new file resource and linking it.
 * Requires authentication via authMiddlewareWithOrganization.
 *
 * @param data.originalName - Original filename of the avatar image.
 * @param data.displayName - Optional display name for the image.
 * @param data.mimeType - MIME type of the image.
 * @param data.extension - File extension (e.g., 'jpg', 'png').
 * @param data.sizeBytes - File size in bytes.
 * @param data.storageKey - Storage key/path in MinIO.
 * @param data.userId - The ID of the user whose avatar to update.
 * @returns A success response containing the updated user object.
 * @throws Returns error if user lacks 'update_avatar:user' permission or bucket not found.
 * @example
 * const { data } = await updateMemberAvatar({
 *   originalName: 'avatar.jpg',
 *   extension: 'jpg',
 *   sizeBytes: 50000,
 *   storageKey: 'avatars/user_456.jpg',
 *   userId: 'user_456'
 * })
 */
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
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.session.organizationId,
        targetResourceId: data.userId,
        permission: 'update_avatar:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - update_avatar:user',
        })

      const bucket = await tx.organization.findUnique({
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
      const updated = await updateUserAvatarService({
        userId: data.userId,
        imageFileId: file.id,
        prisma: tx,
      })

      return serverFnSuccessResponse('Created', updated)
    }),
  )

/**
 * Grants a role to a member within the current organization.
 * Requires authentication via authMiddlewareWithOrganization.
 *
 * @param data.role - The role to grant (e.g., 'org_member', 'org_admin').
 * @param data.userId - The ID of the user to grant the role to.
 * @param data.expiresAt - Optional expiration date for the role.
 * @returns A success response containing the granted role.
 * @throws Returns error if user lacks 'assign_role:user' permission.
 * @example
 * const { data } = await grantRoleToMember({
 *   role: 'org_admin',
 *   userId: 'user_456'
 * })
 */
export const grantRoleToMember = createServerFn({ method: 'POST' })
  .middleware([authMiddlewareWithOrganization])
  .inputValidator(
    (data: {
      role: Role | (string & {})
      userId: string
      expiresAt?: Date | null
    }) => data,
  )
  .handler(async ({ data, context }) =>
    context.prisma.$transaction(async (tx) => {
      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: context.session.session.organizationId,
        permission: 'assign_role:user',
        prisma: tx,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - assign_role:user',
        })

      const role = await grantRoleService({
        currentUserId: context.session.user.id,
        subjectResourceId: data.userId,
        targetResourceId: context.session.session.organizationId,
        role: data.role,
        expiresAt: data.expiresAt,
        prisma: tx,
      })

      return serverFnSuccessResponse('Success', role)
    }),
  )

/**
 * Retrieves all public organizations (visibility = 'public').
 * Requires dbMiddleware (no auth required).
 *
 * @returns A success response containing an array of public organizations.
 * @example
 * const { data } = await getPublicOrganizations()
 * data.organizations.forEach(org => console.log(org.name))
 */
export const getPublicOrganizations = createServerFn({ method: 'GET' })
  .middleware([dbMiddleware])
  .handler(async ({ context }) =>
    getPublicOrganizationsService({
      prisma: context.prisma,
    }),
  )

/**
 * Retrieves all organizations the current user is a member of.
 * Requires authentication via authMiddleware.
 *
 * @returns A success response containing an array of the user's organizations.
 * @example
 * const { data } = await getSelfOrganizations()
 * data.organizations.forEach(org => console.log(org.name))
 */
export const getSelfOrganizations = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    getUserOrganizationsService({
      userId: context.session.user.id,
      prisma: context.prisma,
    }),
  )
