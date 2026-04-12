import { Spinner } from '#/components/ui/spinner'
import {
  authMiddlewareWithOrganization,
  ensureSession,
} from '#/lib/server/functions/auth.functions'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected')({
  server: {
    middleware: [authMiddlewareWithOrganization],
  },
  beforeLoad: async () => {
    const data = await ensureSession()
    return { session: data.data }
  },
  pendingComponent: () => (
    <div className="h-dvh w-full place-content-center place-items-center bg-secondary">
      <Spinner className="size-4" />
    </div>
  ),
  component: () => <Outlet />,
})
