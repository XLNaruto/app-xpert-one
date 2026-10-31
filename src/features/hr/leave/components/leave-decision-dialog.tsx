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
import { describeGroupSpan, formatDuration, formatSplit } from '../lib/leave-summary'
import type { LeaveDecisionFormValues } from '../schemas'
import type { LeaveGroup } from '../types'
import { EmployeeCodeBadge } from '@/components/common/employee-code-badge'

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
              ? "The Remark Is What the Employee Reads, So Say Why. This Can't Be Undone — A Rejected Leave Has to Be Removed and Recorded Again."
              : "Only an Approved Leave Marks Its Days as Leave on the Attendance Calendar. This Can't Be Undone."}
          </DialogDescription>
        </DialogHeader>

        {leave && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">
              {leave.leaveType || leave.leaveTypeName || 'Leave'} ·{' '}
              {formatDate(leave.fromDate)}
              {leave.toDate && leave.toDate !== leave.fromDate
                ? ` – ${formatDate(leave.toDate)}`
                : ''}{' '}
              · {formatDuration(leave)}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {leave.employeeName}
              <EmployeeCodeBadge code={leave.employeeCode} className="mx-1.5 align-middle" />
              {!leave.employeeCode && ' '}·{' '}
              {describeGroupSpan(leave)}
            </p>

            {/*
              The split is the thing a desk can't see coming: nobody chose unpaid,
              the type's yearly allowance simply ran out inside the range. Payroll
              will read it that way, so the decision has to state it.
            */}
            {/*
              Nobody is routed this leave — no level reaches the company and the
              owner is out of the chain. The buttons stay: `canDecide` is the only
              thing that drives them, and the owner's override is exactly what this
              state exists to be cleared by.
            */}
            {leave.pendingWithNobody && (
              <p className="mt-2 flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <strong className="font-medium">No approver.</strong> No level of
                  the approval hierarchy reaches this company and the account owner
                  is not in the chain, so this leave is routed to nobody. Deciding it
                  here clears it; repair the chain in Hierarchy Management → Leave so
                  the next one routes.
                </span>
              </p>
            )}

            {leave.split && (
              <p className="mt-2 flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span>
                  This Application Was Split — <strong>{formatSplit(leave)}</strong>.
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
                ? "Required. It's What the Employee Reads, and It's the Only Thing They Have to Act On."
                : 'Shown to the Employee Alongside the Decision.'
            }
          >
            <Textarea
              rows={3}
              placeholder={isReject ? 'Reason for Rejecting' : 'Optional Note'}
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
