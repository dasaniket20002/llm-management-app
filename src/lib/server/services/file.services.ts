import { getMimeType } from '#/lib/utils/utils'
import type { PrismaTransaction } from '../db/db'
import type { PrismaClient } from '../db/generated/client'

export async function createFileResourceService({
  originalName,
  displayName,
  extension,
  sizeBytes,
  storageBucketId,
  storageKey,
  currentUserId,
  prisma,
}: {
  originalName: string
  displayName?: string
  extension: string
  sizeBytes: number
  storageKey: string
  storageBucketId: string
  currentUserId: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.create({
    data: {
      resourceType: 'file',
      createdById: currentUserId,
      file: {
        create: {
          originalName,
          displayName,
          extension,
          sizeBytes,
          storageBucketId,
          storageKey,
          mimeType: getMimeType(extension),
        },
      },
    },
    select: {
      id: true,
    },
  })
}

export async function downloadFileService({ link }: { link: string }) {
  const response = await fetch(link)

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }

  // Convert response to Buffer
  const arrayBuffer = await response.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const extension = contentType.split('/')[1] || 'jpg'

  return { imageBuffer, contentType, extension }
}
