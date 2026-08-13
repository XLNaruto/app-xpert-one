import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatAmount } from '@/lib/currency'
import { usePaySalary } from '../api/use-pay-salary-mutations'
import { payBatchFormSchema, type PayBatchFormValues } from '../schemas'
import type { PaySalaryRow } from '../types'

interface UsePaySalaryFormOptions {
  /** Reset the form each time the dialog reopens on a fresh selection. */
  open: boolean
  companyId: number | null
  month: number
  year: number
  /** The department the list was read for — what the batch is filed under. */
  departmentId: number | null
  /** The rows the batch will settle, in the order the dialog lists them. */
  rows: PaySalaryRow[]
  /** Called once the batch is recorded, however many rows it actually settled. */
  onPaid: () => void
}

/** Opening values: today, by cash. A batch is usually entered the day it goes out. */
function emptyForm(): PayBatchFormValues {
  return {
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: 'Cash',
    documents: [],
  }
}

/**
 * The Confirm & Pay form: *how* the money left. What it settles is the list's
 * selection, passed in — the dialog never decides who gets paid.
 *
 * The date defaults to today but is deliberately editable and looks backward:
 * `payment_date` is the day the money LEFT, not the day this was recorded, so a
 * NEFT sent on Friday and entered on Monday must be filed as Friday's.
 *
 * A 201 is **not** "everything selected was paid". Rows failing one of the
 * endpoint's checks come back in `skipped` while the rest of the batch lands, so
 * both halves are reported: what settled, and what didn't and why.
 */
export function usePaySalaryForm({
  open,
  companyId,
  month,
  year,
  departmentId,
  rows,
  onPaid,
}: UsePaySalaryFormOptions) {
  const pay = usePaySalary()

  const form = useForm<PayBatchFormValues>({
    resolver: zodResolver(payBatchFormSchema),
    defaultValues: emptyForm(),
    mode: 'onChange',
  })

  const { reset } = form

  // A dialog reopened on a different selection opens clean — a date left over
  // from the last batch is exactly the kind of thing nobody re-reads.
  useEffect(() => {
    if (open) reset(emptyForm())
  }, [open, reset])

  const submit = form.handleSubmit((values) => {
    if (companyId === null || rows.length === 0) return

    pay.mutate(
      {
        companyId,
        departmentId,
        month,
        year,
        paymentDate: values.paymentDate,
        paymentMode: values.paymentMode,
        /* Only freshly-picked files have a `File` — nothing here was ever
           already-stored, but the dropzone's shape allows for it. */
        documents: values.documents
          .map((item) => item.file)
          .filter((file): file is File => Boolean(file)),
        payments: rows.map((row) => ({
          salaryId: row.salaryId,
          employeeId: row.employeeId,
        })),
      },
      {
        onSuccess: (result) => {
          const count = result.paid.length
          if (count > 0) {
            toast.success(
              `${count} ${count === 1 ? 'salary' : 'salaries'} paid — ${formatAmount(
                result.batch.totalAmount,
              )} recorded by ${result.batch.paymentMode}.`,
            )
          }
          /* A partly-refused batch is still a success, so the refusals have to
             be reported here or they go unsaid. */
          if (result.skipped.length > 0) {
            toast.warning(
              `${result.skipped.length} not paid — ${
                result.skipped[0].reason || 'no longer outstanding'
              }.`,
            )
          }
          onPaid()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't record the payment.")),
      },
    )
  })

  const cancel = useCallback(() => reset(emptyForm()), [reset])

  return {
    form,
    submit,
    cancel,
    isPaying: pay.isPending,
    /** The batch's total — the sum of what the selected rows are owed. */
    total: rows.reduce((sum, row) => sum + row.netPay, 0),
  }
}
