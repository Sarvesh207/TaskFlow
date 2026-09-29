import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] dark:bg-black/60 data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'elevated rounded-2xl border border-border bg-surface p-6 focus:outline-none',
            'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
            className,
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="mb-5 pr-8">
            <Dialog.Title className="text-[17px] font-semibold tracking-tight text-fg">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-muted">{description}</Dialog.Description>
            ) : null}
          </div>
          {children}
          <Dialog.Close
            className="absolute top-5 right-5 rounded-lg p-1.5 text-subtle transition-colors duration-150 hover:bg-hover-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Close"
          >
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 grid grid-cols-2 gap-3">{children}</div>
}
