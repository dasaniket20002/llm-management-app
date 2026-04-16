import {
  prepareElectricUrl,
  proxyElectricRequest,
} from '#/lib/server/services/electric.services'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_organizational/api/electric/self-resource-roles',
)({
  server: {
    handlers: {
      GET: async ({ context, request }) => {
        const whereClause = {
          // all the roles of the current user with different targets
          // all the roles of the current organization with different targets
          where: `"subject_resource_id" = $1 OR "subject_resource_id" = $2`,
          params: [
            context.session.user.id,
            context.session.session.organizationId,
          ],
        }

        const requestUrl = new URL(request.url)
        const preparedElectricUrl = prepareElectricUrl(
          requestUrl,
          'resource_role_assignments',
          whereClause,
        )

        return proxyElectricRequest(preparedElectricUrl)
      },
    },
  },
})
