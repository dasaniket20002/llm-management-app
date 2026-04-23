import { publicOrganizationCollection } from '#/lib/client/collections/public-organizations'
import { selfOrganizationCollection } from '#/lib/client/collections/self-organization'
import { getPresignedGetUrl } from '#/lib/server/functions/file.functions'
import { and, eq, inArray, not, useLiveQuery } from '@tanstack/react-db'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, CircleDashed, Plus } from 'lucide-react'
import { Fragment } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Spinner } from './ui/spinner'

export default function OrganizationJoinForm({
  canJoinOrganization,
}: {
  canJoinOrganization: boolean
}) {
  const {
    data: selfOrganizations,
    isLoading: selfOrganizationsLoading,
    isError: selfOrganizationsError,
  } = useLiveQuery((q) =>
    q
      .from({ organization: selfOrganizationCollection })
      .orderBy(({ organization }) => organization.updatedAt, 'desc'),
  )

  const {
    data: publicOrganizations,
    isLoading: publicOrganizationsLoading,
    isError: publicOrganizationsError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ organization: publicOrganizationCollection })
        .where(({ organization }) =>
          and(
            not(
              inArray(
                organization.id,
                selfOrganizations.map((s) => s.id),
              ),
            ),
            eq(organization.$synced, true),
          ),
        )
        .orderBy(({ organization }) => organization.name, 'asc'),
    [selfOrganizations],
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
                    <Fragment key={org.id}>
                      <OrganizationLoginButton
                        id={org.id}
                        identifier={org.identifier}
                        name={org.name}
                        imageFileId={org.imageFileId}
                        synced={org.$synced}
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
  synced,
}: {
  id: string
  name: string
  identifier: string
  imageFileId?: string | undefined
  synced: boolean
}) {
  const { data: avatarUrl, isFetching: avatarFetching } = useQuery({
    queryKey: [`org-img-$${id}`],
    queryFn: async () => {
      if (!imageFileId) return ''
      const _avatarUrl = await getPresignedGetUrl({
        data: { fileId: imageFileId, ownerResourceId: id },
      })
      console.log(_avatarUrl)
      if (!_avatarUrl.success) return ''
      return _avatarUrl.data.url
    },
    initialData: '',
  })
  return (
    <Button
      variant="ghost"
      className="w-full min-h-12 h-auto rounded-none justify-start gap-6"
      disabled={!synced}
    >
      <Avatar>
        {avatarFetching ? (
          <Spinner className="size-full stroke-1" />
        ) : (
          <>
            <AvatarImage src={avatarUrl} alt={name} />
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

      <span className="w-full flex-1 py-1 text-start grid grid-cols-2 gap-3 items-end">
        <h1 className="text-base font-light">{name}</h1>
        <p className="opacity-20 text-sm font-light">{identifier}</p>
      </span>

      <span className="flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
        <p className="text-xs font-light">Login</p>
        <ArrowRight />
      </span>
    </Button>
  )
}

function OrganizationJoinButton({
  id,
  name,
  identifier,
  imageFileId,
  synced,
}: {
  id: string
  name: string
  identifier: string
  imageFileId?: string | undefined
  synced: boolean
}) {
  const { data: avatarUrl, isFetching: avatarFetching } = useQuery({
    queryKey: [`org-img-$${id}`],
    queryFn: async () => {
      if (!imageFileId) return ''
      const _avatarUrl = await getPresignedGetUrl({
        data: { fileId: imageFileId, ownerResourceId: id },
      })
      if (!_avatarUrl.success) return ''
      return _avatarUrl.data.url
    },
    initialData: '',
  })
  return (
    <Button
      variant="ghost"
      className="w-full min-h-12 h-auto rounded-none justify-start gap-6"
      disabled={!synced}
    >
      <Avatar>
        {avatarFetching ? (
          <Spinner className="size-full stroke-1" />
        ) : (
          <>
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>
              {name
                .split(' ')
                .map((s) => s.at(0))
                .join('')}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <span className="w-full flex-1 py-1 text-start grid grid-cols-2 gap-3 items-end">
        <h1 className="text-base font-light">{name}</h1>
        <p className="opacity-20 text-sm font-light">{identifier}</p>
      </span>

      <span className="flex gap-1 opacity-0 group-hover/button:opacity-30 transition-opacity">
        <p className="text-xs font-light">Join</p>
        <Plus />
      </span>
    </Button>
  )
}
