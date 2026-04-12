// src/lib/db/seed.ts
// ==========================================================================
// Database seed — Roles and Permissions
// Run with: npx prisma db seed
// ==========================================================================

import { PrismaClient } from '#/lib/server/db/generated/client'
import {
  PERMISSIONS_DEFINATIONS,
  ROLES_DEFINATIONS,
} from '#/lib/server/db/roles_permissions'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function seed() {
  console.log('Seeding permissions...')

  // Upsert all permissions
  for (const perm of PERMISSIONS_DEFINATIONS) {
    await prisma.permission.upsert({
      where: { action: perm.action },
      create: { action: perm.action, description: perm.description },
      update: { description: perm.description },
    })
  }

  console.log(`${PERMISSIONS_DEFINATIONS.length} permissions seeded`)

  // Load all permissions for lookup
  const allPerms = await prisma.permission.findMany()
  const permMap = new Map(allPerms.map((p) => [p.action, p.id]))

  console.log('Seeding roles...')

  for (const roleDef of ROLES_DEFINATIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
      update: {
        description: roleDef.description,
      },
    })

    // Upsert role_permissions
    for (const action of roleDef.permissions) {
      const permId = permMap.get(action)
      if (!permId) {
        console.warn(`Permission not found: ${action}`)
        continue
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permId,
          },
        },
        create: { roleId: role.id, permissionId: permId },
        update: {},
      })
    }

    console.log(
      `Role '${roleDef.name}' with ${roleDef.permissions.length} permissions`,
    )
  }

  console.log('Seed complete.')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
