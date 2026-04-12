import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_protected/api/electric/resource-role-assignment',
)({
  server: {
    handlers: {
      GET: async () => {},
    },
  },
})
