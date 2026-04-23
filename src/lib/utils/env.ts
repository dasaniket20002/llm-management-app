import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.string().optional().default('development'),

    DATABASE_URL: z.url(),

    ELECTRIC_URL: z.url(),
    ELECTRIC_SECRET: z.string(),

    BETTER_AUTH_SECRET: z.string().min(8),

    MINIO_ENDPOINT: z.string(),
    MINIO_PORT: z.coerce.number(),
    MINIO_ROOT_USER: z.string(),
    MINIO_ROOT_PASSWORD: z.string(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
  },

  clientPrefix: 'VITE_',
  client: {
    VITE_APP_TITLE: z.string().min(1),
    VITE_APP_BASE_URL: z.url(),
  },

  runtimeEnv: {
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_APP_BASE_URL: import.meta.env.VITE_APP_BASE_URL,

    NODE_ENV: process.env.NODE_ENV,

    ELECTRIC_URL: process.env.ELECTRIC_URL,
    ELECTRIC_SECRET: process.env.ELECTRIC_SECRET,

    DATABASE_URL: process.env.DATABASE_URL,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,

    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_PORT: process.env.MINIO_PORT,
    MINIO_ROOT_USER: process.env.MINIO_ROOT_USER,
    MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },

  emptyStringAsUndefined: true,
})
