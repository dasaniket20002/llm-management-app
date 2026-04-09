import { ensureSession } from '#/lib/server/functions/auth.functions'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_unprotected')({
  beforeLoad: async () => {
    const data = await ensureSession()

    if (data.success) {
      throw redirect({ to: '/main' })
    }
  },
  component: () => <Outlet />,
})
