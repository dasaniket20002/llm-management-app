import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_organizational/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  return (
    <div>
      <p>Hello "/dashboard"!</p>
      <Button
        onClick={() => {
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => navigate({ to: '/sign-in' }),
            },
          })
        }}
      >
        Signout
      </Button>
    </div>
  )
}
