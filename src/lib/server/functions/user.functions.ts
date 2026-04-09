import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { authMiddleware } from './auth.functions'
import z from 'zod'
import {
  serverFnErrorResponse,
  serverFnSuccessResponse,
} from '#/lib/types/server-fn'
import { auth } from '#/lib/auth'
import { prisma } from '../db/db'
import { can } from './permission.functions'

const SetPasswordSchema = z.object({ newPassword: z.string() })
export const setPassword = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: z.infer<typeof SetPasswordSchema>) =>
    SetPasswordSchema.safeParse(data),
  )
  .handler(async ({ data, context }) => {
    const permissions = await can({
      data: {
        subjectResourceId: context.sessionData.user.id,
        targetResourceId: context.sessionData.user.id,
        actions: ['user:update:password'],
      },
    })
    if (!permissions[0])
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'user:update:password',
      })

    if (!data.success) return serverFnErrorResponse('Validation Error', null)
    const inputData = data.data

    const headers = getRequestHeaders()
    const res = await auth.api.setPassword({
      body: {
        newPassword: inputData.newPassword,
      },
      headers: headers,
    })

    if (!res.status) return serverFnErrorResponse('Internal Error', null)
    return serverFnSuccessResponse('Success', null)
  })

const SetUsernameSchema = z.object({ newUsername: z.string() })
export const setUsername = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((data: z.infer<typeof SetUsernameSchema>) =>
    SetUsernameSchema.safeParse(data),
  )
  .handler(async ({ data, context }) => {
    const permissions = await can({
      data: {
        subjectResourceId: context.sessionData.user.id,
        targetResourceId: context.sessionData.user.id,
        actions: ['user:update:password'],
      },
    })
    if (!permissions[0])
      return serverFnErrorResponse('Unauthorized', {
        permissionsRequired: 'user:update:password',
      })

    if (!data.success) return serverFnErrorResponse('Validation Error', null)
    const inputData = data.data

    const res = await auth.api.updateUser({
      body: {
        username: inputData.newUsername,
      },
    })

    if (!res.status) return serverFnErrorResponse('Unauthorized', null)
    return serverFnSuccessResponse('Success', null)
  })

export const isPasswordSet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const accs = await prisma.account.findMany({
      where: { userId: context.sessionData.user.id },
      select: { password: true },
    })

    const ps = accs.some((_a) => !!_a.password)
    return serverFnSuccessResponse(ps ? 'Password Set' : 'Password Unset', ps)
  })

export const isPasskeySet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const passkeys = await prisma.passkey.findMany({
      where: { userId: context.sessionData.user.id },
      select: { id: true },
    })

    const ps = passkeys.length > 0
    return serverFnSuccessResponse(ps ? 'Passkey Set' : 'Passkey Unset', ps)
  })

export const isUsernameSet = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const us = !!context.sessionData.user.username
    return serverFnSuccessResponse(us ? 'Username Set' : 'Username Unset', us)
  })
