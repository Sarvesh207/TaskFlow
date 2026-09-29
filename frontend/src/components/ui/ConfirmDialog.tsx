import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Input } from './form'
import { Modal, ModalActions } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  /** When set, the user must type this exact text to enable the confirm button. */
  confirmText?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  confirmText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const blocked = confirmText !== undefined && typed !== confirmText

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('')
        onOpenChange(next)
      }}
      title={title}
      description={description}
    >
      {confirmText !== undefined ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-text" className="text-sm text-muted">
            Type <span className="font-semibold text-fg">{confirmText}</span> to confirm
          </label>
          <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
      ) : null}
      <ModalActions>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} disabled={blocked}>
          {confirmLabel}
        </Button>
      </ModalActions>
    </Modal>
  )
}
