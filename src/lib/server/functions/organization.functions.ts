import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import { authMiddleware } from './auth.functions'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { prisma } from '../db/db'

export const createOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data) => data)
  .handler(async () => {
    return 0
  })

export const updateOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data) => data)
  .handler(async () => {
    return 0
  })

export const deleteOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data) => data)
  .handler(async () => {
    return 0
  })

export const organizationIdentifierAvailable = createServerFn({
  method: 'POST',
})
  .inputValidator((data) =>
    z.object({ identifier: z.string() }).safeParse(data),
  )
  .handler(async ({ data }) => {
    if (!data.success) return serverFnErrorResponse('Validation Error', null)
    const inputData = data.data

    const org = await prisma.organization.findUnique({
      where: { identifier: inputData.identifier },
    })

    const available = !org
    return serverFnSuccessResponse(
      available ? 'Identifer Valid' : 'Identifier Invalid',
      available,
    )
  })
