import type { UseFormReturn } from 'react-hook-form'
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
import type { LeaveDecisionFormValues } from '../schemas'

/**
 * Approve or reject one pending leave.
 *
 * A decision gets a dialog of its own — unlike an edit, it can't be undone (the
 * API only moves a leave out of `PENDING`, never back) and it carries a remark
 * the employee reads.
 */
export function LeaveDecisionDialog({
  open,
  onOpenChange,
  status,
  form,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: 'APPROVED' | 'REJECTED' | undefined
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
            error={form.formState.errors.remark?.message}
            hint="Shown to the employee alongside the decision."
          >
            <Textarea
              rows={3}
              placeholder={isReject ? 'Reason for rejecting' : 'Optional note'}
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
