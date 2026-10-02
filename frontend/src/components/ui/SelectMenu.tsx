import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/domain'

export interface SelectMenuOption {
  /** '' is allowed (e.g. "Unassigned"). */
  value: string
  label: string
  /** Shown before the label, in the list and in the closed field (a dot, an avatar…). */
  leading?: ReactNode
  /** Secondary text on the right of the option, list only. */
  hint?: ReactNode
}

interface SelectMenuProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectMenuOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  // Passed in by <Field> so the label, error state and message stay wired up.
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

// Radix reserves '' for "no selection", so an empty option value travels under this name.
const EMPTY = '__empty__'
const toRadix = (value: string) => (value === '' ? EMPTY : value)
const fromRadix = (value: string) => (value === EMPTY ? '' : value)

/**
 * A styled single-select for forms: the same raised panel as the app's other
 * menus, with icons/avatars per option. Keyboard and screen-reader behaviour
 * come from Radix Select. Use with react-hook-form through `Controller`.
 */
export function SelectMenu({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
  ...aria
}: SelectMenuProps) {
  const selected = options.find((o) => o.value === value)

  return (
    <RadixSelect.Root value={toRadix(value)} onValueChange={(v) => onValueChange(fromRadix(v))} disabled={disabled}>
      <RadixSelect.Trigger
        {...aria}
        className={cn(
          'group flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-input pr-2.5 pl-3 text-left text-[13.5px] text-fg',
          'transition-[border-color,box-shadow] duration-200 ease-out-expo',
          'hover:border-border-strong',
          'focus:border-primary/70 focus:ring-4 focus:ring-primary/15 focus:outline-none',
          'data-[state=open]:border-primary/70 data-[state=open]:ring-4 data-[state=open]:ring-primary/15',
          'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border',
          'aria-[invalid=true]:border-red-500/60 aria-[invalid=true]:focus:ring-red-500/15',
          className,
        )}
      >
        {selected?.leading ? <span className="flex shrink-0 items-center">{selected.leading}</span> : null}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-subtle')}>
          <RadixSelect.Value placeholder={placeholder}>{selected?.label}</RadixSelect.Value>
        </span>
        <RadixSelect.Icon asChild>
          <ChevronDown
            className="size-4 shrink-0 text-subtle transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            // At least as wide as the field, wider when names and hints need it.
            'elevated z-[60] max-h-(--radix-select-content-available-height) w-max min-w-(--radix-select-trigger-width) max-w-80',
            'overflow-hidden rounded-xl border border-border bg-surface',
            'origin-(--radix-select-content-transform-origin)',
            'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          )}
        >
          <RadixSelect.Viewport className="scrollbar-thin max-h-72 overflow-y-auto p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={toRadix(option.value)}
                className={cn(
                  'relative flex cursor-pointer items-center gap-2.5 rounded-lg py-2 pr-8 pl-2.5 text-[13px] text-fg outline-none select-none',
                  'transition-colors duration-150',
                  'data-[highlighted]:bg-hover-strong data-[state=checked]:font-medium',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                {option.leading ? <span className="flex shrink-0 items-center">{option.leading}</span> : null}
                <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </span>
                {option.hint ? <span className="shrink-0 pl-3 text-xs text-subtle">{option.hint}</span> : null}
                <RadixSelect.ItemIndicator className="absolute right-2.5 flex items-center text-primary">
                  <Check className="size-4" aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

/**
 * <SelectMenu> bound to a react-hook-form field. Put it directly inside
 * <Field>: Field hands its id/aria props to its child, and this passes them
 * on to the trigger (a bare <Controller> child would swallow them).
 */
export function FormSelectMenu<T extends FieldValues>({
  control,
  name,
  ...props
}: Omit<SelectMenuProps, 'value' | 'onValueChange'> & { control: Control<T>; name: FieldPath<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <SelectMenu {...props} value={field.value} onValueChange={field.onChange} />}
    />
  )
}

const DOT_TONES: Record<Tone, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
}

/** Status colour, matching the badges used in tables. */
export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={cn('size-2 rounded-full', DOT_TONES[tone])} aria-hidden />
}

/** Signal-strength bars for priority: 1, 2 or 3 bars lit in the priority's colour. */
export function PriorityBars({ level, tone }: { level: 1 | 2 | 3; tone: Tone }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn('w-[3px] rounded-full', bar <= level ? DOT_TONES[tone] : 'bg-border-strong')}
          style={{ height: `${bar * 4}px` }}
        />
      ))}
    </span>
  )
}
