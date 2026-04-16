import { Spinner } from '#/components/ui/spinner'
import {
  authMiddleware,
  ensureSession,
} from '#/lib/server/functions/auth.functions'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  server: {
    middleware: [authMiddleware],
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
