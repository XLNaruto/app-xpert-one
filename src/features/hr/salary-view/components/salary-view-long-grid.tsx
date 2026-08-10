import { useMemo, type ReactNode } from 'react'
import { CellTooltip } from '@/components/common/wage-grid-fields'
import { formatAmount, formatDecimal } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { SalaryViewEmployeeCell } from './salary-view-employee-cell'
import type { SalaryViewRow } from '../types'

/**
 * The long view — the same processed month opened out into its matrix.
 *
 * The columns are the report's `allowance_heads` / `deduction_heads`: the union
 * of head names across the whole result, in catalog order. That union is what
 * makes this a matrix rather than a list of rows with their own shapes — a row
 * carrying no line for a head reads as zero, in a column that stays where it is.
 * Pivoting on each row's own components would shift the headings per row.
 *
 * The five statutory deductions get columns of their own, beside the catalog
 * heads rather than among them, because they are stored on the salary itself and
 * not as pay components — the same split the Calculate Salary grid draws.
 *
 * Laid out by hand rather than through `<DataTable>` for the one thing a generic
 * table can't do: a two-level header where ALLOWANCES and DEDUCTIONS span their
 * heads. It follows the register grid's mechanics — fixed layout off an explicit
 * `<colgroup>` so nothing is measured, a pinned employee column, and no
 * `backdrop-blur` on the sticky header, which would re-filter everything
 * scrolling beneath it every frame.
 */

/** The pinned employee column's width — also its offset for everything after. */
const EMPLOYEE_WIDTH = 232

type Align = 'left' | 'right' | 'center'

/**
 * The bands the columns fall into, left to right. They drive the spanning
 * ALLOWANCES / DEDUCTIONS headings — which is how a matrix this wide says where
 * the allowances stop and the deductions start. The gridlines themselves are
 * uniform (see `GRID_RULE`); the heading above a band is what marks it, not a
 * heavier rule at its edge.
 */
type Section =
  | 'attendance'
  | 'allowance'
  | 'overtime'
  | 'gross'
  | 'deduction'
  | 'net'

interface LongColumn {
  key: string
  label: string
  width: number
  section: Section
  align: Align
  /** Emphasis for the columns a reader lands on — earned, gross, net. */
  accent?: 'gross' | 'net' | 'total-allowance' | 'total-deduction'
  value: (row: SalaryViewRow) => number
  /** How the cell prints — amounts as currency, days as plain counts. */
  kind: 'amount' | 'count'
}

