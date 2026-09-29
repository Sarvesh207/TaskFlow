import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    // `relative` keeps absolutely-positioned descendants (sr-only labels) inside the
    // scroll box — otherwise they stretch the whole page on narrow screens.
    <div className="scrollbar-thin relative overflow-x-auto">
      <table className={cn('w-full min-w-[640px] border-collapse text-left text-[13px]', className)} {...props} />
    </div>
  )
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-y border-border-soft bg-surface-2/70" {...props} />
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-border-soft" {...props} />
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('h-9 px-4 text-[11.5px] font-medium tracking-wide text-subtle uppercase', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('h-[52px] px-4 align-middle text-fg', className)} {...props} />
}

export function Tr({ className, onClick, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-150 hover:bg-hover',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      {...props}
    />
  )
}
