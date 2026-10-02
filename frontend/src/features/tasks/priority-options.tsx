import { PriorityBars, type SelectMenuOption } from '@/components/ui/SelectMenu'
import { PRIORITY, PRIORITY_LEVELS } from '@/lib/domain'

/** Low / Medium / High with signal bars — the task form's Priority field. */
export const PRIORITY_OPTIONS: SelectMenuOption[] = PRIORITY_LEVELS.map((p, i) => ({
  value: p,
  label: PRIORITY[p].label,
  leading: <PriorityBars level={(i + 1) as 1 | 2 | 3} tone={PRIORITY[p].tone} />,
}))

/** The same, plus "All Priority" — the task lists' filter. */
export const PRIORITY_FILTER_OPTIONS: SelectMenuOption[] = [
  { value: 'all', label: 'All Priority', leading: <PriorityBars level={3} tone="slate" /> },
  ...PRIORITY_OPTIONS,
]
