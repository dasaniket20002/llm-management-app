import { publicOrganizationCollection } from '#/lib/client/collections/public-organizations'
import {
  createMembershipAction,
  selfMembershipCollection,
  updateMembershipAction,
} from '#/lib/client/collections/self-memberships'
import { selfOrganizationCollection } from '#/lib/client/collections/self-organization'
import { useFilePrefetchLinkQueryOptions } from '#/lib/client/hooks/use-file-prefetch-link-query-options'
import type { UserOrgStatus } from '#/lib/server/db/generated/enums'
import { loginToOrganization } from '#/lib/server/functions/auth.functions'
import {
  eq,
  isNull,
  isUndefined,
  not,
  or,
  useLiveQuery,
} from '@tanstack/react-db'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Plus,
  XCircle,
} from 'lucide-react'
import { Fragment, useCallback } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Spinner } from './ui/spinner'

export default function OrganizationJoinForm({
  canJoinOrganization,
  currentUserId,
}: {
  canJoinOrganization: boolean
  currentUserId: string
}) {
  const {
    data: selfOrganizations,
    isLoading: selfOrganizationsLoading,
    isError: selfOrganizationsError,
  } = useLiveQuery((q) =>
    q
      .from({ organization: selfOrganizationCollection })
      .innerJoin(
        { membership: selfMembershipCollection },
        ({ organization, membership }) =>
          eq(organization.id, membership.organizationId),
      )
      .where(({ membership }) => not(eq(membership.status, 'left')))
      .orderBy(({ organization }) => organization.updatedAt, 'desc'),
  )

  const {
    data: publicOrganizations,
    isLoading: publicOrganizationsLoading,
    isError: publicOrganizationsError,
  } = useLiveQuery((q) =>
    q
      .from({ po: publicOrganizationCollection })
      .leftJoin({ so: selfOrganizationCollection }, ({ po, so }) =>
        eq(po.id, so.id),
      )
      .leftJoin({ m: selfMembershipCollection }, ({ so, m }) =>
        eq(so.id, m.organizationId),
      )
      .where(({ so, m }) =>
        or(or(isNull(so.id), isUndefined(so.id)), eq(m.status, 'left')),
      )
      .select(({ po }) => po)
      .orderBy(({ po }) => po.name, 'asc'),
  )

  return (
    <div className="flex flex-col gap-6 w-full py-6">
      <CardHeader className="text-center">
        <CardTitle>Select Workspace</CardTitle>
        <CardDescription>Select an Organization to work on</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 px-0 space-y-6">
        <div className="px-6 space-y-2">
          {selfOrganizationsError && (
            <div className="h-64 place-content-center place-items-center space-y-2 text-destructive">
              <AlertTriangle />
              <p>An error has occured</p>
            </div>
          )}
          {selfOrganizationsLoading && (
            <div className="h-64 place-content-center place-items-center">
              <Spinner />
            </div>
          )}
          {!selfOrganizationsError &&
            !selfOrganizationsLoading &&
            (selfOrganizations.length === 0 ? (
              <div className="h-64 place-content-center place-items-center space-y-2">
                <CircleDashed />
                <p>No joined organizations found</p>
              </div>
            ) : (
              <>
                <h1 className="font-medium">Joined Organizations</h1>
                <ScrollArea className="h-64">
                  {selfOrganizations.map((org) => (
                    <Fragment key={org.organization.id}>
                      <OrganizationLoginButton
                        id={org.organization.id}
                        identifier={org.organization.identifier}
                        name={org.organization.name}
                        imageFileId={org.organization.imageFileId}
                        status={org.membership.status}
                        synced={org.organization.$synced}
                        currentUserId={currentUserId}
                      />
                      <Separator />
                    </Fragment>
                  ))}
                </ScrollArea>
              </>
            ))}
        </div>

        {canJoinOrganization && (
          <>
            <Separator />
            <div className="px-6 space-y-2">
              {publicOrganizationsError && (
                <div className="h-64 place-content-center place-items-center space-y-2 text-destructive">
                  <AlertTriangle />
                  <p>An error has occured</p>
                </div>
              )}
              {publicOrganizationsLoading && (
                <div className="h-64 place-content-center place-items-center">
                  <Spinner />
                </div>
              )}
              {!publicOrganizationsError &&
                !publicOrganizationsLoading &&
                (publicOrganizations.length === 0 ? (
                  <div className="h-64 place-content-center place-items-center space-y-2">
                    <CircleDashed />
                    <p>No public organizations found</p>
                  </div>
                ) : (
                  <>
                    <h1 className="font-medium">Public Organizations</h1>
                    <ScrollArea className="h-64">
                      {publicOrganizations.map((org) => (
                        <Fragment key={org.id}>
                          <OrganizationJoinButton
                            id={org.id}
                            identifier={org.identifier}
                            name={org.name}
                            imageFileId={org.imageFileId}
                            currentUserId={currentUserId}
                            synced={org.$synced}
                          />
                          <Separator />
                        </Fragment>
                      ))}
                    </ScrollArea>
                  </>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </div>
  )
}

function OrganizationLoginButton({
  id,
  name,
  identifier,
  imageFileId,
  status,
  synced,
  currentUserId,
}: {
  id: string
  name: string
  identifier: string
  imageFileId?: string | undefined
  status: UserOrgStatus
  synced: boolean
  currentUserId: string
}) {
  const navigate = useNavigate()

  const { data: avatarUrl, isFetching: avatarFetching } = useQuery(
    useFilePrefetchLinkQueryOptions({
      fileId: imageFileId ?? '',
      ownerResourceId: id,
    }),
  )

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault()
      if (status === 'active') {
        const login = await loginToOrganization({
          data: { organizationId: id },
        })
        if (login.success) navigate({ to: '/dashboard' })
        else toast.error(login.error, { description: login.data.message })
      } else if (status === 'invited') {
        updateMembershipAction({
          action: 'acceptOrganization',
          organizationId: id,
          userId: currentUserId,
          navigate,
        })
      } else if (status === 'requested') {
        toast.error('Waiting for Admin to accept')
      } else if (status === 'suspended') {
        toast.error('You have been temporarily suspended')
      }
    },
    [status, navigate, currentUserId, id],
  )

  return (
    <Button
      variant="ghost"
      className="w-full min-h-12 h-auto rounded-none grid grid-cols-[3rem_2fr_1fr_2fr]"
      disabled={!synced}
      onClick={onClick}
    >
      <Avatar>
        {avatarFetching ? (
          <Spinner className="size-full stroke-1" />
        ) : (
          <>
            <AvatarImage src={avatarUrl?.url} alt={name} />
            <AvatarFallback>
              {name
                .split(' ')
                .map((s) => s.at(0))
                .slice(0, 2)
                .join('')}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <h1 className="text-base font-light text-start text-ellipsis">{name}</h1>
      <p className="opacity-20 text-sm font-light text-start text-ellipsis">
        {identifier}
      </p>

      {status === 'active' && (
        <span className="place-self-end self-center flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
          <p className="text-xs font-light">Login</p>
          <ArrowRight />
        </span>
      )}
      {status === 'invited' && (
        <span className="place-self-end self-center flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
          <p className="text-xs font-light">Accept Invite</p>
          <CheckCircle2 />
        </span>
      )}
      {status === 'requested' && (
        <span className="place-self-end self-center flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
          <p className="text-xs font-light">Pending Request</p>
          <Spinner />
        </span>
      )}
      {status === 'suspended' && (
        <span className="place-self-end self-center flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
          <p className="text-xs font-light">Suspended</p>
          <XCircle />
        </span>
      )}
    </Button>
  )
}

function OrganizationJoinButton({
  id,
  name,
  identifier,
  imageFileId,
  currentUserId,
  synced,
}: {
  id: string
  name: string
  identifier: string
  imageFileId?: string | undefined
  currentUserId: string
  synced: boolean
}) {
  const { data: avatarUrl, isFetching: avatarFetching } = useQuery(
    useFilePrefetchLinkQueryOptions({
      fileId: imageFileId ?? '',
      ownerResourceId: id,
    }),
  )

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault()
      createMembershipAction({
        action: 'request',
        organizationId: id,
        userId: currentUserId,
      })
    },
    [currentUserId, id],
  )

  return (
    <Button
      variant="ghost"
      className="w-full min-h-12 h-auto rounded-none grid grid-cols-[3rem_2fr_1fr_2fr]"
      disabled={!synced}
      onClick={onClick}
    >
      <Avatar>
        {avatarFetching ? (
          <Spinner className="size-full stroke-1" />
        ) : (
          <>
            <AvatarImage src={avatarUrl?.url} alt={name} />
            <AvatarFallback>
              {name
                .split(' ')
                .map((s) => s.at(0))
                .join('')}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <h1 className="text-base font-light text-start text-ellipsis">{name}</h1>
      <p className="opacity-20 text-sm font-light text-start text-ellipsis">
        {identifier}
      </p>

      <span className="place-self-end self-center flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
        <p className="text-xs font-light">Request</p>
        <Plus />
      </span>
    </Button>
  )
}
