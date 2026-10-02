import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field, FormError, Input } from '@/components/ui/form'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { ApiRequestError, errorMessage } from '@/lib/api'
import { applyFieldErrors } from '@/lib/form'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { AuthDivider, GoogleButton } from '@/features/auth/GoogleButton'
import { googleErrorMessage } from '@/features/auth/google-error'
import { safeNext } from '@/features/auth/redirect'
import { useLogin } from '@/features/auth/queries'

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  // A failed Google sign-in lands back here with `?error=CODE`.
  const [formError, setFormError] = useState<string | null>(() => googleErrorMessage(params.get('error')))

  // Show the Google error once; a refresh shouldn't bring it back.
  useEffect(() => {
    if (!params.has('error')) return
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        nextParams.delete('error')
        return nextParams
      },
      { replace: true },
    )
  }, [params, setParams])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: () => navigate(safeNext(params.get('next')), { replace: true }),
      onError: (error) => {
        if (applyFieldErrors(error, setError, ['email', 'password'])) return
        setFormError(
          error instanceof ApiRequestError && error.code === 'INVALID_CREDENTIALS'
            ? 'Invalid email or password.'
            : errorMessage(error),
        )
      },
    })
  })

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" autoFocus {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            autoComplete="current-password"
            {...register('password')}
          />
        </Field>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <AuthDivider />
      <GoogleButton next={safeNext(params.get('next'))} onError={(code) => setFormError(googleErrorMessage(code))} />
      <p className="mt-8 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
