import * as Menu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { menuContentClass, menuItemClass, menuItemTone } from './menu-styles'

export interface RowMenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  hidden?: boolean
}

export function RowMenu({
  items,
  label = 'Actions',
  trigger,
}: {
  items: RowMenuItem[]
  label?: string
  trigger?: ReactNode
}) {
  const visible = items.filter((item) => !item.hidden)
  if (visible.length === 0) return null

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg text-subtle transition-colors duration-150',
              'hover:bg-hover-strong hover:text-fg data-[state=open]:bg-hover-strong data-[state=open]:text-fg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} onClick={(e) => e.stopPropagation()} className={menuContentClass}>
          {visible.map((item) => (
            <Menu.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(menuItemClass, item.danger ? menuItemTone.danger : menuItemTone.default)}
            >
              {item.icon}
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
