import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { auth } from '#/lib/auth'
import { serializeError } from '#/lib/utils/utils'
import { prisma } from '../db/db'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })

      return serverFnSuccessResponse('Success', session)
    } catch (e) {
      console.error(e)
      return serverFnErrorResponse('Internal Error', {
        error: serializeError(e),
      })
    }
  },
)

export const ensureSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })

      if (!session) return serverFnErrorResponse('Not Found', null)

      return serverFnSuccessResponse('Found', session)
    } catch (e) {
      console.error(e)
      return serverFnErrorResponse('Internal Error', {
        error: serializeError(e),
      })
    }
  },
)

export const updateSessionOrganization = createServerFn({ method: 'POST' })
  .inputValidator((data: { organizationId: string | null | undefined }) => data)
  .handler(async ({ data }) => {
    try {
      const headers = getRequestHeaders()

      const session = await auth.api.updateSession({
        body: { organizationId: data.organizationId },
        headers,
      })

      return serverFnSuccessResponse('Found', session)
    } catch (e) {
      console.error(e)
      return serverFnErrorResponse('Internal Error', {
        error: serializeError(e),
      })
    }
  })

export const authMiddleware = createMiddleware().server(
  async ({ next, pathname }) => {
    const sessionData = await ensureSession()
    if (!sessionData.success) throw redirect({ to: '/sign-in' })
    if (
      !pathname.endsWith('/org-settings') &&
      !sessionData.data.session.organizationId
    )
      throw redirect({ to: '/org-settings' })

    return next({
      context: { sessionData: sessionData.data, prisma },
    })
  },
)
