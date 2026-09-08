import { Controller } from 'react-hook-form'
import { UserMinus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/common/form-field'
import { formatDay } from '../lib/contract-format'
import { useContractCompleteForm } from '../hooks/use-contract-complete-form'
import type { ContractCompleteFormValues } from '../schemas'
import type { ExpiringContract } from '../types'

/**
 * "Not renewed" — let the term end and close the service.
 *
 * The confirmation says outright what happens, because this is the same write as
 * Leave Service on step 8: the posting is closed with a leaving date and a
 * reason, the employee reads as left, and every history row stays. Nothing else
 * is flipped — the employee record is not deactivated, since "currently working"
 * is the absence of a leaving date rather than a status column.
 */
export function ContractCompleteDialog({
  row,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  /** The row being closed; `null` closes the dialog. */
  row: ExpiringContract | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ContractCompleteFormValues) => void
  isPending: boolean
}) {
  const form = useContractCompleteForm(row, onSubmit)
  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete service?</DialogTitle>
          <DialogDescription>
            {row ? (
              <>
                {row.employeeName ?? `Employee #${row.employeeId}`}&apos;s posting will
                be closed on the date below and they will read as having left. Their
                service history is kept in full, and nothing else about their record
                changes.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void form.onSubmit()
          }}
          noValidate
          className="mt-4 space-y-4"
        >
          <Field
            label="Leaving date"
            hint="Defaults to the end of the contract. The API refuses a date earlier than the joining date."
            error={errors.leavingDate?.message}
          >
            <Controller
              control={control}
              name="leavingDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  minDate={row?.joiningDate ? new Date(row.joiningDate) : undefined}
                />
              )}
            />
          </Field>

          <Field label="Reason" error={errors.leavingReason?.message}>
            <Textarea
              rows={2}
              maxLength={500}
              placeholder="Contract completed — not renewed"
              {...register('leavingReason')}
            />
          </Field>

          {row?.contractEndsOn ? (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <UserMinus className="mt-0.5 size-3.5 shrink-0" />
              The contract term ends {formatDay(row.contractEndsOn)}. Leaving the date as
              it is closes the posting on that day.
            </p>
          ) : null}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Completing…' : 'Complete service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
