import z from 'zod'

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: z.string(),
  imageFileId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  storageBucketId: z.string(),
})
