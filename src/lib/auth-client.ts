import { passkeyClient } from '@better-auth/passkey/client'
import { usernameClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

export const authClient = createAuthClient({
  plugins: [usernameClient(), passkeyClient(), tanstackStartCookies()],
})
