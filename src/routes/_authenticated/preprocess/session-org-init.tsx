import { AvatarInput } from '#/components/avatar-input'
import Logo from '#/components/logo'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldValid,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { Spinner } from '#/components/ui/spinner'
import { Switch } from '#/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { authClient } from '#/lib/auth-client'
import { useIsMobile } from '#/lib/client/hooks/use-mobile'
import { updateSessionOrganization } from '#/lib/server/functions/auth.functions'
import {
  getSelfOrganizations,
  organizationIdentifierAvailable,
} from '#/lib/server/functions/organization.functions'
import { checkPermissions } from '#/lib/server/functions/permission.functions'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import z from 'zod'

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
        await updateSessionOrganization({
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

const createFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  uniqueIdentifier: z.string().min(1, 'Unique Identifier is required'),
  private: z.boolean(),
})

function RouteComponent() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { canCreateOrganization, canJoinOrganization } = Route.useRouteContext()

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
        <Card className="w-full flex-col-reverse md:flex-row py-0">
          {canCreateOrganization && <CreateForm />}
          {canCreateOrganization && canJoinOrganization && (
            <Separator orientation={isMobile ? 'horizontal' : 'vertical'} />
          )}

          <div className="flex flex-col gap-6 w-full py-6">
            <CardHeader className="text-center">
              <CardTitle>Select Workspace</CardTitle>
              <CardDescription>
                Select an Organization to work on
              </CardDescription>
            </CardHeader>
            <CardContent></CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}

const MAX_IMAGE_SIZE = 500 * 1024
function OrgImageInput({
  image,
  setImage,
}: {
  image: File | null
  setImage: (image: File | null) => void
}) {
  const [imageInvalid, setImageInvalid] = useState(false)
  useEffect(() => {
    if (image) {
      const size = image.size
      if (size > MAX_IMAGE_SIZE) {
        setImage(null)
        setImageInvalid(true)
      } else setImageInvalid(false)
    }
  }, [image])

  return (
    <Field data-invalid={imageInvalid} orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="image">
          Display image for your organization
        </FieldLabel>
        <FieldDescription>
          Must be under {MAX_IMAGE_SIZE / 1024}kb
        </FieldDescription>
        {imageInvalid && (
          <FieldError
            errors={[{ message: 'Unsupported or size exceeds file limit' }]}
          />
        )}
      </FieldContent>
      <AvatarInput
        id="image"
        name="image"
        value={image}
        onChange={setImage}
        ariaInvalid={imageInvalid}
      />
    </Field>
  )
}

function CreateForm() {
  const [image, setImage] = useState<File | null>(null)

  const createForm = useForm({
    defaultValues: {
      name: '',
      uniqueIdentifier: '',
      private: false,
    },
    validators: {
      onSubmit: createFormSchema,
      onChange: createFormSchema,
      onBlur: createFormSchema,
    },
    onSubmit: async ({ value }) => {
      console.log(value)
    },
  })

  return (
    <div className="flex flex-col gap-6 w-full py-6">
      <CardHeader className="text-center">
        <CardTitle>Create Organization</CardTitle>
        <CardDescription>
          Create and manage your own organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="create-org-form"
          onSubmit={(e) => {
            e.preventDefault()
            createForm.handleSubmit().then(() => {
              createForm.reset()
              setImage(null)
            })
          }}
        >
          <FieldGroup>
            <OrgImageInput image={image} setImage={setImage} />

            <createForm.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid} className="flex-none">
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="XYZ"
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    <FieldDescription>
                      A name for your organization
                    </FieldDescription>
                  </Field>
                )
              }}
            </createForm.Field>

            <createForm.Field
              name="uniqueIdentifier"
              validators={{
                onBlurAsync: async ({ value }) => {
                  if (!value || createForm.state.isSubmitSuccessful)
                    return undefined
                  const data = await organizationIdentifierAvailable({
                    data: { identifier: value },
                  })

                  if (data.success) return
                  return { message: data.error }
                },
              }}
            >
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  !field.state.meta.isValid &&
                  !field.state.meta.isValidating
                const isValid =
                  field.state.meta.isTouched &&
                  field.state.meta.isValid &&
                  !field.state.meta.isValidating
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Identifier</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="UniqueXYZ"
                      autoComplete="off"
                    />
                    {field.state.meta.isValidating && (
                      <div className="text-xs tracking-wider font-normal inline-flex gap-1.5 items-center">
                        <Spinner className="stroke-1 size-3" />
                        Checking availability...
                      </div>
                    )}
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    {isValid && !createForm.state.isSubmitSuccessful && (
                      <FieldValid
                        messages={[{ message: 'Identifier available' }]}
                      />
                    )}
                    {createForm.state.isSubmitSuccessful && (
                      <FieldValid
                        messages={[{ message: 'Identifier updated' }]}
                      />
                    )}
                    <FieldDescription>
                      An unique identifier for your organization
                    </FieldDescription>
                  </Field>
                )
              }}
            </createForm.Field>

            <createForm.Field name="private">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field orientation="horizontal" data-invalid={isInvalid}>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>
                        Make Private?
                      </FieldLabel>
                      <FieldDescription>
                        If private, this organization will not be visible to
                        anybody else without recieving an invitation from the
                        admin
                      </FieldDescription>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </FieldContent>
                    <Switch
                      id={field.name}
                      name={field.name}
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      aria-invalid={isInvalid}
                    />
                  </Field>
                )
              }}
            </createForm.Field>

            <Field>
              <Button type="submit">Create Organization</Button>
              <FieldDescription>
                This will create an organization with you as an{' '}
                <span className="font-medium">admin</span>.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </div>
  )
}
