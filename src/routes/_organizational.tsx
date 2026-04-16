import { Spinner } from '#/components/ui/spinner'
import {
  authMiddlewareWithOrganization,
  ensureSession,
} from '#/lib/server/functions/auth.functions'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_organizational')({
  server: {
    middleware: [authMiddlewareWithOrganization],
  },
  beforeLoad: async () => {
    const data = await ensureSession()
    const organizationId = data.data.session.organizationId
    if (!organizationId) throw redirect({ to: '/preprocess/session-org-init' })
    return { session: data.data }
  },
  pendingComponent: () => (
    <div className="h-dvh w-full place-content-center place-items-center bg-secondary">
      <Spinner className="size-4" />
    </div>
  ),
  component: () => <Outlet />,
})
