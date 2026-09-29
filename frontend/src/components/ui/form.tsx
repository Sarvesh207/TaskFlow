import {
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  cloneElement,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const controlBase = cn(
  'w-full rounded-lg border border-border bg-input text-[13.5px] text-fg placeholder:text-subtle',
  'transition-[border-color,box-shadow] duration-200 ease-out-expo',
  'hover:border-border-strong',
  'focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-primary/15',
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border',
  'aria-[invalid=true]:border-red-500/60 aria-[invalid=true]:focus:ring-red-500/15',
)

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(controlBase, 'h-9 px-3', className)} {...props} />
}

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(controlBase, 'min-h-24 resize-y px-3 py-2.5', className)} {...props} />
}

export function Select({
  className,
  children,
  ref,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} className={cn(controlBase, 'h-9 cursor-pointer appearance-none pr-9 pl-3')} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle"
        aria-hidden
      />
    </div>
  )
}

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  className?: string
  /** A single form control; receives `id`, `aria-invalid` and `aria-describedby`. */
  children: ReactElement<Record<string, unknown>>
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const control = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? messageId : undefined,
  })

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-fg/90">
        {label}
      </label>
      {control}
      {error ? (
        <p id={messageId} className="animate-rise text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="animate-rise rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2.5 text-[13px] text-red-600 dark:text-red-300"
    >
      {message}
    </div>
  )
}
