import type { UseFormReturn } from 'react-hook-form'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/common/form-field'
import { formatDate } from '@/lib/utils'
import { describeGroupSpan, formatSplit } from '../lib/leave-summary'
import type { LeaveDecisionFormValues } from '../schemas'
import type { LeaveGroup } from '../types'

/**
 * Approve or reject one pending leave APPLICATION.
 *
 * A decision gets a dialog of its own — unlike an edit, it can't be undone (the
 * API only moves a leave out of `PENDING`, never back) and it carries a remark
 * the employee reads.
 *
 * The remark is REQUIRED on a rejection and optional on an approval: a rejection
 * with no reason leaves the employee nothing to act on, and the API answers a
 * blank one with a 400.
 *
 * **A decision covers the whole application.** When the range outran the leave
 * type's paid allowance it is stored as two rows — a paid one and an unpaid one —
 * and both move together on one call, with one notification to the employee. The
 * dialog spells that out, because approving "5 days" of which 3 are unpaid is a
 * different decision from approving 5 paid ones.
 */
export function LeaveDecisionDialog({
  open,
  onOpenChange,
  status,
  leave,
  form,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: 'APPROVED' | 'REJECTED' | undefined
  /** The application being decided — undefined while the dialog is closed. */
  leave: LeaveGroup | undefined
  form: UseFormReturn<LeaveDecisionFormValues>
  onSubmit: () => void
  isPending: boolean
}) {
  const isReject = status === 'REJECTED'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isReject ? 'Reject Leave' : 'Approve Leave'}</DialogTitle>
          <DialogDescription>
            {isReject
              ? "The remark is what the employee reads, so say why. This can't be undone — a rejected leave has to be removed and recorded again."
              : "Only an approved leave marks its days as leave on the attendance calendar. This can't be undone."}
          </DialogDescription>
        </DialogHeader>

        {leave && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">
              {leave.leaveType || leave.leaveTypeName || 'Leave'} ·{' '}
              {formatDate(leave.fromDate)}
              {leave.toDate && leave.toDate !== leave.fromDate
                ? ` – ${formatDate(leave.toDate)}`
                : ''}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {leave.employeeName}
              {leave.employeeCode ? ` · #${leave.employeeCode}` : ''} ·{' '}
              {describeGroupSpan(leave)}
            </p>

            {/*
              The split is the thing a desk can't see coming: nobody chose unpaid,
              the type's yearly allowance simply ran out inside the range. Payroll
              will read it that way, so the decision has to state it.
            */}
            {leave.split && (
              <p className="mt-2 flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span>
                  This application was split — <strong>{formatSplit(leave)}</strong>.
                  Deciding it moves both halves together and sends the employee one
                  notification for the whole range.
                </span>
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          noValidate
          className="mt-4"
        >
          <Field
            label="Remark"
            required={isReject}
            error={form.formState.errors.remark?.message}
            hint={
              isReject
                ? "Required. It's what the employee reads, and it's the only thing they have to act on."
                : 'Shown to the employee alongside the decision.'
            }
          >
            <Textarea
              rows={3}
              placeholder={isReject ? 'Reason for rejecting' : 'Optional note'}
              aria-invalid={form.formState.errors.remark ? true : undefined}
              {...form.register('remark')}
            />
          </Field>

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
              {isPending ? 'Saving…' : isReject ? 'Reject' : 'Approve'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
