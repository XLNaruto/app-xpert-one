import type { UseFormReturn } from 'react-hook-form'
import { CircleCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  MAX_EMPLOYEE_TICKET_RESOLUTION,
  type EmployeeTicketResolveFormValues,
} from '../schemas'

interface EmployeeTicketResolveDialogProps {
  code: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  form: UseFormReturn<EmployeeTicketResolveFormValues>
  error?: string
  onConfirm: () => void
  loading: boolean
}

/**
 * Answer the ticket.
 *
 * The note is required by the API for this transition alone, and it isn't
 * paperwork: it's PUSHED to the employee's device and is what they accept or
 * reopen against. The row also records who resolved it — a resolution nobody can
 * attribute is one nobody can be asked about.
 */
export function EmployeeTicketResolveDialog({
  code,
  open,
  onOpenChange,
  form,
  error,
  onConfirm,
  loading,
}: EmployeeTicketResolveDialogProps) {
  const note = form.watch('resolutionNote')

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={CircleCheck}
      title="Resolve this ticket?"
      description={
        code
          ? `${code} is marked answered and the note below is pushed to the employee's device. They then either accept it or reopen the ticket.`
          : undefined
      }
      confirmLabel="Resolve"
      cancelLabel="Cancel"
      loading={loading}
      confirmDisabled={!note?.trim()}
      keepOpenOnConfirm
      onConfirm={onConfirm}
    >
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="resolution-note"
          className="text-sm font-medium text-foreground/90"
        >
          What was done?
          <span className="ml-0.5 text-destructive">*</span>
        </label>
        <Textarea
          id="resolution-note"
          rows={4}
          maxLength={MAX_EMPLOYEE_TICKET_RESOLUTION}
          placeholder="Explain what you did, in words the employee will understand."
          {...form.register('resolutionNote')}
        />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            To let an unanswered query go, resolve it with a note saying so —
            there is no way to close one that was never answered.
          </p>
        )}
      </div>
    </ConfirmDialog>
  )
}
