import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  from: number
  to: number
  total: number
}

function pageWindow(page: number, pageCount: number): number[] {
  const size = Math.min(5, pageCount)
  const start = Math.min(Math.max(1, page - 2), pageCount - size + 1)
  return Array.from({ length: size }, (_, i) => start + i)
}

export function Pagination({ page, pageCount, onPageChange, from, to, total }: PaginationProps) {
  const btn =
    'inline-flex size-8 items-center justify-center rounded-md border border-border text-xs font-medium transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-muted">
        Showing {from}–{to} of {total}
      </p>
      {pageCount > 1 ? (
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          <button
            type="button"
            className={cn(btn, 'text-muted hover:bg-surface-2')}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>
          {pageWindow(page, pageCount).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                btn,
                p === page ? 'border-primary bg-primary text-white' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={cn(btn, 'text-muted hover:bg-surface-2')}
            onClick={() => onPageChange(page + 1)}
            disabled={page === pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      ) : null}
    </div>
  )
}
