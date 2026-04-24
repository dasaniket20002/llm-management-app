import { UserOrgStatus } from '#/lib/server/db/generated/enums'
import z from 'zod'

export const userOrganizationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  status: z.enum(UserOrgStatus),
  joinedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
