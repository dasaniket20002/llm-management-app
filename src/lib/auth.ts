import { prisma } from '#/lib/server/db/db'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { username } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from './utils/env'
import { createUserResource } from './server/services/resource.services'
import { createBucket } from './server/services/minio.services'
import { checkPermission } from './server/services/permission.services'

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
          const resource = await createUserResource({
            subjectRole: 'user_owner',
          })
          return {
            data: {
              id: resource.id,
              email: user.email,
              emailVerified: user.emailVerified,
              name: user.name,
              image: user.image,
            },
          }
        },
        after: async (user) => {
          const hasPermission = await checkPermission({
            subjectResourceId: user.id,
            targetResourceId: user.id,
            permission: 'user:bucket:create',
          })

          if (hasPermission) {
            const bucketId = await createBucket(user.id)
          }
        },
      },
    },
  },
})
