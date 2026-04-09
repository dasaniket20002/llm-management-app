import { Spinner } from '#/components/ui/spinner'
import { ensureSession } from '#/lib/server/functions/auth.functions'
import { can } from '#/lib/server/functions/permission.functions'
import {
  isUsernameSet,
  isPasswordSet,
  isPasskeySet,
} from '#/lib/server/functions/user.functions'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    const data = await ensureSession()
    if (!data.success) throw redirect({ to: '/sign-in' })
    return { session: data.data }
  },
  loader: async ({ context }) => {
    const usernameSetPromise = isUsernameSet()
    const passwordSetPromise = isPasswordSet()
    const passkeySetPromise = isPasskeySet()

    const [usernameSet, passwordSet, passkeySet, permissions] =
      await Promise.all([
        usernameSetPromise,
        passwordSetPromise,
        passkeySetPromise,
        can({
          data: {
            subjectResourceId: context.session.user.id,
            targetResourceId: context.session.user.id,
            actions: ['user:update:username', 'user:update:password'],
          },
        }),
      ])

    const shouldUpdateUsername = !usernameSet.data && permissions[0]
    const shouldUpdatePassword = !passwordSet.data && permissions[1]

    if (shouldUpdateUsername || shouldUpdatePassword) {
      throw redirect({
        to: '/preprocess/account-setup',
        search: {
          passwordSet: shouldUpdatePassword,
          usernameSet: shouldUpdateUsername,
          passkeySet: passkeySet.data,
        },
      })
    }
  },
  pendingComponent: () => (
    <div className="h-dvh w-full place-content-center place-items-center bg-secondary">
      <Spinner className="size-4" />
    </div>
  ),
  component: () => <Outlet />,
})
