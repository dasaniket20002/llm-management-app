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
import {
  isPasskeySet,
  isPasswordSet,
  isUsernameSet,
  updatePassword,
  updateUsername,
} from '#/lib/server/functions/user.functions'
import { env } from '#/lib/utils/env'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/preprocess/account-setup')({
  beforeLoad: async () => {
    const data = await ensureSession()

    const usernameSetPromise = isUsernameSet()
    const passwordSetPromise = isPasswordSet()
    const passkeySetPromise = isPasskeySet()

    const [usernameSet, passwordSet, passkeySet] = await Promise.all([
      usernameSetPromise,
      passwordSetPromise,
      passkeySetPromise,
    ])

    if (usernameSet.data && passwordSet.data) throw redirect({ to: '/main' })

    return {
      session: data.data,
      usernameSet: usernameSet.data,
      passwordSet: passwordSet.data,
      passkeySet: passkeySet.data,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { session, passwordSet, usernameSet, passkeySet } =
    Route.useRouteContext()
  const [addingPasskey, setAddingPasskey] = useState<boolean>(false)
  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      let success = true
      console.log('submit')

      if (!usernameSet) {
        const usernameRes = await updateUsername({
          data: {
            newUsername: value.username,
          },
        })

        success &&= usernameRes.success
        if (usernameRes.success) toast.success('Username updated')
        else toast.error(usernameRes.error)
      }
      if (!passwordSet) {
        const passwordRes = await updatePassword({
          data: {
            newPassword: value.password,
          },
        })

        success &&= passwordRes.success
        if (passwordRes.success) toast.success('Password updated')
        else toast.error(passwordRes.error)
      }

      console.log(success)
      if (success) navigate({ to: '/main' })
      else navigate({ to: '/preprocess/account-setup' })
    },
  })

  const addPasskey = useCallback(async () => {
    const { error } = await authClient.passkey.addPasskey({
      name: env.VITE_APP_TITLE,
      authenticatorAttachment: 'platform',
      fetchOptions: {
        onRequest: () => setAddingPasskey(true),
        onResponse: () => setAddingPasskey(false),
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
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  {!usernameSet && (
                    <form.Field
                      name="username"
                      asyncDebounceMs={500}
                      validators={{
                        onSubmit: ({ value }) => {
                          if (value.length < 1)
                            return { message: 'Username is required' }
                          if (value.length < 4)
                            return { message: 'Username must be 4 characters' }
                          if (value === 'admin')
                            return { message: 'Username cannot be admin' }
                          return undefined
                        },
                        onChange: ({ value }) => {
                          if (value.length < 1)
                            return { message: 'Username is required' }
                          if (value.length < 4)
                            return { message: 'Username must be 4 characters' }
                          if (value === 'admin')
                            return { message: 'Username cannot be admin' }
                          return undefined
                        },
                        onBlur: ({ value }) => {
                          if (value.length < 1)
                            return { message: 'Username is required' }
                          if (value.length < 4)
                            return { message: 'Username must be 4 characters' }
                          if (value === 'admin')
                            return { message: 'Username cannot be admin' }
                          return undefined
                        },
                        onBlurAsync: async ({ value }) => {
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
                            <FieldLabel htmlFor={field.name}>
                              Username
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="johndoe007"
                              autoComplete="off"
                              disabled={form.state.isSubmitting}
                            />

                            {field.state.meta.isValidating && (
                              <div className="text-xs tracking-wider font-normal inline-flex gap-1.5 items-center">
                                <Spinner />
                                Checking availability...
                              </div>
                            )}
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                            {isValid && (
                              <FieldValid
                                messages={[{ message: 'Username available' }]}
                              />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>
                  )}

                  {!passwordSet && (
                    <Field className="grid grid-cols-2 gap-4">
                      <form.Field
                        name="password"
                        validators={{
                          onChange: ({ value }) => {
                            if (value.length < 8)
                              return {
                                message:
                                  'Password must be greater than 8 characters',
                              }
                            if (value.length > 32)
                              return { message: 'Password is too long' }
                            return undefined
                          },
                          onBlur: ({ value }) => {
                            if (value.length < 8)
                              return {
                                message:
                                  'Password must be greater than 8 characters',
                              }
                            if (value.length > 32)
                              return { message: 'Password is too long' }
                            return undefined
                          },
                          onSubmit: ({ value }) => {
                            if (value.length < 8)
                              return {
                                message:
                                  'Password must be greater than 8 characters',
                              }
                            if (value.length > 32)
                              return { message: 'Password is too long' }
                            return undefined
                          },
                        }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Password
                              </FieldLabel>
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                                autoComplete="off"
                                type="password"
                                placeholder="••••••••"
                                disabled={form.state.isSubmitting}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      </form.Field>

                      <form.Field
                        name="confirmPassword"
                        validators={{
                          onChange: ({ value }) => {
                            if (value !== form.state.values.password)
                              return { message: "Passwords don't match" }
                            return undefined
                          },
                          onBlur: ({ value }) => {
                            if (value !== form.state.values.password)
                              return { message: "Passwords don't match" }
                            return undefined
                          },
                          onSubmit: ({ value }) => {
                            if (value !== form.state.values.password)
                              return { message: "Passwords don't match" }
                            return undefined
                          },
                        }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
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
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                                autoComplete="off"
                                type="password"
                                placeholder="••••••••"
                                disabled={form.state.isSubmitting}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      </form.Field>
                    </Field>
                  )}

                  <FieldSeparator />

                  {!passkeySet && (
                    <Field className="grid grid-cols-[2fr_1fr] gap-x-4 gap-y-6 items-center">
                      <FieldLabel
                        className="gap-0.5 flex-col items-start cursor-pointer"
                        htmlFor="passkey"
                      >
                        <FieldLabel>Add a Passkey</FieldLabel>
                        <FieldDescription>
                          Setup password-less sign-in to your account
                        </FieldDescription>
                      </FieldLabel>
                      <Button
                        id="passkey"
                        name="passkey"
                        type="button"
                        variant="secondary"
                        onClick={() => addPasskey()}
                        disabled={addingPasskey}
                      >
                        Passkey
                        {addingPasskey ? <Spinner /> : <Plus />}
                      </Button>
                    </Field>
                  )}

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
                      type="submit"
                      disabled={form.state.isSubmitting}
                    >
                      Continue
                      {form.state.isSubmitting ? <Spinner /> : <ArrowRight />}
                    </Button>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    or
                  </FieldSeparator>

                  <Button
                    id="skip"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigate({ to: '/main' })
                    }}
                    disabled={form.state.isSubmitting}
                  >
                    Skip for now
                    {form.state.isSubmitting ? <Spinner /> : <ArrowRight />}
                  </Button>
                </FieldGroup>
              </form>
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
