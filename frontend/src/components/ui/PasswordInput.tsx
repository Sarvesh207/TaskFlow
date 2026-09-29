import { Eye, EyeOff } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Input } from './form'

export function PasswordInput({
  show,
  onToggle,
  ...props
}: ComponentProps<typeof Input> & { show: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} placeholder="••••••••" className="pr-10" {...props} />
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
