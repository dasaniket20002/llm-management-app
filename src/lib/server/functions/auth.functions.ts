import { auth } from '#/lib/auth'
import { serverFnSuccessResponse } from '#/lib/types/server-fn'
import { redirect } from '@tanstack/react-router'
import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { prisma } from '../db/db'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    return serverFnSuccessResponse('Success', session)
  },
)

export const ensureSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) throw redirect({ to: '/sign-in' })

    return serverFnSuccessResponse('Found', session)
  },
)

export const updateSessionOrganization = createServerFn({ method: 'POST' })
  .inputValidator((data: { organizationId: string | null | undefined }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()

    const session = await auth.api.updateSession({
      body: { organizationId: data.organizationId },
      headers,
    })

    return serverFnSuccessResponse('Found', session)
  })

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const sessionData = await getSession()
  const session = sessionData.data
  if (!session) throw redirect({ to: '/sign-in' })

  return next({ context: { session, prisma } })
})

export const authMiddlewareWithOrganization = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const organizationId = context.session.session.organizationId
    if (!organizationId) throw redirect({ to: '/preprocess/session-org-init' })
    return next({
      context: {
        session: {
          ...context.session,
          session: { ...context.session.session, organizationId },
        },
        prisma,
      },
    })
  })
