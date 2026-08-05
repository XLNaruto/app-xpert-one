import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * The add/edit dialog shell shared by every collection step. One `<form>` per
 * dialog, so Enter submits and the footer button is a real submit — the row is
 * saved by its own POST or PATCH the moment the dialog is confirmed.
 */
export function StepDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  isPending,
  submitLabel,
  /** Widen the panel for a dialog with more than a couple of fields. */
  size = 'default',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
  size?: 'default' | 'wide'
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={size === 'wide' ? 'max-w-3xl' : 'max-w-xl'}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          noValidate
          className="mt-4"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
