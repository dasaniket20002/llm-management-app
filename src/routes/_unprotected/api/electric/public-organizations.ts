import {
  prepareElectricUrl,
  proxyElectricRequest,
} from '#/lib/server/services/electric.services'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_unprotected/api/electric/public-organizations',
)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const whereClause = {
          // all the organizations where the resourceType is organization
          // and the the subject is the current user
          where: `
              "id" IN (
                SELECT "id" 
                FROM "resource"
                WHERE 
                  "resource_type"::text = 'organization' AND 
                  "visibility"::text = 'public'
                )
            `,
        }

        const requestUrl = new URL(request.url)
        const preparedElectricUrl = prepareElectricUrl(
          requestUrl,
          'organization',
          whereClause,
        )

        return proxyElectricRequest(preparedElectricUrl)
      },
    },
  },
})
