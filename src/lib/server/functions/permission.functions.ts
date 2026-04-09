import { createServerFn } from '@tanstack/react-start'
import { prisma } from '../db/db'
import type { PermissionAction } from '../db/roles_permissions'

export const getAllPermissions = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { subjectResourceId: string; targetResourceId: string }) => data,
  )
  .handler(async ({ data }) => {
    const permissions = await prisma.resourceRoleAssignment.findMany({
      where: {
        subjectResourceId: data.subjectResourceId,
        targetResourceId: data.targetResourceId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        role: {
          select: {
            name: true,
            permissions: {
              select: { permission: { select: { action: true } } },
            },
          },
        },
      },
    })

    return permissions.map((p) => ({
      ...p,
      role: {
        ...p.role,
        permissions: p.role.permissions.map((_p) => _p.permission.action),
      },
    }))
  })

export const can = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      subjectResourceId: string
      targetResourceId: string
      actions: PermissionAction[]
    }) => data,
  )
  .handler(async ({ data }) => {
    const resultPromises = data.actions.map((action) =>
      prisma.resourceRoleAssignment.findFirst({
        where: {
          subjectResourceId: data.subjectResourceId,
          targetResourceId: data.targetResourceId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          role: {
            permissions: {
              some: {
                permission: { action },
              },
            },
          },
        },
        select: { id: true },
      }),
    )

    const results = await Promise.all(resultPromises)

    return results.map((r) => r !== null)
  })
