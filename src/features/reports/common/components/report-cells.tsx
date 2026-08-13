import type { ColumnDef } from '@tanstack/react-table'
import { formatAmount } from '@/lib/currency'
import { formatDate } from '@/lib/utils'

/**
 * The handful of cells every report prints, so twelve column sets don't restate
 * them twelve times over.
 *
 * They exist because these reports are read as documents rather than browsed:
 * a figure that is genuinely zero and a figure that has no value must not look
 * alike, and a money column that doesn't line up digit-for-digit can't be
 * scanned down for the total.
 */

/** No value on file — distinct from a real zero, which prints as ₹0. */
export function Dash() {
  return <span className="text-muted-foreground">—</span>
}

/** Free text, dashed when empty. */
export function TextCell({ value }: { value: string | null | undefined }) {
  return value ? <>{value}</> : <Dash />
}

/** A `yyyy-MM-dd` from the API, dashed when the API sent null. */
export function DateCell({ value }: { value: string | null | undefined }) {
  return value ? <>{formatDate(value)}</> : <Dash />
}

/** Rupees. Always printed, including zero — a 0 contribution is a real answer. */
export function MoneyCell({
  value,
  tone,
}: {
  value: number
  tone?: 'default' | 'positive' | 'negative'
}) {
  const className =
    tone === 'positive'
      ? 'font-semibold text-success'
      : tone === 'negative'
        ? 'text-destructive'
        : undefined
  return <span className={className}>{formatAmount(value)}</span>
}

/**
 * A rate. `null` dashes rather than printing 0% — a fixed contribution has no
 * rate at all, and 0% would say the employer contributes nothing where the rupee
 * column beside it says otherwise.
 */
export function PercentCell({ value }: { value: number | null }) {
  return value === null ? <Dash /> : <span className="tabular-nums">{value}%</span>
}

/** A day count — not money, so no currency and no decimals unless it has them. */
export function DaysCell({ value }: { value: number }) {
  return <span className="tabular-nums">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
}

/** A statutory identifier — monospaced so digits align down the column. */
export function CodeCell({ value }: { value: string | null | undefined }) {
  return value ? <span className="font-mono text-sm">{value}</span> : <Dash />
}

/** The person: the name, with the employee code beneath it. */
export function EmployeeCell({ name, code }: { name: string; code: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{name || '—'}</p>
      {code && <p className="truncate font-mono text-xs text-muted-foreground">{code}</p>}
    </div>
  )
}

/**
 * The "Sr No." column. It numbers rows within the WHOLE report, not the page —
 * a register's line 21 is line 21 on page three too, which is how it's quoted.
 */
export function serialColumn<TRow>(offset: number): ColumnDef<TRow> {
  return {
    id: 'serial',
    header: 'Sr No.',
    enableSorting: false,
    meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">{offset + row.index + 1}</span>
    ),
  }
}

/** Right-aligned tabular numerals — every money and count column wears this. */
export const NUMERIC_CELL = 'whitespace-nowrap text-right tabular-nums'
/** Left-aligned but non-wrapping — identifiers, dates, short labels. */
export const PLAIN_CELL = 'whitespace-nowrap'
