import { Controller } from 'react-hook-form'
import { AlertTriangle, CircleCheck, IndianRupee, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/common/form-field'
import { MultiFileDropzone } from '@/components/common/multi-file-dropzone'
import { formatAmount } from '@/lib/currency'
import {
  MAX_PAYMENT_DOCUMENTS,
  MAX_PAYMENTS_PER_BATCH,
  PAYMENT_DOCUMENT_ACCEPT,
  PAYMENT_MODE_OPTIONS,
  payMonthName,
} from '../constants'
import { usePaySalaryForm } from '../hooks/use-pay-salary-form'
import type { PaySalaryRow } from '../types'

interface PaySalaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: number | null
  month: number
  year: number
  /** The department the list was read for — what the batch is filed under. */
  departmentId: number | null
  /** The ticked rows, in the order the list holds them. */
  rows: PaySalaryRow[]
  /** Called once the batch is recorded, however many rows it actually settled. */
  onPaid: () => void
}

/**
 * Confirm & Pay — one payment batch.
 *
 * A batch is the *event*, not the month: the date the money left, the mode it
 * left by, the proof filed against it and the salaries it settles. A period may
 * be paid in as many batches as payroll likes — ten people today, the rest on
 * Friday — which is exactly what the history screen counts.
 *
 * The people are listed rather than counted because the selection spans pages:
 * the ones about to be paid may no longer be the ones on screen behind the
 * dialog, and a bare "12 selected" would be asking for a confirmation nobody
 * can actually check.
 *
 * Documents upload only on submit, each on its own presigned PUT. A dialog
 * cancelled here therefore leaves nothing behind — no batch, and no object the
 * batch referenced.
 */
export function PaySalaryDialog({
  open,
  onOpenChange,
  companyId,
  month,
  year,
  departmentId,
  rows,
  onPaid,
}: PaySalaryDialogProps) {
  const { form, submit, cancel, isPaying, total } = usePaySalaryForm({
    open,
    companyId,
    month,
    year,
    departmentId,
    rows,
    onPaid,
  })

  const close = () => {
    if (isPaying) return
    cancel()
    onOpenChange(false)
  }

  /* The endpoint takes at most 500 rows in one batch — said here, before the
     request, rather than coming back as a 400 on a dialog full of work. */
  const tooMany = rows.length > MAX_PAYMENTS_PER_BATCH
  const errors = form.formState.errors

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl p-0" onClose={close}>
        <form onSubmit={submit}>
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
                Pay Salary
              </h2>
              <p className="text-xs text-muted-foreground">
                Mark {rows.length} {rows.length === 1 ? 'employee' : 'employees'} as paid
                for {payMonthName(month)} {year}
              </p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            {/* Who this batch settles. Capped in height rather than in count —
                every name stays reachable, which a truncated list wouldn't. */}
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {rows.map((row) => (
                <div
                  key={row.salaryId}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <UserRound className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {row.employeeName || '—'}
                    {row.employeeCode && (
                      <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                        {row.employeeCode}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {formatAmount(row.netPay)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CircleCheck className="size-4" />
                Total Payable
              </span>
              <span className="font-heading text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatAmount(total)}
              </span>
            </div>

            {tooMany && (
              <p className="inline-flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                One batch settles at most {MAX_PAYMENTS_PER_BATCH} employees. Untick some
                and record the rest as a second batch.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <Field
                    label="Payment Date"
                    required
                    hint="The day the money LEFT, not the day it is being recorded — a NEFT sent on Friday and entered on Monday is filed as Friday's."
                    error={errors.paymentDate?.message}
                  >
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      maxDate={new Date()}
                      disabled={isPaying}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <Field
                    label="Payment Mode"
                    required
                    error={errors.paymentMode?.message}
                  >
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      options={PAYMENT_MODE_OPTIONS}
                      placeholder="Select a mode"
                    />
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="documents"
              render={({ field }) => (
                <Field
                  label="Payment Documents"
                  hint="The proof this batch went out — a bank advice, a cheque scan, a UPI receipt. PDF or image, up to ten."
                  error={errors.documents?.message}
                >
                  <MultiFileDropzone
                    value={field.value}
                    onChange={field.onChange}
                    accept={PAYMENT_DOCUMENT_ACCEPT}
                    maxFiles={MAX_PAYMENT_DOCUMENTS}
                    label="Add payment documents"
                    hint={`PDF, JPG, PNG or WebP — ${
                      MAX_PAYMENT_DOCUMENTS - field.value.length
                    } of ${MAX_PAYMENT_DOCUMENTS} remaining`}
                  />
                </Field>
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={close} disabled={isPaying}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPaying || tooMany || rows.length === 0}>
              <IndianRupee className="size-4" />
              {isPaying ? 'Recording…' : 'Confirm & Pay'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
