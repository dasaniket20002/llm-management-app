import { useEffect, useState } from 'react'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldValid,
} from './ui/field'
import { createOrganizationResourceAction } from '#/lib/client/collections/self-organization'
import { organizationIdentifierAvailable } from '#/lib/server/functions/organization.functions'
import { useForm } from '@tanstack/react-form'
import { AvatarInput } from './avatar-input'
import { CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Spinner } from './ui/spinner'
import z from 'zod'
import { Separator } from './ui/separator'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Button } from './ui/button'

const createFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  uniqueIdentifier: z.string().min(1, 'Unique Identifier is required'),
  private: z.boolean(),
})

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

export default function OrganizationCreateForm() {
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
    onSubmit: async ({ value, formApi }) => {
      createOrganizationResourceAction({
        name: value.name,
        identifier: value.uniqueIdentifier,
        visibility: value.private ? 'private' : 'public',
        imageFile: image,
      })
      formApi.reset()
      setImage(null)
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
      <Separator />
      <CardContent className="h-full place-content-center">
        <form
          id="create-org-form"
          onSubmit={(e) => {
            e.preventDefault()
            createForm.handleSubmit()
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
                  const res = await organizationIdentifierAvailable({
                    data: { identifier: value },
                  })

                  if (res.data.available) return
                  return { message: 'Identifier unavailable' }
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
                    {isValid && (
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
