import Logo from '#/components/logo'
import OrganizationCreateForm from '#/components/organization-create-form'
import OrganizationJoinForm from '#/components/organization-join-form'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { authClient } from '#/lib/auth-client'
import { useIsMobile } from '#/lib/client/hooks/use-mobile'
import { loginToOrganization } from '#/lib/server/functions/auth.functions'
import { getSelfOrganizations } from '#/lib/server/functions/organization.functions'
import { checkPermissions } from '#/lib/server/functions/permission.functions'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

export const Route = createFileRoute(
  '/_authenticated/preprocess/session-org-init',
)({
  beforeLoad: async ({ context }) => {
    if (context.session.session.organizationId)
      throw redirect({ to: '/dashboard' })

    const [canCreateOrganization, canJoinOrganization] = await checkPermissions(
      {
        data: {
          subjectResourceId: context.session.user.id,
          targetResourceId: context.session.user.id,
          permissions: ['create:organization', 'join:organization'],
        },
      },
    )

    // if managed user can join only one organization
    if (!canJoinOrganization) {
      const selfOrganizations = await getSelfOrganizations()
      if (selfOrganizations.length === 1) {
        await loginToOrganization({
          data: { organizationId: selfOrganizations[0].organization.id },
        })
        throw redirect({ to: '/dashboard' })
      }
    }

    return {
      session: context.session,
      canCreateOrganization,
      canJoinOrganization,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { canCreateOrganization, canJoinOrganization, session } =
    Route.useRouteContext()

  return (
    <div className="min-h-svh place-items-center place-content-center bg-muted p-6 md:p-10">
      <div className="flex flex-col gap-6 items-center max-w-5xl w-full">
        <div className="w-full grid grid-cols-3 px-6">
          <Logo
            includeName
            textVariant="primary"
            iconVariant="card"
            className="col-[2/3] justify-center"
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-xs"
                  variant="outline"
                  className="place-self-end"
                  onClick={() => {
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => navigate({ to: '/sign-in' }),
                      },
                    })
                  }}
                >
                  <LogOut />
                </Button>
              }
            />
            <TooltipContent>Sign Out</TooltipContent>
          </Tooltip>
        </div>
        <Card className="w-full flex-col-reverse md:flex-row py-0 gap-0">
          {canCreateOrganization && (
            <>
              <OrganizationCreateForm />
              <Separator orientation={isMobile ? 'horizontal' : 'vertical'} />
            </>
          )}
          <OrganizationJoinForm
            canJoinOrganization={canJoinOrganization}
            currentUserId={session.user.id}
          />
        </Card>
      </div>
    </div>
  )
}
