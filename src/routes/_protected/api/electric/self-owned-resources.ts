import { env } from '#/lib/utils/env'
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_protected/api/electric/self-owned-resources',
)({
  server: {
    handlers: {
      GET: async ({ context, request }) => {
        const table = 'resource'
        const whereClause = {
          where: `id IN (SELECT target_resource_id FROM resource_role_assignments WHERE subject_resource_id = $1)`,
          params: [context.session.user.id],
        }

        const requestUrl = new URL(request.url)
        const electricRequestURL = new URL(`/v1/shape`, env.ELECTRIC_URL)

        // Copy Electric-specific query params
        requestUrl.searchParams.forEach((value, key) => {
          if (['table', 'where', 'secret', 'params'].includes(key)) return
          if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
            electricRequestURL.searchParams.set(key, value)
          }
        })
        electricRequestURL.searchParams.set(`table`, table)
        electricRequestURL.searchParams.set(`secret`, env.ELECTRIC_SECRET)

        electricRequestURL.searchParams.set(`where`, whereClause.where)
        whereClause.params.forEach((value, index) => {
          electricRequestURL.searchParams.set(`params[${index + 1}]`, value)
        })

        const response = await fetch(electricRequestURL.toString(), {
          method: 'GET',
        })
        const headers = new Headers(response.headers)
        headers.delete(`content-encoding`)
        headers.delete(`content-length`)
        headers.set(`vary`, `cookie`)

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      },
    },
  },
})
