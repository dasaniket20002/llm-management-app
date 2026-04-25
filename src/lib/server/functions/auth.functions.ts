import { auth } from '#/lib/auth'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { redirect } from '@tanstack/react-router'
import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { prisma } from '../db/db'
import { checkPermissionService } from '../services/permission.services'

/**
 * Middleware that provides the Prisma database client to subsequent middleware and handlers.
 * Adds the prisma instance to the context.
 *
 * @context - Adds prisma: PrismaClient to the context object.
 * @example
 * // Usage in chain: .middleware([dbMiddleware])
 */
export const dbMiddleware = createMiddleware().server(({ next }) =>
  next({ context: { prisma } }),
)

/**
 * Middleware that validates authentication and provides session + prisma to context.
 * Requires dbMiddleware to be in the middleware chain first.
 *
 * @context - Adds session: Session and prisma: PrismaClient to the context object.
 * @throws Redirects to /sign-in if no valid session exists.
 * @example
 * // Usage in route or another middleware chain
 * .middleware([authMiddleware])
 */
export const authMiddleware = createMiddleware()
  .middleware([dbMiddleware])
  .server(async ({ next, context }) => {
    const sessionData = await getSession()
    const session = sessionData.data
    if (!session) throw redirect({ to: '/sign-in' })

    return next({ context: { session, prisma: context.prisma } })
  })

/**
 * Middleware that ensures the user has an active organization selected in their session.
 * Requires authMiddleware to be in the middleware chain first.
 *
 * @context - Adds session with organizationId to the context object.
 * @throws Redirects to /preprocess/session-org-init if no organizationId is set in session.
 * @example
 * // Usage in route or another middleware chain
 * .middleware([authMiddlewareWithOrganization])
 */
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

/**
 * Retrieves the current session from the request headers.
 *
 * @returns A success response containing the session object, or null if no session exists.
 * @example
 * const { data } = await getSession()
 * if (data) { console.log(data.user) }
 */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    return serverFnSuccessResponse('Success', session)
  },
)

/**
 * Ensures a valid session exists. Redirects to /sign-in if no session is found.
 *
 * @returns A success response containing the session object.
 * @throws Redirects to /sign-in if session is not found.
 * @example
 * const { data } = await ensureSession()
 * // User is authenticated, session is returned
 */
export const ensureSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) throw redirect({ to: '/sign-in' })

    return serverFnSuccessResponse('Found', session)
  },
)

/**
 * Updates the current session's organization ID.
 *
 * @param data.organizationId - The organization ID to set (string, null, or undefined).
 * @returns A success response containing the updated session object.
 * @example
 * const { data } = await loginToOrganization({ organizationId: 'org_123' })
 * // Session now has the new organizationId
 */
export const loginToOrganization = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data, context }) => {
    if (data.organizationId) {
      const hasPermission = await checkPermissionService({
        subjectResourceId: context.session.user.id,
        targetResourceId: data.organizationId,
        permission: 'login:organization',
        prisma: context.prisma,
      })
      if (!hasPermission)
        return serverFnErrorResponse('Unauthorized', {
          message: 'Permission required - login:organization',
        })
    }

    const headers = getRequestHeaders()

    const session = await auth.api.updateSession({
      body: { organizationId: data.organizationId },
      headers,
    })

    return serverFnSuccessResponse('Found', session)
  })

export const logoutOfOrganization = createServerFn({ method: 'GET' })
  .middleware([authMiddlewareWithOrganization])
  .handler(async ({ context }) => {
    const hasPermission = await checkPermissionService({
      subjectResourceId: context.session.user.id,
      targetResourceId: context.session.session.organizationId,
      permission: 'login:organization',
      prisma: context.prisma,
    })
    if (!hasPermission)
      return serverFnErrorResponse('Unauthorized', {
        message: 'Permission required - login:organization',
      })

    const headers = getRequestHeaders()

    const session = await auth.api.updateSession({
      body: { organizationId: undefined },
      headers,
    })

    return serverFnSuccessResponse('Found', session)
  })
