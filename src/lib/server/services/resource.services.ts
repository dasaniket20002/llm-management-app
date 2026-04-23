import type { PrismaTransaction } from '../db/db'
import type { PrismaClient } from '../db/generated/client'
import type { ResourceType, Visibility } from '../db/generated/enums'

export async function createResourceService({
  resourceType,
  createdById,
  visibility = 'public',
  prisma,
}: {
  resourceType: ResourceType
  createdById?: string
  visibility?: Visibility
  prisma: PrismaClient | PrismaTransaction
}) {
  const resource = await prisma.resource.create({
    data: {
      resourceType,
      visibility,
      createdById,
    },
    select: { id: true },
  })

  return resource
}

export async function getResourceDetailsService({
  id,
  prisma,
}: {
  id: string
  prisma: PrismaClient | PrismaTransaction
}) {
  return await prisma.resource.findUnique({
    where: { id },
    include: { organization: true, user: true, file: true },
  })
}
