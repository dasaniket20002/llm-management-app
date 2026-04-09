import { env } from '#/lib/utils/env'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from './generated/client'
import type { DefaultArgs } from '@prisma/client/runtime/client'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Set max connections in the pool
  idleTimeoutMillis: 30000,
})
const adapter = new PrismaPg(pool)
const prismaClient = new PrismaClient({ adapter })

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || prismaClient

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export type PrismaTransaction = Omit<
  PrismaClient<never, undefined, DefaultArgs>,
  '$connect' | '$disconnect' | '$on' | '$use' | '$extends'
>

export const generateTxId = async (tx: PrismaTransaction) => {
  const result = await tx.$queryRaw<
    { txid_current: bigint }[]
  >`SELECT txid_current()`

  return Number(result[0].txid_current)
}
