import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field, FormError, Input } from '@/components/ui/form'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { applyFieldErrors } from '@/lib/form'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { AuthDivider, GoogleButton } from '@/features/auth/GoogleButton'
import { googleErrorMessage } from '@/features/auth/google-error'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useLogin, useRegister } from '@/features/auth/queries'

// Same rules as backend/src/modules/auth/auth.schema.ts.
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .max(100, 'Password must be at most 100 characters')
    .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), 'Password does not meet the requirements'),
})
type Values = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerUser = useRegister()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { full_name: '', email: '', password: '' } })
  const password = useWatch({ control, name: 'password' })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    registerUser.mutate(values, {
      // Registration doesn't start a session — sign in with the same credentials.
      onSuccess: () =>
        login.mutate(
          { email: values.email, password: values.password },
          {
            onSuccess: () => navigate('/', { replace: true }),
            onError: () => navigate('/login', { replace: true }),
          },
        ),
      onError: (error) => {
        if (!applyFieldErrors(error, setError, ['full_name', 'email', 'password'])) setFormError(errorMessage(error))
      },
    })
  })

  return (
    <AuthLayout title="Create your account" subtitle="Start turning ideas into progress">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />
        <Field label="Full name" error={errors.full_name?.message}>
          <Input autoComplete="name" placeholder="Jane Cooper" autoFocus {...register('full_name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        {/* Only once the user starts typing (or submits an invalid password). */}
        {password || errors.password ? (
          <ul className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2" aria-label="Password requirements">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password ?? '')
              return (
                <li key={rule.label} className={cn('flex items-center gap-1.5', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted')}>
                  {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
                  {rule.label}
                </li>
              )
            })}
          </ul>
        ) : null}
        <Button type="submit" className="w-full" loading={registerUser.isPending || login.isPending}>
          Create account
        </Button>
      </form>
      <AuthDivider />
      <GoogleButton onError={(code) => setFormError(googleErrorMessage(code))} />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
