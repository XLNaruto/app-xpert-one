import { CalendarRange } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatAmount, formatDecimal } from '@/lib/currency'
import {
  bonusPeriodLabel,
  calculationFieldLabel,
  type CalculationField,
} from '../constants'
import type { SavedBonusRow } from '../types'

interface SavedBonusMonthsDialogProps {
  /** The employee whose months are open — `null` closes the dialog. */
  employee: SavedBonusRow | null
  onClose: () => void
}

/**
 * One employee's committed bonus, month by month.
 *
 * The total on the row is the sum of these, and the split is the API's: the amount
 * authorised for the whole range was apportioned across the processed months in
 * proportion to each month's base, in whole paise, so the months add up to exactly
 * what was saved.
 *
 * Each month prints the base it was figured on and the figure that base held **at
 * save time**. That is a snapshot, deliberately — reprocessing the month afterwards
 * doesn't rewrite a committed bonus, so a base here may legitimately disagree with
 * what the register says today. `Wages/Day`, `Present Days` and the designation are
 * the opposite: read live off the salary row the bonus hangs on.
 *
 * A month absent from this list either fell outside the range or was never
 * processed. One that was skipped because it already carried a bonus shows that
 * earlier bonus, not this save's share of it.
 */
export function SavedBonusMonthsDialog({
  employee,
  onClose,
}: SavedBonusMonthsDialogProps) {
  if (!employee) return null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0" onClose={onClose}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarRange className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-semibold leading-tight text-foreground">
              {employee.employeeName || '—'}
              {employee.employeeCode && (
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  {employee.employeeCode}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatAmount(employee.totalBonus)} across {employee.months.length}{' '}
              {employee.months.length === 1 ? 'month' : 'months'}
              {employee.advanceBonus > 0 &&
                ` · ${formatAmount(employee.advanceBonus)} advance bonus already paid in the range`}
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-muted/40 backdrop-blur">
              <tr className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Th className="text-left">Month</Th>
                <Th className="text-left">Designation</Th>
                <Th className="text-left">Base</Th>
                <Th>Base Amount</Th>
                <Th>%</Th>
                <Th>Bonus</Th>
                <Th>Wages/Day</Th>
                <Th>Present Days</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employee.months.map((month) => (
                <tr key={month.bonusId} className="transition-colors hover:bg-accent/30">
                  <Td className="whitespace-nowrap text-left font-medium text-foreground">
                    {bonusPeriodLabel(month.month, month.year)}
                  </Td>
                  <Td className="text-left">
                    {month.designationName || <Dash />}
                  </Td>
                  <Td className="whitespace-nowrap text-left text-muted-foreground">
                    {calculationFieldLabel(month.calculationField as CalculationField)}
                  </Td>
                  <Td>
                    {/* Null where the amount was keyed by hand against no base. */}
                    {month.baseAmount === null ? <Dash /> : formatAmount(month.baseAmount)}
                  </Td>
                  <Td>
                    {month.percentage === null ? (
                      <Dash />
                    ) : (
                      `${formatDecimal(month.percentage)}%`
                    )}
                  </Td>
                  <Td className="font-semibold text-primary">{formatAmount(month.amount)}</Td>
                  <Td>
                    {month.wagesPerDay === null ? <Dash /> : formatAmount(month.wagesPerDay)}
                  </Td>
                  <Td>
                    {month.presentDays === null ? (
                      <Dash />
                    ) : (
                      formatDecimal(month.presentDays)
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/20">
              <tr>
                <Td className="text-left font-semibold text-foreground" colSpan={5}>
                  Total Bonus
                </Td>
                <Td className="font-semibold text-primary">
                  {formatAmount(employee.totalBonus)}
                </Td>
                <Td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          The base amount is what that figure held when the bonus was saved, so
          reprocessing the month afterwards leaves the committed bonus as it is. Wages per
          day, present days and the designation are read live off the salary row.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/** A right-aligned numeric heading by default — the columns are mostly money. */
function Th({
  className = 'text-right',
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return <th className={`px-3 py-2 font-semibold ${className}`}>{children}</th>
}

function Td({
  className = 'text-right',
  colSpan,
  children,
}: {
  className?: string
  colSpan?: number
  children?: React.ReactNode
}) {
  return (
    <td className={`px-3 py-2 tabular-nums ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

function Dash() {
  return <span className="text-muted-foreground">—</span>
}
