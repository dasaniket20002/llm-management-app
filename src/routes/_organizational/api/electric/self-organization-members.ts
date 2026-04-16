import {
  prepareElectricUrl,
  proxyElectricRequest,
} from '#/lib/server/services/electric.services'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_organizational/api/electric/self-organization-members',
)({
  server: {
    handlers: {
      GET: async ({ context, request }) => {
        const whereClause = {
          // all the users in the current logged in organization
          where: `"organization_id" = $1`,
          params: [context.session.session.organizationId],
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
