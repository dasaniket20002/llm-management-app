import { getSession } from '#/lib/server/functions/auth.functions'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_unprotected')({
  beforeLoad: async () => {
    const data = await getSession()

    if (data.data) {
      throw redirect({ to: '/main' })
    }
  },
  component: () => <Outlet />,
})
