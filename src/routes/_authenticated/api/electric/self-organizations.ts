import {
  prepareElectricUrl,
  proxyElectricRequest,
} from '#/lib/server/services/electric.services'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/api/electric/self-organizations',
)({
  server: {
    handlers: {
      GET: async ({ context, request }) => {
        const whereClause = {
          // all the organizations where the resourceType is organization
          // and the the subject is the current user
          where: `
            "id" IN (
              SELECT "id" 
              FROM "resource"
              WHERE 
                "resource_type"::text = 'organization' AND 
                "id" IN (
                  SELECT "target_resource_id" 
                  FROM "resource_role_assignment" 
                  WHERE "subject_resource_id" = $1
                )
              )
          `,
          params: [context.session.user.id],
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