const ALIGN: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function SalaryViewLongGrid({
  rows,
  allowanceHeads,
  deductionHeads,
  onRowClick,
  maxHeight = '32rem',
}: {
  rows: SalaryViewRow[]
  allowanceHeads: string[]
  deductionHeads: string[]
  onRowClick?: (row: SalaryViewRow) => void
  maxHeight?: string
}) {
  /* Overtime earns its columns only when the month actually has some — three
     empty columns in the middle of a wide grid cost more than they say. */
  const hasOvertime = useMemo(
    () => rows.some((row) => row.otHours > 0 || row.otAmount > 0),
    [rows],
  )

  const columns = useMemo<LongColumn[]>(() => {
    const attendance: LongColumn[] = [
      { key: 'workingDays', label: 'W. Days', width: 84, section: 'attendance', align: 'center', kind: 'count', value: (r) => r.workingDays },
      { key: 'presentDays', label: 'Present', width: 84, section: 'attendance', align: 'center', kind: 'count', value: (r) => r.presentDays },
      { key: 'lwp', label: 'LWP', width: 72, section: 'attendance', align: 'center', kind: 'count', value: (r) => r.lwpDays },
      { key: 'basic', label: 'Basic', width: 116, section: 'attendance', align: 'right', kind: 'amount', value: (r) => r.basicPay },
      { key: 'earned', label: 'Earned', width: 124, section: 'attendance', align: 'right', kind: 'amount', value: (r) => r.earnedBasic },
    ]

    const allowances: LongColumn[] = [
      ...allowanceHeads.map<LongColumn>((head) => ({
        key: `allowance:${head}`,
        label: head,
        width: 116,
        section: 'allowance',
        align: 'right',
        kind: 'amount',
        value: (row) => row.allowanceByHead[head] ?? 0,
      })),
      {
        key: 'allowanceTotal',
        label: 'Total',
        width: 124,
        section: 'allowance',
        align: 'right',
        kind: 'amount',
        accent: 'total-allowance',
        value: (r) => r.totalAllowance,
      },
    ]

    const overtime: LongColumn[] = hasOvertime
      ? [
          { key: 'otHours', label: 'OT Hrs', width: 84, section: 'overtime', align: 'center', kind: 'count', value: (r) => r.otHours },
          { key: 'otAmount', label: 'OT Wage', width: 116, section: 'overtime', align: 'right', kind: 'amount', value: (r) => r.otAmount },
        ]
      : []

    const gross: LongColumn[] = [
      { key: 'gross', label: 'Gross Pay', width: 132, section: 'gross', align: 'right', kind: 'amount', accent: 'gross', value: (r) => r.grossPay },
    ]

    const deductions: LongColumn[] = [
      ...deductionHeads.map<LongColumn>((head) => ({
        key: `deduction:${head}`,
        label: head,
        width: 116,
        section: 'deduction',
        align: 'right',
        kind: 'amount',
        value: (row) => row.deductionByHead[head] ?? 0,
      })),
      /* Stored on the salary rather than as pay components — see the note above. */
      { key: 'pf', label: 'PF', width: 104, section: 'deduction', align: 'right', kind: 'amount', value: (r) => r.employeePf },
      { key: 'esic', label: 'ESIC', width: 104, section: 'deduction', align: 'right', kind: 'amount', value: (r) => r.employeeEsic },
      { key: 'pt', label: 'PT', width: 96, section: 'deduction', align: 'right', kind: 'amount', value: (r) => r.employeePt },
      { key: 'lwf', label: 'LWF', width: 96, section: 'deduction', align: 'right', kind: 'amount', value: (r) => r.employeeLwf },
      { key: 'tds', label: 'TDS', width: 104, section: 'deduction', align: 'right', kind: 'amount', value: (r) => r.employeeTds },
      {
        key: 'deductionTotal',
        label: 'Total',
        width: 124,
        section: 'deduction',
        align: 'right',
        kind: 'amount',
        accent: 'total-deduction',
        value: (r) => r.totalDeduction,
      },
    ]

    const net: LongColumn[] = [
      { key: 'net', label: 'Net Pay', width: 132, section: 'net', align: 'right', kind: 'amount', accent: 'net', value: (r) => r.netPay },
    ]

    return [...attendance, ...allowances, ...overtime, ...gross, ...deductions, ...net]
  }, [allowanceHeads, deductionHeads, hasOvertime])

  /**
   * The header's first row: one cell per section. Sections without a heading —
   * the attendance columns, gross, net — get a blank cell of the right span, so
   * the two header rows stay aligned without a rowspan on every column, and each
   * boundary lands in the same place on both.
   */
  const spans = useMemo(() => {
    const out: { key: string; section: Section; span: number }[] = []
    for (const column of columns) {
      const last = out[out.length - 1]
      if (last && last.section === column.section) last.span += 1
      else out.push({ key: column.key, section: column.section, span: 1 })
    }
    return out
  }, [columns])

  /** The page's own column sums — the report's `totals` counts the same rows. */
  const totals = useMemo(() => {
    const sums: Record<string, number> = {}
    for (const column of columns) {
      sums[column.key] = rows.reduce((sum, row) => sum + column.value(row), 0)
    }
    return sums
  }, [columns, rows])

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col style={{ width: EMPLOYEE_WIDTH }} />
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-30">
          {/* ── Band row ── */}
          <tr>
            <th
              rowSpan={2}
              /* Pinned in both directions — it holds the row's identity while
                 the grid scrolls under it either way. */
              className={cn(HEAD_BASE, 'left-0 top-0 z-40 text-left')}
            >
              Employee
            </th>
            {spans.map((span) => (
              <th
                key={`group-${span.key}`}
                colSpan={span.span}
                className={cn(
                  HEAD_BASE,
                  'top-0 text-center',
                  span.section === 'allowance' && 'text-success',
                  span.section === 'deduction' && 'text-destructive',
                  span.section === 'overtime' && 'text-primary',
                )}
              >
                {GROUP_LABEL[span.section] ?? ''}
              </th>
            ))}
          </tr>

          {/* ── Column row ── */}
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  HEAD_BASE,
                  /* Exactly one header row down — see `HEAD_ROW_HEIGHT`. */
                  'top-8.25',
                  ALIGN[column.align],
                  ACCENT[column.accent ?? 'none'],
                )}
              >
                {/* The app's tooltip, not the browser's `title` — a head name is
                    routinely wider than its column, and the native one styles
                    itself and waits a second before appearing. */}
                <CellTooltip label={column.label}>
                  <span className="block cursor-help truncate">{column.label}</span>
                </CellTooltip>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={row.salaryId}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              /* `wage-row-saved` carries the hover tint through to the pinned
                 cell, which paints its own opaque background. */
              className={cn('wage-row-saved', onRowClick && 'cursor-pointer')}
            >
              <td className={cn(CELL_BASE, 'wage-sticky sticky left-0 z-10')}>
                {/* The matrix has no code column — this cell is the whole person. */}
                <SalaryViewEmployeeCell row={row} showCode />
              </td>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    CELL_BASE,
                    ALIGN[column.align],
                    'tabular-nums',
                    ACCENT[column.accent ?? 'none'],
                    /* A short month is the thing to notice on this grid. */
                    column.key === 'lwp' && row.lwpDays > 0 && 'font-semibold text-destructive',
                    column.key === 'presentDays' && 'font-medium text-success',
                  )}
                >
                  <Cell kind={column.kind} value={column.value(row)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {rows.length > 0 && (
          <tfoot className="sticky bottom-0 z-20">
            <tr className="wage-total-row">
              <td className={cn(FOOT_BASE, 'wage-sticky sticky left-0 z-30 text-left')}>
                Total
              </td>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    FOOT_BASE,
                    ALIGN[column.align],
                    'tabular-nums',
                    ACCENT[column.accent ?? 'none'],
                  )}
                >
                  {/* Day counts don't sum to anything meaningful across people. */}
                  {column.kind === 'amount' ? (
                    <Cell kind="amount" value={totals[column.key]} />
                  ) : (
                    '—'
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

const GROUP_LABEL: Partial<Record<Section, string>> = {
  allowance: 'Allowances',
  deduction: 'Deductions',
  overtime: 'Overtime',
}

/**
 * One gridline everywhere — `border-b border-r border-border` on every cell,
 * header rows included, exactly as the salary register and the wage-structure
 * grids draw theirs. A single weight rather than a faint rule inside a band and
 * a strong one between: at this density a second border colour reads as an
 * accident, and the bands already announce themselves through the spanning
 * heading above them.
 *
 * The horizontal rule under the band row falls out of the same `border-b`,
 * which is what separates ALLOWANCES from the head names beneath it.
 */
const GRID_RULE = 'border-b border-r border-border'

/** The band row's height — the second header row's sticky offset follows it. */
const HEAD_ROW_HEIGHT = 'h-[33px]'

/*
 * Backgrounds come from the shared `.wage-*` classes rather than a Tailwind
 * alpha tint. A sticky cell with a translucent background is recomposited
 * against whatever scrolls beneath it every frame, which is what makes a wide
 * pinned table stutter; those classes resolve the tint up front with color-mix
 * so each surface is one flat colour. Using them here also means this grid, the
 * register and the bulk wage grid are literally the same shade.
 */
const HEAD_BASE = cn(
  'wage-head-cell sticky whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
  HEAD_ROW_HEIGHT,
  GRID_RULE,
)

const CELL_BASE = cn('px-3 py-2.5 align-middle', GRID_RULE)

const FOOT_BASE = cn(
  'whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-foreground',
  GRID_RULE,
)

/** Emphasis for the few columns a reader actually lands on. */
const ACCENT: Record<string, string> = {
  none: '',
  gross: 'font-semibold text-foreground',
  net: 'font-semibold text-success',
  'total-allowance': 'font-semibold text-success',
  'total-deduction': 'font-semibold text-destructive',
}

/** One figure — money with its symbol, a day count as a plain number. */
function Cell({ kind, value }: { kind: 'amount' | 'count'; value: number }): ReactNode {
  return kind === 'amount' ? formatAmount(value) : formatDecimal(value)
}
