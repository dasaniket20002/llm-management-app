import {
  loginToOrganization,
  logoutOfOrganization,
} from '#/lib/server/functions/auth.functions'
import {
  acceptOrganization,
  acceptUser,
  inviteUser,
  leaveOrganization,
  removeUser,
  requestJoin,
} from '#/lib/server/functions/membership.functions'
import { userOrganizationSchema } from '#/lib/types/collection-schemas/user-organization'
import { getElectricUrl } from '#/lib/utils/electric'
import { snakeCamelMapper } from '@electric-sql/client'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import {
  BasicIndex,
  createCollection,
  createOptimisticAction,
} from '@tanstack/react-db'
import type { UseNavigateResult } from '@tanstack/react-router'
import { toast } from 'sonner'

export const selfMembershipCollection = createCollection(
  electricCollectionOptions({
    shapeOptions: {
      url: `${getElectricUrl()}/self-organization-memberships`,
      parser: { timestamptz: (date: string) => new Date(date) },
      columnMapper: snakeCamelMapper(),
    },
    schema: userOrganizationSchema,
    getKey: (item) => item.id,
    autoIndex: 'eager',
    defaultIndexType: BasicIndex,
  }),
)

export const createMembershipAction = createOptimisticAction<{
  action: 'request' | 'invite'
  userId: string
  organizationId: string
}>({
  onMutate: ({ action, userId, organizationId }) => {
    selfMembershipCollection.insert({
      id: crypto.randomUUID(),
      userId,
      organizationId,
      status: action === 'invite' ? 'invited' : 'requested',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  },
  mutationFn: async ({ action, userId, organizationId }) => {
    if (action === 'request') {
      const membership = await requestJoin({
        data: {
          organizationId,
        },
      })

      if (!membership.success) {
        toast.error(membership.error, {
          description: membership.data.message,
        })
      } else {
        toast.success('Requested')
      }

      await selfMembershipCollection.utils.awaitTxId(membership.data.txid)
    } else {
      const membership = await inviteUser({
        data: {
          userId,
        },
      })

      if (!membership.success) {
        toast.error(membership.error, {
          description: membership.data.message,
        })
      } else {
        toast.success('Requested')
      }

      await selfMembershipCollection.utils.awaitTxId(membership.data.txid)
    }
  },
})

export const updateMembershipAction = createOptimisticAction<
  | {
      action: 'acceptUser'
      userId: string
      organizationId: string
    }
  | {
      action: 'acceptOrganization'
      userId: string
      organizationId: string
      navigate: UseNavigateResult<string>
    }
>({
  onMutate: ({ userId, organizationId }) => {
    const key = selfMembershipCollection.toArray.find(
      (item) =>
        item.organizationId === organizationId && item.userId === userId,
    )?.id

    selfMembershipCollection.update(key, (item) => {
      item.status = 'active'
    })
  },
  mutationFn: async (inputData) => {
    if (inputData.action === 'acceptUser') {
      const membership = await acceptUser({
        data: {
          userId: inputData.userId,
        },
      })

      if (!membership.success) {
        toast.error(membership.error, {
          description: membership.data.message,
        })
      } else {
        toast.success('Joined')
      }

      await selfMembershipCollection.utils.awaitTxId(membership.data.txid)
    } else {
      const membership = await acceptOrganization({
        data: {
          organizationId: inputData.organizationId,
        },
      })

      if (!membership.success) {
        toast.error(membership.error, {
          description: membership.data.message,
        })
      } else {
        toast.success('Joined')

        const login = await loginToOrganization({
          data: { organizationId: inputData.organizationId },
        })
        if (login.success) inputData.navigate({ to: '/dashboard' })
        else toast.error(login.error, { description: login.data.message })
      }

      await selfMembershipCollection.utils.awaitTxId(membership.data.txid)
    }
  },
})

export const deleteMembershipAction = createOptimisticAction<
  | {
      action: 'suspend' | 'remove'
      userId: string
      organizationId: string
    }
  | {
      action: 'leave'
      userId: string
      organizationId: string
      navigate: UseNavigateResult<string>
    }
>({
  onMutate: ({ userId, organizationId }) => {
    const key = selfMembershipCollection.toArray.find(
      (item) =>
        item.organizationId === organizationId && item.userId === userId,
    )?.id

    if (key) selfMembershipCollection.delete(key)
  },
  mutationFn: async (inputData) => {
    if (inputData.action === 'leave') {
      const membership = await leaveOrganization()

      if (!membership.success) {
        toast.error(membership.error, {
          description: membership.data.message,
        })
      } else {
        toast.success('Removed')

        const logout = await logoutOfOrganization()
        if (logout.success) inputData.navigate({ to: '/sign-in' })
        else toast.error(logout.error, { description: logout.data.message })
      }

      await selfMembershipCollection.utils.awaitTxId(membership.data.txid)
    } else {
      const membership = await removeUser({
        data: {
          userId: inputData.userId,
          status: inputData.action === 'remove' ? 'left' : 'suspended',
        },
      })

      if (!membership.success) {
        toast.error(membership.error, {
          description: membership.data.message,
        })
      } else {
        toast.success('Removed')
      }

      await selfMembershipCollection.utils.awaitTxId(membership.data.txid)
    }
  },
})
