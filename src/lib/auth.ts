import { prisma } from '#/lib/server/db/db'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { username } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from './utils/env'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ['email', 'profile'],
    },
  },
  session: {
    storeSessionInDatabase: true,
    cookieCache: {
      enabled: true,
      strategy: 'jwe',
    },
    additionalFields: {
      organizationId: {
        type: 'string',
        defaultValue: null,
        required: false,
      },
    },
  },
  advanced: {
    database: { generateId: false },
  },
  plugins: [
    username({
      usernameValidator: async (_username) => {
        if (_username === 'admin' || _username.length < 3) {
          return false
        }
        return true
      },
    }),
    passkey(),
    tanstackStartCookies(),
  ],
  baseURL: env.VITE_APP_BASE_URL,
  experimental: { joins: true },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const resource = await prisma.resource.create({
            data: {
              resourceType: 'user',
              visibility: 'public',
            },
            select: { id: true },
          })

          const userOwnerRole = await prisma.role.findUnique({
            where: { name: 'user_owner' },
            select: { id: true },
          })

          if (!userOwnerRole)
            throw new Error('Cannot create new user; Role not found.')

          await prisma.resourceRoleAssignment.create({
            data: {
              subjectResourceId: resource.id,
              targetResourceId: resource.id,
              roleId: userOwnerRole.id,
            },
            select: { id: true },
          })

          return {
            data: {
              id: resource.id,
              email: user.email,
              emailVerified: user.emailVerified,
              name: user.name,
            },
          }
        },
      },
    },
  },
})
