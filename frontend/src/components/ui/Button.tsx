import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'
type Size = 'sm' | 'md' | 'icon'

const VARIANTS: Record<Variant, string> = {
  // Flat brand blue with a hairline top highlight, like takeuforward's primary actions.
  primary: cn(
    'bg-primary text-primary-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_var(--shadow-color)]',
    'hover:bg-primary-hover active:bg-primary-pressed',
  ),
  secondary: cn(
    'border border-border bg-surface text-fg shadow-[0_1px_2px_var(--shadow-color)]',
    'hover:border-border-strong hover:bg-surface-2',
  ),
  ghost: 'text-muted hover:bg-hover-strong hover:text-fg',
  danger: 'bg-red-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-red-500',
  'danger-outline':
    'border border-red-500/30 bg-red-500/[0.06] text-red-600 hover:border-red-500/50 hover:bg-red-500/10 dark:text-red-300',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[12.5px]',
  md: 'h-9 gap-2 px-3.5 text-[13px]',
  icon: 'size-9 justify-center',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out-expo',
    'active:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:size-4 [&_svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant,
  size,
  loading,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className as string | undefined)} {...props}>
      {icon}
      {children}
    </Link>
  )
}
