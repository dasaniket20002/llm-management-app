import { env } from '#/lib/utils/env'
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'

export type WhereClause = {
  where: string
  params?: Array<string>
}

export function prepareElectricUrl(
  requestUrl: URL,
  table: string,
  where: WhereClause | undefined,
): URL {
  const electricRequestURL = new URL(`/v1/shape`, env.ELECTRIC_URL)

  // Copy Electric-specific query params
  requestUrl.searchParams.forEach((value, key) => {
    if (key === 'table' || key === 'where') return
    if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
      electricRequestURL.searchParams.set(key, value)
    }
  })
  electricRequestURL.searchParams.set(`table`, table.trim())
  if (!electricRequestURL.searchParams.get('offset'))
    electricRequestURL.searchParams.set(`offset`, '-1')
  electricRequestURL.searchParams.set(`secret`, env.ELECTRIC_SECRET)

  if (where) {
    electricRequestURL.searchParams.set(
      `where`,
      where.where.trim().replace(/\s+/g, ' '),
    )
    where.params?.forEach((value, index) => {
      electricRequestURL.searchParams.set(`params[${index + 1}]`, value.trim())
    })
  }

  return electricRequestURL
}

export async function proxyElectricRequest(
  electricRequestURL: URL,
): Promise<Response> {
  const response = await fetch(electricRequestURL.toString(), { method: 'GET' })
  const headers = new Headers(response.headers)
  headers.delete(`content-encoding`)
  headers.delete(`content-length`)
  headers.set(`vary`, `cookie`)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
