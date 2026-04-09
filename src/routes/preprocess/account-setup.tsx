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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldValid,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { authClient } from '#/lib/auth-client'
import { ensureSession } from '#/lib/server/functions/auth.functions'
import { can } from '#/lib/server/functions/permission.functions'
import {
  isPasswordSet,
  isUsernameSet,
  setPassword,
  setUsername,
} from '#/lib/server/functions/user.functions'
import { env } from '#/lib/utils/env'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, FingerprintPattern, Save } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'

const setupUsernameSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(4, 'Username must be 4 characters'),
})

const setupPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(32, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

const searchParams = z.object({
  passwordSet: z.boolean(),
  usernameSet: z.boolean(),
  passkeySet: z.boolean(),
})

export const Route = createFileRoute('/preprocess/account-setup')({
  validateSearch: searchParams,
  beforeLoad: async () => {
    const data = await ensureSession()
    if (!data.success) throw redirect({ to: '/sign-in' })

    const permissions = await can({
      data: {
        subjectResourceId: data.data.user.id,
        targetResourceId: data.data.user.id,
        actions: ['user:update:username', 'user:update:password'],
      },
    })

    if (!permissions[0] && !permissions[1])
      throw redirect({ to: '/org-settings' })

    return {
      session: data.data,
      usernameChangePermission: permissions[0],
      passwordChangePermission: permissions[1],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { session, usernameChangePermission, passwordChangePermission } =
    Route.useRouteContext()
  const { passwordSet, usernameSet } = Route.useSearch()

  const [validatingRedirect, setValidatingRedirect] = useState(false)
  const continueNext = useCallback(async () => {
    setValidatingRedirect(true)
    const usernameSetPromise = isUsernameSet()
    const passwordSetPromise = isPasswordSet()

    const [_usernameSet, _passwordSet] = await Promise.all([
      usernameSetPromise,
      passwordSetPromise,
    ])
    setValidatingRedirect(false)

    const shouldUpdateUsername = !_usernameSet.data && usernameChangePermission
    const shouldUpdatePassword = !_passwordSet.data && passwordChangePermission

    if (!shouldUpdateUsername && !shouldUpdatePassword)
      toast.error('Please provide Username and Password')
    else if (!shouldUpdateUsername) toast.error('Please provide Username')
    else if (!shouldUpdatePassword) toast.error('Please provide Password')
    else navigate({ to: '/org-settings' })
  }, [navigate])

  return (
    <div className="flex h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Logo
          includeName
          className="self-center"
          textVariant="primary"
          iconVariant="card"
        />
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                Hello, {session.user.name}!
              </CardTitle>
              <CardDescription>
                Enter your details below to setup your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {!usernameSet && usernameChangePermission && <UsernameForm />}
                {!passwordSet && passwordChangePermission && <PassowrdForm />}
                <Field className="grid grid-cols-[2fr_1fr] gap-x-4 gap-y-6 items-center">
                  <FieldLabel
                    className="gap-0.5 flex-col items-start cursor-pointer"
                    htmlFor="continue"
                  >
                    <FieldLabel>Continue to your Account</FieldLabel>
                    <FieldDescription>
                      You may change the Settings later
                    </FieldDescription>
                  </FieldLabel>
                  <Button
                    id="continue"
                    name="continue"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      continueNext()
                    }}
                    disabled={validatingRedirect}
                  >
                    Continue
                    {validatingRedirect ? <Spinner /> : <ArrowRight />}
                  </Button>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center">
            By continuing, you agree to our <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}

function UsernameForm() {
  const [submitting, setSubmitting] = useState(false)
  const usernameForm = useForm({
    defaultValues: { username: '' },
    validators: {
      onSubmit: setupUsernameSchema,
      onBlur: setupUsernameSchema,
      onChange: setupUsernameSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true)
      const res = await setUsername({ data: { newUsername: value.username } })
      if (res.success) toast.success(res.message)
      else toast.error(res.error)
      setSubmitting(false)
    },
  })
  return (
    <>
      <form
        id="username-form"
        onSubmit={(e) => {
          e.preventDefault()
          usernameForm.handleSubmit()
        }}
      >
        <usernameForm.Field
          name="username"
          validators={{
            onBlurAsync: async ({ value }) => {
              if (!value || usernameForm.state.isSubmitSuccessful)
                return undefined
              const res = await authClient.isUsernameAvailable({
                username: value,
              })

              if (!res.data?.available)
                return { message: 'Username is not available' }
              return undefined
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
                <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="johndoe007"
                  autoComplete="off"
                  disabled={submitting}
                />

                {field.state.meta.isValidating && (
                  <div className="text-xs tracking-wider font-normal inline-flex gap-1.5 items-center">
                    <Spinner />
                    Checking availability...
                  </div>
                )}
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                {isValid && !usernameForm.state.isSubmitSuccessful && (
                  <FieldValid messages={[{ message: 'Username available' }]} />
                )}
                {usernameForm.state.isSubmitSuccessful && (
                  <FieldValid messages={[{ message: 'Username updated' }]} />
                )}

                <Button
                  variant="outline"
                  aria-label="save"
                  type="submit"
                  disabled={submitting}
                >
                  <Save />
                  Save Username
                </Button>
              </Field>
            )
          }}
        </usernameForm.Field>
      </form>
      <FieldSeparator />
    </>
  )
}

function PassowrdForm() {
  const { passkeySet } = Route.useSearch()
  const [submitting, setSubmitting] = useState(false)

  const passwordForm = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: setupPasswordSchema,
      onBlur: setupPasswordSchema,
      onChange: setupPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true)
      const res = await setPassword({ data: { newPassword: value.password } })
      if (res.success) toast.success(res.message)
      else toast.error(res.error)
      setSubmitting(false)
    },
  })

  const addPasskey = useCallback(async () => {
    const { error } = await authClient.passkey.addPasskey({
      name: env.VITE_APP_TITLE,
      authenticatorAttachment: 'platform',
      fetchOptions: {
        onRequest: () => setSubmitting(true),
        onResponse: () => setSubmitting(false),
        onSuccess: () => {
          toast.success('Passkey Registered')
        },
        onError: (e) => {
          toast.error(e.error.message)
        },
      },
    })
    if (error) {
      toast.error(error.message?.toString())
    }
  }, [])

  return (
    <>
      <form
        id="password-form"
        onSubmit={(e) => {
          e.preventDefault()
          passwordForm.handleSubmit()
        }}
      >
        <Field>
          <Field className="grid grid-cols-2 gap-4">
            <passwordForm.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      type="password"
                      placeholder="••••••••"
                      disabled={submitting}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                    {passwordForm.state.isSubmitSuccessful && (
                      <FieldValid messages={[{ message: 'Password set' }]} />
                    )}
                  </Field>
                )
              }}
            </passwordForm.Field>

            <passwordForm.Field name="confirmPassword">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      type="password"
                      placeholder="••••••••"
                      disabled={submitting}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </passwordForm.Field>
          </Field>

          <Button variant="outline" type="submit" disabled={submitting}>
            <Save />
            Save Password
          </Button>

          {!passkeySet && (
            <>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={(e) => {
                  e.preventDefault()
                  addPasskey()
                }}
              >
                <FingerprintPattern />
                Add Passkey
              </Button>
              <FieldDescription>
                Add Passkeys for password-less sign-in
              </FieldDescription>
            </>
          )}
        </Field>
      </form>
      <FieldSeparator />
    </>
  )
}
