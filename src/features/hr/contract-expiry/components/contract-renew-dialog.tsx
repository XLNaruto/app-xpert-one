import { Controller } from 'react-hook-form'
import { CalendarClock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/common/form-field'
import { CONTRACT_PERIOD_TYPE_OPTIONS } from '../constants'
import { formatDay, formatTerm } from '../lib/contract-format'
import { useContractRenewForm } from '../hooks/use-contract-renew-form'
import type { ContractRenewFormValues } from '../schemas'
import type { ContractPeriodType, ExpiringContract } from '../types'

/**
 * "Update Contract" — a new term on the same posting.
 *
 * Two inputs, pre-filled with the row's current term, plus the sentence the
 * screen exists to say: THE NEW TERM STARTS WHERE THE OLD ONE ENDS, not today.
 * A renewal signed in July of a contract ending in August still runs from
 * August, because a term measured from the moment somebody clicked would
 * silently lengthen every renewal by however late the paperwork was.
 *
 * The end date shown here is a PREVIEW. After the call the screen reports
 * `contract_ends_on` off the response — the API keeps the joining date and
 * replaces the period, so its answer is the only one that can be trusted.
 */
export function ContractRenewDialog({
  row,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  /** The row being renewed; `null` closes the dialog. */
  row: ExpiringContract | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ContractRenewFormValues) => void
  isPending: boolean
}) {
  const form = useContractRenewForm(row, onSubmit)
  const {
    register,
    control,
    formState: { errors },
    preview,
    showEffectiveFrom,
  } = form

  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Update contract</DialogTitle>
          <DialogDescription>
            {row ? (
              <>
                {row.employeeName ?? `Employee #${row.employeeId}`} — current term{' '}
                {formatTerm(row.contractPeriod, row.contractPeriodType)}, ending{' '}
                {formatDay(row.contractEndsOn)}.
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
          className="mt-4"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field
              label="Contract Period"
              required
              error={errors.contractPeriod?.message}
            >
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="1"
                {...register('contractPeriod')}
              />
            </Field>

            <Field label="Period Type" required error={errors.contractPeriodType?.message}>
              <Controller
                control={control}
                name="contractPeriodType"
                render={({ field }) => (
                  <Combobox
                    options={CONTRACT_PERIOD_TYPE_OPTIONS}
                    value={field.value}
                    onChange={(value) => field.onChange(value as ContractPeriodType)}
                    searchable={false}
                  />
                )}
              />
            </Field>

            {/*
              Offered only on an EXPIRED row. Everywhere else the default — the
              end of the term in force — is right, and exposing a start date
              would invite the desk to shorten a renewal by dating it today.
            */}
            {showEffectiveFrom ? (
              <Field
                label="New term starts"
                hint="This contract has already lapsed. Leave it on the old end date to renew continuously, or move it to today if the new term really starts now."
                error={errors.effectiveFrom?.message}
                className="sm:col-span-2"
              >
                <Controller
                  control={control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      minDate={row?.joiningDate ? new Date(row.joiningDate) : undefined}
                    />
                  )}
                />
              </Field>
            ) : null}
          </div>

          {preview ? (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="leading-relaxed">
                <p className="font-medium text-foreground">
                  The new term runs from {formatDay(preview.startsOn)} to{' '}
                  {formatDay(preview.endsOn)}.
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  It will come up for review on {formatDay(preview.reviewOn)}, and this
                  row leaves the list until then. The dates are confirmed by the server
                  when you save.
                </p>
              </div>
            </div>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Renewing…' : 'Renew contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
