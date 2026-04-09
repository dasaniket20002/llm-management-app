import { env } from '#/lib/utils/env'

export const getElectricUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/electric`
  }
  // Fallback for SSR
  return `${env.VITE_APP_BASE_URL}/api/electric`
}
