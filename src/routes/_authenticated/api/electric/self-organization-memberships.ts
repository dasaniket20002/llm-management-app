import {
  prepareElectricUrl,
  proxyElectricRequest,
} from '#/lib/server/services/electric.services'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/api/electric/self-organization-memberships',
)({
  server: {
    handlers: {
      GET: async ({ context, request }) => {
        const whereClause = {
          where: `"user_id" = $1`,
          params: [context.session.user.id],
        }

        const requestUrl = new URL(request.url)
        const preparedElectricUrl = prepareElectricUrl(
          requestUrl,
          'user_organization',
          whereClause,
        )

        return proxyElectricRequest(preparedElectricUrl)
      },
    },
  },
})
