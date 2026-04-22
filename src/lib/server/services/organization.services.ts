import type { PrismaTransaction } from '../db/db'
import type {
  PrismaClient,
  UserOrgStatus,
  Visibility,
} from '../db/generated/client'

export async function createOrganizationResourceService({
  name,
  identifier,
  imageFileId,
  storageBucketId,
  currentUserId,
  visibility = 'public',
  prisma,
}: {
  name: string
  identifier: string
  imageFileId?: string
  storageBucketId: string
  currentUserId: string
  visibility?: Visibility
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.create({
    data: {
      resourceType: 'organization',
      createdById: currentUserId,
      visibility,
      organization: {
        create: {
          name,
          identifier,
          imageFileId,
          storageBucketId,
        },
      },
    },
    select: {
      id: true,
    },
  })
}

export async function updateOrganizationResourceService({
  id,
  name,
  identifier,
  imageFileId,
  visibility = 'public',
  prisma,
}: {
  id: string
  name?: string
  identifier?: string
  imageFileId?: string
  visibility?: Visibility
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.update({
    where: { id },
    data: {
      visibility,
      organization: {
        update: {
          name,
          identifier,
          imageFileId,
        },
      },
    },
    select: {
      id: true,
    },
  })
}

export async function deleteOrganizationResourceService({
  id,
  prisma,
}: {
  id: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.$transaction(async (tx) => {
    await tx.organization.delete({ where: { id } })
    return await tx.resource.delete({ where: { id }, select: { id: true } })
  })
}

export async function addMemberToOrganizationService({
  organizationId,
  userId,
  status,
  prisma,
}: {
  organizationId: string
  userId: string
  status: Extract<UserOrgStatus, 'invited' | 'requested' | 'active'>
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.userOrganization.create({
    data: {
      status,
      userId,
      organizationId,
    },
  })
}

export async function updateUserMembershipStatusService({
  organizationId,
  userId,
  status,
  prisma,
}: {
  organizationId: string
  userId: string
  status: Exclude<UserOrgStatus, 'invited' | 'requested'>
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.userOrganization.update({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    data: {
      status,
      joinedAt: status === 'active' ? new Date() : undefined,
    },
  })
}

export async function updateOrganizationMemberUsernameService({
  userId,
  organizationId,
  username,
  prisma,
}: {
  userId: string
  organizationId: string
  username: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.userOrganization.update({
    where: {
      organizationId_userId: {
        userId,
        organizationId,
      },
      status: 'active',
    },
    data: {
      user: {
        update: {
          username,
        },
      },
    },
    select: {
      userId: true,
      organizationId: true,
    },
  })
}

export async function updateOrganizationMemberAvatarService({
  userId,
  organizationId,
  imageFileId,
  prisma,
}: {
  userId: string
  organizationId: string
  imageFileId: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.userOrganization.update({
    where: {
      organizationId_userId: {
        userId,
        organizationId,
      },
      status: 'active',
    },
    data: {
      user: {
        update: {
          imageFileId,
        },
      },
    },
    select: {
      userId: true,
      organizationId: true,
    },
  })
}

export async function getPublicOrganizationsService({
  prisma,
}: {
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.findMany({
    where: {
      visibility: 'public',
      resourceType: 'organization',
    },
    select: { organization: true },
  })
}

export async function getUserOrganizationsService({
  userId,
  prisma,
}: {
  userId: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.userOrganization.findMany({
    where: {
      userId,
    },
    select: {
      organization: true,
    },
  })
}

export async function getOrganizationService({
  id,
  prisma,
}: {
  id: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.organization.findUnique({ where: { id } })
}
