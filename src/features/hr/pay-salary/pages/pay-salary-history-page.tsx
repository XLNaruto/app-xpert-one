import { ArrowLeft, Building2, History, Layers, UsersRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatAmount } from '@/lib/currency'
import { payMonthName } from '../constants'
import { usePaymentHistoryList } from '../hooks/use-payment-history-list'
import { PaymentBatchCard } from '../components/payment-batch-card'
import { PaySalarySummary } from '../components/pay-salary-summary'

/**
 * Salary Payment History — how a period was actually paid.
 *
 * The other end of Pay Salary: that screen records a batch, this one reads back
 * every batch recorded. A month is rarely one payment — ten people today, the
 * rest on Friday, a correction the week after — and only this screen shows that
 * shape, which is what a bank reconciliation is done against.
 *
 * Read-only, deliberately. A batch is a record of money that has already left;
 * there is no unpay, and a salary it settled can no longer be revised or
 * discarded either.
 *
 * The period and department arrive from the pay screen in the `?data=` token so
 * the history opens on what was being paid, and are editable here because the
 * question is usually asked about a month other than the current one.
 */
export function PaySalaryHistoryPage({ data }: { data?: string }) {
  const view = usePaymentHistoryList(data)

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

  const periodLabel = `${payMonthName(view.month)} ${view.year}`

  return (
    <div>
      <PageHeader
        title="Salary Payment History"
        description="Every payment batch recorded for the period, newest first — who it paid, when, and against what proof."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={view.goBack}>
            <ArrowLeft className="size-4" />
            Back to Pay Salary
          </Button>
        }
      />

      {/* These read straight through: nothing is selected here and nothing is
          written, so a filter change is a cheap re-read rather than a decision
          a staged batch would be filed under. */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="w-44">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Salary Month
          </label>
          <div className="mt-1.5">
            <MonthPicker
              value={view.monthValue}
              onChange={view.changePeriod}
              minDate={view.monthBounds.minDate}
              maxDate={view.monthBounds.maxDate}
            />
          </div>
        </div>

        <div className="w-lg">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Department
          </label>
          <div className="mt-1.5">
            <Combobox
              value={view.departmentId === null ? '' : String(view.departmentId)}
              onChange={(value) => view.changeDepartment(value ? Number(value) : null)}
              options={view.departmentChoices}
              icon={Building2}
              placeholder={view.departmentsLoading ? 'Loading…' : 'Every department'}
              searchPlaceholder="Search departments…"
              clearable
            />
          </div>
        </div>
      </div>

      {view.companyId === null ? (
        <EmptyState
          title="No company selected"
          description="Select a company for this session to read its payment history."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {getApiErrorMessage(view.error, "Couldn't load the payment history.")}
        </p>
      ) : (
        <>
          {view.totals && (
            <PaySalarySummary
              tiles={[
                {
                  label: 'Payment Batches',
                  value: String(view.totals.paymentBatches),
                  icon: Layers,
                },
                {
                  label: 'Employees Paid',
                  value: String(view.totals.employeesPaid),
                  icon: UsersRound,
                },
                {
                  label: 'Total Amount Paid',
                  value: formatAmount(view.totals.totalAmountPaid),
                  // No rupee icon here — formatAmount already prints the ₹.
                  icon: Wallet,
                  tone: 'success',
                },
              ]}
            />
          )}

          {view.isLoading ? (
            <p className="rounded-xl border border-border px-4 py-16 text-center text-sm text-muted-foreground">
              Loading the payment history…
            </p>
          ) : view.batches.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing paid yet"
              description={`No payment batch has been recorded for ${periodLabel}${
                view.departmentId ? ' in this department' : ''
              }. Record one from Pay Salary.`}
            />
          ) : (
            <>
              <div className="space-y-3">
                {view.batches.map((card) => (
                  <PaymentBatchCard
                    key={card.id}
                    card={card}
                    open={view.openBatchId === card.id}
                    onToggle={() => view.toggleBatch(card.id)}
                  />
                ))}
              </div>

              {view.total > view.limit && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {view.offset + 1}–{view.offset + view.batches.length} of{' '}
                    {view.total} batches
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={view.offset === 0}
                      onClick={() =>
                        view.onPaginationChange({
                          limit: view.limit,
                          offset: Math.max(0, view.offset - view.limit),
                        })
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={view.offset + view.batches.length >= view.total}
                      onClick={() =>
                        view.onPaginationChange({
                          limit: view.limit,
                          offset: view.offset + view.limit,
                        })
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
