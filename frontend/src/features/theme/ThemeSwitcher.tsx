import { Monitor, Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { useId, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { useTheme, type ThemePreference } from './theme'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Segmented Light / Dark / System control — a proper radio group (arrow keys move the choice). */
export function ThemeSwitcher() {
  const { preference, setTheme } = useTheme()
  const groupId = useId()

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = OPTIONS.findIndex((o) => o.value === preference)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = OPTIONS[(index + step + OPTIONS.length) % OPTIONS.length]!
    setTheme(next.value)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      onKeyDown={onKeyDown}
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-2 p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            data-value={value}
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(value)}
            className={cn(
              'relative flex h-8 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`theme-thumb-${groupId}`}
                transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                className="absolute inset-0 rounded-md border border-border bg-surface shadow-[0_1px_2px_var(--shadow-color)]"
                aria-hidden
              />
            ) : null}
            <Icon className="relative size-3.5" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
