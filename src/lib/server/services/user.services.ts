import type { PrismaTransaction } from '../db/db'
import type { PrismaClient, Visibility } from '../db/generated/client'

export async function createUserResourceService({
  name,
  email,
  emailVerified = false,
  imageFileId,
  username,
  currentUserId,
  visibility = 'private',
  prisma,
}: {
  name: string
  email: string
  emailVerified?: boolean
  imageFileId?: string
  username: string
  currentUserId: string
  visibility?: Visibility
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.create({
    data: {
      resourceType: 'user',
      createdById: currentUserId,
      visibility,
      user: {
        create: {
          name,
          email,
          emailVerified,
          imageFileId,
          username,
          displayUsername: username.toLowerCase(),
        },
      },
    },
    select: {
      id: true,
    },
  })
}

export async function updateUsernameService({
  userId,
  newUsername,
  prisma,
}: {
  userId: string
  newUsername: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      username: newUsername,
      displayUsername: newUsername.toLowerCase(),
    },
    select: {
      id: true,
    },
  })
}

export async function updateUserBucketService({
  userId,
  storageBucketId,
  prisma,
}: {
  userId: string
  storageBucketId: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      storageBucketId,
    },
    select: {
      id: true,
    },
  })
}

export async function updateUserAvatarService({
  userId,
  imageFileId,
  prisma,
}: {
  userId: string
  imageFileId?: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      imageFileId,
    },
    select: {
      id: true,
    },
  })
}
