import { zodResolver } from '@hookform/resolvers/zod'
import { Camera } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/misc'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { ApiRequestError } from '@/lib/api'
import { useMe } from '@/features/auth/queries'
import { formatDate } from '@/lib/format'
import { applyFieldErrors, changedFields } from '@/lib/form'
import type { User } from '@/types/api'
import { useUpdateUser } from '@/features/users/queries'

// Mirrors updateUserSchema in backend/src/modules/users/users.schema.ts.
const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[0-9 ()-]{7,20}$/.test(v), 'Phone must be 7-20 digits and may start with +'),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters'),
})
type Values = z.infer<typeof schema>
const FIELDS = ['full_name', 'email', 'phone', 'bio'] as const

function toValues(user: User): Values {
  return {
    full_name: user.full_name,
    email: user.email,
    phone: user.profile?.phone ?? '',
    bio: user.profile?.bio ?? '',
  }
}

export function MyProfilePage() {
  const me = useMe()
  const update = useUpdateUser(me.id)
  const [photoOpen, setPhotoOpen] = useState(false)
  const initial = toValues(me)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), values: initial })

  const onSubmit = handleSubmit(async (values) => {
    const diff = changedFields(values, initial)
    // The API rejects an empty phone (it must match the pattern), so an emptied phone is left unchanged.
    if (diff.phone === '') delete diff.phone
    if (Object.keys(diff).length === 0) return
    try {
      const { data } = await update.mutateAsync(diff)
      reset(toValues(data))
    } catch (error) {
      applyFieldErrors(error, setError, FIELDS)
    }
  })

  return (
    <div className="max-w-4xl">
      <PageHeader title="My Profile" description="Manage your personal information." />
      <Card className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar name={me.full_name} src={me.profile?.avatar_url} seed={me.id} size="xl" />
          <Button size="sm" icon={<Camera className="size-3.5" />} onClick={() => setPhotoOpen(true)}>
            Change Photo
          </Button>
          <p className="text-xs text-muted">Member since {formatDate(me.created_at)}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Full Name" error={errors.full_name?.message}>
              <Input autoComplete="name" {...register('full_name')} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" autoComplete="email" {...register('email')} />
            </Field>
          </div>
          <Field label="Phone" error={errors.phone?.message}>
            <Input type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...register('phone')} />
          </Field>
          <Field label="Bio" error={errors.bio?.message} hint="Up to 500 characters.">
            <Textarea rows={4} placeholder="Tell your team a little about yourself" {...register('bio')} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" disabled={!isDirty || isSubmitting} onClick={() => reset(initial)}>
              Discard
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <PhotoModal open={photoOpen} onOpenChange={setPhotoOpen} user={me} />
    </div>
  )
}

function PhotoModal({ open, onOpenChange, user }: { open: boolean; onOpenChange: (open: boolean) => void; user: User }) {
  const update = useUpdateUser(user.id)
  const [url, setUrl] = useState(user.profile?.avatar_url ?? '')
  const [error, setError] = useState<string>()
  const preview = z.url().safeParse(url.trim()).success ? url.trim() : null

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = url.trim()
    if (!z.url().safeParse(value).success) {
      setError('Avatar URL must be a valid URL')
      return
    }
    update.mutate(
      { avatar_url: value },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          if (err instanceof ApiRequestError) setError(err.fieldErrors.avatar_url?.[0])
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (next) setUrl(user.profile?.avatar_url ?? '')
        setError(undefined)
        onOpenChange(next)
      }}
      title="Change Photo"
      description="Paste a link to an image. File uploads aren't supported yet."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="flex justify-center">
          <Avatar name={user.full_name} src={preview} seed={user.id} size="xl" />
        </div>
        <Field label="Image URL" error={error}>
          <Input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError(undefined)
            }}
          />
        </Field>
        <ModalActions>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save Photo
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
