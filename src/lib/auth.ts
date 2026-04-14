import { prisma } from '#/lib/server/db/db'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { username } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from './utils/env'
import { createResourceService } from './server/services/resource.services'
import { grantRoleService } from './server/services/permission.services'
import {
  createBucketService,
  putObjectInBucket,
} from './server/services/minio.services'
import {
  updateUserAvatarService,
  updateUserBucketService,
} from './server/services/user.services'
import {
  createFileResourceService,
  downloadFileService,
} from './server/services/file.services'

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
          const userResource = await createResourceService({
            resourceType: 'user',
            prisma: prisma,
          })
          return {
            data: {
              id: userResource.id,
              email: user.email,
              emailVerified: user.emailVerified,
              name: user.name,
              image: user.image,
            },
          }
        },
        after: async (user) => {
          // grant role here after the user is created for the granted by user id to be available
          await prisma.$transaction(async (tx) => {
            await grantRoleService({
              subjectResourceId: user.id,
              targetResourceId: user.id,
              currentUserId: user.id,
              role: 'user_owner',
              prisma: tx,
            })

            const createdBucketId = await createBucketService({
              bucketPrefix: user.name.replaceAll(' ', '-').toLowerCase(),
            })

            await updateUserBucketService({
              storageBucketId: createdBucketId,
              userId: user.id,
              prisma: tx,
            })

            // todo: extract image uploading to client so that i can check if there is
            // user uploaded image or
            // oauth user provided
            // and execute accordingly
            if (user.image) {
              // save the image blob to bucket
              const { imageBuffer, extension } = await downloadFileService({
                link: user.image,
              })
              const { objectName } = await putObjectInBucket({
                bucketId: createdBucketId,
                imageBuffer,
                extension,
                originalName: 'profile-image/image',
              })
              const file = await createFileResourceService({
                currentUserId: user.id,
                originalName: objectName,
                extension,
                sizeBytes: imageBuffer.length,
                storageBucketId: createdBucketId,
                storageKey: objectName,
                displayName: objectName,
                prisma: tx,
              })
              await updateUserAvatarService({
                userId: user.id,
                imageFileId: file.id,
                prisma: tx,
              })
            }
          })
        },
      },
    },
  },
})
