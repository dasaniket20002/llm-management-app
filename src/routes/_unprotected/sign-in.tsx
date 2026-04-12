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
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { authClient } from '#/lib/auth-client'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { FingerprintPattern } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import * as z from 'zod'

const signinSchema = z.object({
  email: z.email('Enter valid Email Address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password is too long'),
})

export const Route = createFileRoute('/_unprotected/sign-in')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState<boolean>(false)
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: signinSchema,
      onBlur: signinSchema,
      onChange: signinSchema,
    },
    onSubmit: async ({ value }) =>
      await authClient.signIn.email({
        email: value.email,
        password: value.password,
        fetchOptions: {
          onRequest: () => setSubmitting(true),
          onResponse: () => setSubmitting(false),
          onSuccess: () => {
            toast.success('Signed in successfully')
            navigate({ to: '/preprocess/account-setup' })
          },
          onError: ({ error }) => {
            toast.error(error.message)
          },
        },
      }),
  })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
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
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <CardDescription>
                Enter your details below to continue to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="sign-in-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  <form.Field name="email">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="john.doe@example.com"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  </form.Field>

                  <Field>
                    <form.Field name="password">
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
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>

                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Spinner data-icon="inline-start" /> Logging In
                        </>
                      ) : (
                        'Login'
                      )}
                    </Button>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or continue with
                  </FieldSeparator>

                  <Field>
                    <Button
                      disabled={submitting}
                      variant="outline"
                      type="button"
                      onClick={async () =>
                        await authClient.signIn.social({
                          requestSignUp: true,
                          provider: 'google',
                          callbackURL: '/preprocess/account-setup',
                          fetchOptions: {
                            onRequest: () => setSubmitting(true),
                            onResponse: () => setSubmitting(false),
                            onError: ({ error }) => {
                              toast.error(error.message)
                            },
                          },
                        })
                      }
                    >
                      {submitting ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          x="0px"
                          y="0px"
                          width="100"
                          height="100"
                          viewBox="0 0 30 30"
                          className="fill-foreground size-4"
                          data-icon="inline-start"
                        >
                          <path d="M 15.003906 3 C 8.3749062 3 3 8.373 3 15 C 3 21.627 8.3749062 27 15.003906 27 C 25.013906 27 27.269078 17.707 26.330078 13 L 25 13 L 22.732422 13 L 15 13 L 15 17 L 22.738281 17 C 21.848702 20.448251 18.725955 23 15 23 C 10.582 23 7 19.418 7 15 C 7 10.582 10.582 7 15 7 C 17.009 7 18.839141 7.74575 20.244141 8.96875 L 23.085938 6.1289062 C 20.951937 4.1849063 18.116906 3 15.003906 3 z"></path>
                        </svg>
                      )}
                      Sign in with Google
                    </Button>

                    <Button
                      disabled={submitting}
                      variant="outline"
                      type="button"
                      onClick={async () =>
                        await authClient.signIn.passkey({
                          fetchOptions: {
                            onRequest: () => setSubmitting(true),
                            onResponse: () => setSubmitting(false),
                            onSuccess: () => {
                              navigate({ to: '/preprocess/account-setup' })
                            },
                            onError: ({ error }) => {
                              toast.error(error.message)
                            },
                          },
                        })
                      }
                    >
                      {submitting ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <FingerprintPattern data-icon="inline-start" />
                      )}
                      Sign in with Passkey
                    </Button>

                    <FieldDescription className="px-6 text-center">
                      Don't have an account?{' '}
                      <Link to="/sign-up" className="whitespace-nowrap">
                        Sign Up
                      </Link>
                    </FieldDescription>
                  </Field>
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
