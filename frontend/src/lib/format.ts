const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
// SQL DATE columns arrive as midnight UTC — format them in UTC so the day never shifts.
const utcDateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const utcShortDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const relativeFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return dateFmt.format(new Date(value))
}

export function formatDueDate(value: string | null | undefined, short = false): string {
  if (!value) return '—'
  return (short ? utcShortDateFmt : utcDateFmt).format(new Date(value))
}

/** `YYYY-MM-DD` for an API date value, suitable for `<input type="date">`. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const diffSec = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return 'just now'
  if (abs < 3600) return relativeFmt.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return relativeFmt.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 30) return relativeFmt.format(Math.round(diffSec / 86400), 'day')
  return formatDate(value)
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}
