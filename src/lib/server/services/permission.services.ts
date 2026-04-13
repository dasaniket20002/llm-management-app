import type { PrismaTransaction } from '../db/db'
import type { PrismaClient } from '../db/generated/client'
import type { PermissionAction, Role } from '../db/roles_permissions'

export async function checkPermissionService({
  subjectResourceId,
  targetResourceId,
  permission,
  prisma,
}: {
  subjectResourceId: string
  targetResourceId: string
  permission: PermissionAction
  prisma: PrismaClient | PrismaTransaction
}) {
  const permissions = await prisma.rolePermission.findMany({
    where: {
      permission: {
        action: permission,
      },
      role: {
        assignments: {
          every: {
            subjectResourceId,
            targetResourceId,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
      },
    },
    select: {
      permission: { select: { action: true } },
    },
  })

  return permissions.map((p) => p.permission.action).includes(permission)
}

export async function checkPermissionsService({
  subjectResourceId,
  targetResourceId,
  permissions,
  prisma,
}: {
  subjectResourceId: string
  targetResourceId: string
  permissions: PermissionAction[]
  prisma: PrismaClient | PrismaTransaction
}) {
  const permissionPromises = permissions.map((permission) =>
    prisma.rolePermission.findMany({
      where: {
        permission: {
          action: permission,
        },
        role: {
          assignments: {
            every: {
              subjectResourceId,
              targetResourceId,
              isActive: true,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
      select: {
        permission: { select: { action: true } },
      },
    }),
  )

  const permissionResults = await Promise.all(permissionPromises)
  const granted = permissions.map((permission, i) =>
    permissionResults[i].map((p) => p.permission.action).includes(permission),
  )
  return granted
}

export async function grantRoleService({
  subjectResourceId,
  targetResourceId,
  role,
  currentUserId,
  expiresAt = null,
  prisma,
}: {
  subjectResourceId: string
  targetResourceId: string
  role: Role | (string & {})
  currentUserId: string
  expiresAt?: Date | null
  prisma: PrismaClient | PrismaTransaction
}) {
  const foundRole = await prisma.role.findUnique({
    where: {
      name: role,
    },
    select: { id: true },
  })
  if (!foundRole) throw new Error('Not Found')

  const res = await prisma.resourceRoleAssignment.upsert({
    where: {
      subjectResourceId_targetResourceId_roleId: {
        subjectResourceId,
        targetResourceId,
        roleId: foundRole.id,
      },
    },
    create: {
      subjectResourceId,
      targetResourceId,
      roleId: foundRole.id,
      grantedById: currentUserId,
      expiresAt,
      isActive: true,
    },
    update: {
      grantedById: currentUserId,
      expiresAt,
      isActive: true,
    },
  })

  return res
}
