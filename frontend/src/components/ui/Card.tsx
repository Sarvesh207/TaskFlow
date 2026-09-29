import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { AnimatedNumber } from './AnimatedNumber'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-highlight rounded-xl border border-border bg-surface', className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

const STAT_TONES = {
  violet: { icon: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300', glow: 'from-violet-500/[0.06]' },
  blue: { icon: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-300', glow: 'from-blue-500/[0.06]' },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300', glow: 'from-emerald-500/[0.06]' },
  red: { icon: 'bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-300', glow: 'from-red-500/[0.06]' },
  amber: { icon: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300', glow: 'from-amber-500/[0.06]' },
} as const

interface StatCardProps {
  label: string
  /** A number animates up; anything else (e.g. a skeleton) renders as-is. */
  value: ReactNode
  icon: ReactNode
  tone?: keyof typeof STAT_TONES
  hint?: ReactNode
}

export function StatCard({ label, value, icon, tone = 'blue', hint }: StatCardProps) {
  const t = STAT_TONES[tone]
  return (
    <Card className="group relative overflow-hidden p-4 transition-colors duration-300 hover:border-border-strong">
      <div
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent to-60%', t.glow)}
        aria-hidden
      />
      <div className="relative flex items-center gap-2.5">
        <span className={cn('inline-flex size-7 items-center justify-center rounded-lg ring-1 ring-inset', t.icon)}>
          {icon}
        </span>
        <span className="text-[13px] text-muted">{label}</span>
      </div>
      <div className="figures relative mt-3.5 text-[28px] leading-none font-medium text-fg">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </div>
      {hint ? <div className="relative mt-2 text-xs text-subtle">{hint}</div> : null}
    </Card>
  )
}
