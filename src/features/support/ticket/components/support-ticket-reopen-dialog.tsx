import { RotateCcw } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Textarea } from '@/components/ui/textarea'
import { MAX_SUPPORT_REOPEN_REASON } from '../schemas'
import type { SupportTicket } from '../types'

interface SupportTicketReopenDialogProps {
  ticket: SupportTicket | null
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: string
  onReasonChange: (value: string) => void
  onConfirm: () => void
  loading: boolean
}

/**
 * Hand a finished ticket back to the desk.
 *
 * The reason is required and is not a formality: the resolution is CLEARED when
 * a ticket reopens, so this text is the only thing telling the next admin what
 * is still wrong. The deadline is deliberately called out as unchanged —
 * reopening does not re-buy the clock the original severity paid for.
 */
export function SupportTicketReopenDialog({
  ticket,
  open,
  onOpenChange,
  reason,
  onReasonChange,
  onConfirm,
  loading,
}: SupportTicketReopenDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={RotateCcw}
      title="Reopen this ticket?"
      description={
        ticket
          ? `${ticket.code} goes back to the desk. The existing resolution is cleared, and the original deadline stays exactly where it was — reopening does not re-buy the clock.`
          : undefined
      }
      confirmLabel="Reopen"
      cancelLabel="Cancel"
      loading={loading}
      confirmDisabled={!reason.trim()}
      keepOpenOnConfirm
      onConfirm={onConfirm}
    >
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="reopen-reason"
          className="text-sm font-medium text-foreground/90"
        >
          What is still wrong?
          <span className="ml-0.5 text-destructive">*</span>
        </label>
        <Textarea
          id="reopen-reason"
          rows={4}
          maxLength={MAX_SUPPORT_REOPEN_REASON}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Describe what the resolution missed, or what came back."
        />
        <p className="text-xs text-muted-foreground">
          This is appended to the ticket as a fresh description.
        </p>
      </div>
    </ConfirmDialog>
  )
}
