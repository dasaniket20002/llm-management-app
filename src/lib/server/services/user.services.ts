import type { PrismaTransaction } from '../db/db'
import type { PrismaClient } from '../db/generated/client'

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
