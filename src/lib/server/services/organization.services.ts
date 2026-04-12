import type { PrismaTransaction } from '../db/db'
import type { PrismaClient } from '../db/generated/client'

export async function updateOrganizationMemberUsername({
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

export async function updateOrganizationMemberAvatar({
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
