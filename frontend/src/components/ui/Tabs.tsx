import { motion } from 'motion/react'
import { useId } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/cn'

const tabBase =
  'relative inline-flex h-10 items-center gap-2 px-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:text-fg'
const tabInactive = 'text-muted hover:text-fg'
const tabActive = 'text-fg'

/**
 * The bar scrolls sideways on narrow screens, but never shows a scrollbar.
 * The bottom rule is an inset shadow and the indicator sits inside the bar:
 * anything poking out below would make the bar scroll vertically too.
 */
const tabBar =
  'scrollbar-none flex gap-6 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-border)]'

const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 } as const

/** The underline glides between tabs rather than jumping. */
function Indicator({ groupId }: { groupId: string }) {
  return (
    <motion.span
      layoutId={`tab-indicator-${groupId}`}
      transition={SPRING}
      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
      aria-hidden
    />
  )
}

/** Route-driven tabs (project detail, user profile). */
export function LinkTabs({ tabs }: { tabs: { to: string; label: string; end?: boolean }[] }) {
  const groupId = useId()
  return (
    <nav className={tabBar} aria-label="Sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => cn(tabBase, isActive ? tabActive : tabInactive)}
        >
          {({ isActive }) => (
            <>
              {tab.label}
              {isActive ? <Indicator groupId={groupId} /> : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** State-driven filter tabs with counts (All 12 · To Do 5 · …). */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; count?: number }[]
}) {
  const groupId = useId()
  return (
    <div className={tabBar} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(tabBase, active ? tabActive : tabInactive)}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <span
                className={cn(
                  'figures rounded-full px-1.5 py-px text-[11px] transition-colors duration-200',
                  active ? 'bg-primary-soft text-primary-soft-fg' : 'bg-hover-strong text-muted',
                )}
              >
                {opt.count}
              </span>
            ) : null}
            {active ? <Indicator groupId={groupId} /> : null}
          </button>
        )
      })}
    </div>
  )
}
