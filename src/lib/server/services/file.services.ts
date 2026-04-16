import type { PrismaTransaction } from '../db/db'
import type { PrismaClient, Visibility } from '../db/generated/client'

export async function createFileResourceService({
  originalName,
  displayName,
  extension,
  sizeBytes,
  storageBucketId,
  storageKey,
  currentUserId,
  visibility = 'private',
  prisma,
}: {
  originalName: string
  displayName?: string
  extension: string
  sizeBytes: number
  storageKey: string
  storageBucketId: string
  currentUserId: string
  visibility?: Visibility
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.create({
    data: {
      resourceType: 'file',
      createdById: currentUserId,
      visibility,
      file: {
        create: {
          originalName,
          displayName,
          extension,
          sizeBytes,
          storageBucketId,
          storageKey,
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
