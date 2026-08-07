import { memo, useMemo } from 'react'
import { useWatch, type Control, type UseFormRegister } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { ColumnHint, GridAmountInput, NO_VALUE } from '@/components/common/wage-grid-fields'
import { useMediaUrl } from '@/hooks/use-media-url'
import { formatAmount, formatDecimal } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { previewEarnedBasic, previewOtAmount, type SalaryColumnTotals } from '../lib/salary-calculations'
import type { SalaryHeadColumn } from '../lib/salary-mappers'
import type { SalaryFormValues } from '../schemas'
import type { SalaryRegisterRow } from '../types'

type Ctl = Control<SalaryFormValues>
type Reg = UseFormRegister<SalaryFormValues>

/**
 * The register itself: a row per posting, the month's pay across it, and the
 * three cells that decide what gets saved.
 *
 * Only days are editable — present days, the working-days override and overtime
 * hours. Every money column is the server's answer, shown read-only, because the
 * server is what computes the pay: from the wage structure in force at the
 * cycle's close, through the same calculation the register previewed with. A grid
 * that let a gross be typed would be offering to write pay the structure doesn't
 * support.
 *
 * Typing into a row therefore makes its money **stale**, not wrong: the figures
 * were computed for the days the server had. Such a row is tinted and its amounts
 * dimmed, and the two figures that follow straight from the cell (earned basic,
 * overtime wage) are re-shown as previews so the change isn't invisible until the
 * save comes back.
 *
 * Built the same way as the bulk wage grid, for the same reasons: rows memoised
 * on stable props, nothing subscribed to the whole form, fixed table layout off
 * an explicit `<colgroup>`, and no `backdrop-blur` on the pinned header — a
 * blurred sticky row re-filters everything scrolling beneath it every frame.
 */

/** Pinned columns, left to right. Their widths are also their offsets. */
const PINNED = { select: 44, employee: 236 } as const

const BANNER_HEIGHT = 34
const COLUMN_ROW_TOP = BANNER_HEIGHT - 1

/* ── Column model ───────────────────────────────────────────────────────── */

type SalaryGroup = 'attendance' | 'allowance' | 'overtime' | 'deduction'

/** What a cell renders — one entry per kind of column on the grid. */
type CellKind =
  | 'select'
  | 'employee'
  | 'designation'
  | 'workingDays'
  | 'presentDays'
  | 'lwp'
  | 'basic'
  | 'earned'
  | 'allowanceHead'
  | 'allowanceTotal'
  | 'otHours'
  | 'otRate'
  | 'otWage'
  | 'gross'
  | 'deductionHead'
  | 'lwf'
  | 'pt'
  | 'esic'
  | 'pf'
  | 'tds'
  | 'deductionTotal'
  | 'net'
  | 'state'

interface SalaryColumn {
  key: string
  label: string
  kind: CellKind
  group?: SalaryGroup
  /** Exact width in px — the table is fixed-layout, so nothing is measured. */
  width: number
  hint?: string
  /** For a head column: which allowance / deduction it is. */
  head?: SalaryHeadColumn
  /** Set on a pinned column: how far from the scrollport's left edge it sits. */
  pin?: number
}

const GROUP_META: Record<SalaryGroup, { label: string; tone: string; hint: string }> = {
  attendance: {
    label: 'Attendance',
    tone: 'text-primary',
    hint: 'The days the month is paid on. Present days open on the attendance’s payable days — punched days, plus company holidays that are not the weekly off, plus approved paid leave. Working days can be overridden; left blank the server uses the wage structure’s.',
  },
  allowance: {
    label: 'Allowance',
    tone: 'text-teal-600 dark:text-teal-400',
    hint: 'The designation’s allowance heads, at the amount this month earns. Computed by the server from the wage structure in force.',
  },
  overtime: {
    label: 'OT (Overtime)',
    tone: 'text-emerald-600 dark:text-emerald-400',
    hint: 'Overtime hours for the month, at the wage structure’s hourly rate. Only editable where the structure allows overtime.',
  },
  deduction: {
    label: 'Deduction',
    tone: 'text-rose-600 dark:text-rose-400',
    hint: 'The designation’s deduction heads and the statutory deductions — PF, ESIC, professional tax, labour welfare fund and TDS — each from the rate in force for the period.',
  },
}

/**
 * Every column of the grid, in order. The allowance and deduction columns are the
 * heads the rows on screen actually carry, so a designation with four heads gets
 * four columns rather than one per head in the company.
 */
function buildColumns(heads: {
  allowances: SalaryHeadColumn[]
  deductions: SalaryHeadColumn[]
}): SalaryColumn[] {
  return [
    { key: 'select', label: '', kind: 'select', width: PINNED.select, pin: 0 },
    {
      key: 'employee',
      label: 'Employee',
      kind: 'employee',
      width: PINNED.employee,
      pin: PINNED.select,
      hint: 'The person and their employee code. A posting already processed carries a badge; a paid one is frozen and cannot be re-saved or discarded.',
    },
    { key: 'designation', label: 'Designation', kind: 'designation', width: 150 },

    {
      key: 'workingDays',
      label: 'W. Days',
      kind: 'workingDays',
      group: 'attendance',
      width: 92,
      hint: 'Working days in the month. Leave it blank to use the wage structure’s.',
    },
    {
      key: 'presentDays',
      label: 'Present',
      kind: 'presentDays',
      group: 'attendance',
      width: 96,
      hint: 'Days this month is paid for. Change it to pay a different number of days than the attendance shows.',
    },
    {
      key: 'lwp',
      label: 'LWP',
      kind: 'lwp',
      group: 'attendance',
      width: 74,
      hint: 'Leave without pay — reported to explain a short month, and not paid.',
    },

    {
      key: 'basic',
      label: 'Basic',
      kind: 'basic',
      width: 128,
      hint: 'The wage structure’s basic pay, with the daily wage it works out to.',
    },
    {
      key: 'earned',
      label: 'Earned',
      kind: 'earned',
      width: 112,
      hint: 'Basic pay for the days actually paid.',
    },

    ...heads.allowances.map((head) => ({
      key: `allowance:${head.payComponentId}`,
      label: head.code,
      kind: 'allowanceHead' as const,
      group: 'allowance' as const,
      width: 140,
      hint: head.name,
      head,
    })),
    {
      key: 'allowanceTotal',
      label: 'Total',
      kind: 'allowanceTotal',
      group: 'allowance',
      width: 112,
    },

    { key: 'otHours', label: 'Hrs', kind: 'otHours', group: 'overtime', width: 82 },
    { key: 'otRate', label: 'Rate', kind: 'otRate', group: 'overtime', width: 90 },
    { key: 'otWage', label: 'Wage', kind: 'otWage', group: 'overtime', width: 104 },

    {
      key: 'gross',
      label: 'Gross Pay',
      kind: 'gross',
      width: 122,
      hint: 'Earned basic, allowances and overtime — before any deduction.',
    },

    ...heads.deductions.map((head) => ({
      key: `deduction:${head.payComponentId}`,
      label: head.code,
      kind: 'deductionHead' as const,
      group: 'deduction' as const,
      width: 140,
      hint: head.name,
      head,
    })),
    { key: 'lwf', label: 'LWF', kind: 'lwf', group: 'deduction', width: 100 },
    { key: 'pt', label: 'PT', kind: 'pt', group: 'deduction', width: 100 },
    { key: 'esic', label: 'ESIC', kind: 'esic', group: 'deduction', width: 100 },
    { key: 'pf', label: 'PF', kind: 'pf', group: 'deduction', width: 100 },
    { key: 'tds', label: 'TDS', kind: 'tds', group: 'deduction', width: 100 },
    {
      key: 'deductionTotal',
      label: 'Total',
      kind: 'deductionTotal',
      group: 'deduction',
      width: 112,
    },

    {
      key: 'net',
      label: 'Net Pay',
      kind: 'net',
      width: 130,
      hint: 'Gross pay less every deduction — what is payable for the month.',
    },
    {
      key: 'state',
      label: 'Status',
      kind: 'state',
      width: 118,
      hint: 'Whether this month has been processed for the posting, and whether it has been paid.',
    },
  ]
}

type HeaderCell =
  | { kind: 'single'; column: SalaryColumn }
  | { kind: 'group'; group: SalaryGroup; span: number }

interface GridLayout {
  columns: SalaryColumn[]
  headerCells: HeaderCell[]
  subColumns: SalaryColumn[]
  totalWidth: number
}

/** The two header rows: banners over their sub-columns, everything else alone. */
function buildLayout(heads: {
  allowances: SalaryHeadColumn[]
  deductions: SalaryHeadColumn[]
}): GridLayout {
  const columns = buildColumns(heads)

  const headerCells = columns.reduce<HeaderCell[]>((cells, column) => {
    if (!column.group) {
      cells.push({ kind: 'single', column })
      return cells
    }
    const last = cells.at(-1)
    if (last?.kind === 'group' && last.group === column.group) {
      last.span += 1
      return cells
    }
    cells.push({ kind: 'group', group: column.group, span: 1 })
    return cells
  }, [])

  return {
    columns,
    headerCells,
    subColumns: columns.filter((column) => column.group),
    totalWidth: columns.reduce((sum, column) => sum + column.width, 0),
  }
}

/** Shared cell frame for every header, body and footer cell. */
const CELL = 'border-b border-r border-border px-2 py-1.5 align-middle'

/** A pinned body cell — opaque and flat, see the `.wage-*` rules in globals.css. */
const STICKY = 'wage-sticky sticky z-10'

function pinStyle(column: SalaryColumn) {
  return column.pin === undefined ? undefined : { left: column.pin }
}

/* ── The grid ───────────────────────────────────────────────────────────── */

interface SalaryRegisterGridProps {
  rows: SalaryRegisterRow[]
  heads: { allowances: SalaryHeadColumn[]; deductions: SalaryHeadColumn[] }
  control: Ctl
  register: Reg
  /** Rows typed into since the register loaded — their money is stale. */
  dirtyRows: Set<number>
  selected: Set<number>
  onToggleRow: (employeeServiceId: number) => void
  onToggleAll: () => void
  /** How many rows can be selected at all — a paid row can't. */
  selectableCount: number
  totals: SalaryColumnTotals
}

export function SalaryRegisterGrid({
  rows,
  heads,
  control,
  register,
  dirtyRows,
  selected,
  onToggleRow,
  onToggleAll,
  selectableCount,
  totals,
}: SalaryRegisterGridProps) {
  const layout = useMemo(() => buildLayout(heads), [heads])

  return (
    <div className="relative max-h-[36rem] overflow-auto">
      <table
        className="table-fixed border-separate border-spacing-0 text-xs"
        style={{ width: layout.totalWidth }}
      >
        <GridHead
          layout={layout}
          allSelected={selectableCount > 0 && selected.size === selectableCount}
          selectable={selectableCount > 0}
          onToggleAll={onToggleAll}
        />

        <tbody>
          {rows.map((row, index) => (
            <SalaryGridRow
              key={row.employeeServiceId}
              index={index}
              row={row}
              columns={layout.columns}
              control={control}
              register={register}
              isStale={dirtyRows.has(index)}
              isSelected={selected.has(row.employeeServiceId)}
              onToggleRow={onToggleRow}
            />
          ))}
        </tbody>

        <GridFoot layout={layout} totals={totals} rowCount={rows.length} />
      </table>
    </div>
  )
}

/* ── Header ─────────────────────────────────────────────────────────────── */

const GridHead = memo(function GridHead({
  layout,
  allSelected,
  selectable,
  onToggleAll,
}: {
  layout: GridLayout
  allSelected: boolean
  selectable: boolean
  onToggleAll: () => void
}) {
  return (
    <>
      <colgroup>
        {layout.columns.map((column) => (
          <col key={column.key} style={{ width: column.width }} />
        ))}
      </colgroup>

      <thead>
        {/* Banners, and any column that has none — those span both rows. */}
        <tr>
          {layout.headerCells.map((cell) => {
            if (cell.kind === 'single') {
              const pinned = cell.column.pin !== undefined
              return (
                <th
                  key={cell.column.key}
                  rowSpan={2}
                  style={pinStyle(cell.column)}
                  className={cn(
                    'wage-head-cell sticky top-0 border-b border-r border-border px-2 py-2 text-center align-middle text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground',
                    pinned ? 'z-[25]' : 'z-[20]',
                  )}
                >
                  {cell.column.kind === 'select' ? (
                    <Checkbox
                      checked={allSelected}
                      disabled={!selectable}
                      onChange={onToggleAll}
                      aria-label="Select every row on this page"
                    />
                  ) : (
                    <>
                      {cell.column.label}
                      {cell.column.hint && <ColumnHint text={cell.column.hint} />}
                    </>
                  )}
                </th>
              )
            }

            const meta = GROUP_META[cell.group]
            return (
              <th
                key={cell.group}
                colSpan={cell.span}
                style={{ height: BANNER_HEIGHT }}
                className={cn(
                  'wage-head-cell sticky top-0 z-[20] whitespace-nowrap border-b border-r border-border px-2 text-center text-[11px] font-bold uppercase leading-none tracking-wide',
                  meta.tone,
                )}
              >
                {meta.label}
                <ColumnHint text={meta.hint} />
              </th>
            )
          })}
        </tr>

        <tr>
          {layout.subColumns.map((column) => (
            <th
              key={column.key}
              style={{ top: COLUMN_ROW_TOP }}
              className={cn(
                CELL,
                'wage-head-cell sticky z-[15] whitespace-nowrap text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
              )}
            >
              {column.label}
              {column.hint && <ColumnHint text={column.hint} />}
            </th>
          ))}
        </tr>
      </thead>
    </>
  )
})

/* ── Rows ───────────────────────────────────────────────────────────────── */

interface SalaryGridRowProps {
  index: number
  row: SalaryRegisterRow
  columns: SalaryColumn[]
  control: Ctl
  register: Reg
  /** The row's days have been typed into, so its money predates them. */
  isStale: boolean
  isSelected: boolean
  onToggleRow: (employeeServiceId: number) => void
}

/**
 * One posting's row. Memoised on props that are all primitives or stable
 * references — `row` comes from the register held in state and the callback from
 * `useCallback` — so typing in one row leaves the others alone.
 */
const SalaryGridRow = memo(function SalaryGridRow(props: SalaryGridRowProps) {
  const { columns, isStale } = props

  return (
    <tr className={cn(isStale && 'wage-row-draft', !isStale && 'wage-row-saved')}>
      {columns.map((column) => (
        <td
          key={column.key}
          style={pinStyle(column)}
          className={cn(
            CELL,
            column.pin !== undefined && STICKY,
            column.kind !== 'employee' && column.kind !== 'designation' && 'text-right',
            column.kind === 'select' && 'text-center',
          )}
        >
          <RowCell column={column} {...props} />
        </td>
      ))}
    </tr>
  )
})

function RowCell({ column, index, row, control, register, isStale, isSelected, onToggleRow }: SalaryGridRowProps & { column: SalaryColumn }) {
  const { figures, wageStructure } = row

  switch (column.kind) {
    case 'select':
      return (
        <Checkbox
          checked={isSelected}
          disabled={row.isPaid}
          onChange={() => onToggleRow(row.employeeServiceId)}
          aria-label={`Select ${row.employeeName || 'employee'}`}
        />
      )

    case 'employee':
      return <EmployeeCell row={row} />

    case 'designation':
      return (
        <span className="text-foreground">{row.designationName || NO_VALUE}</span>
      )

    /* ── The three editable cells ───────────────────────────────────────── */

    case 'workingDays':
      return (
        <GridAmountInput
          placeholder={String(
            wageStructure?.workingDays ?? row.attendance.workingDays ?? 0,
          )}
          disabled={row.isPaid}
          {...register(`rows.${index}.workingDays`)}
        />
      )

    case 'presentDays':
      return (
        <GridAmountInput
          disabled={row.isPaid}
          placeholder={String(row.attendance.payableDays)}
          {...register(`rows.${index}.presentDays`)}
        />
      )

    case 'lwp':
      return (
        <span
          className={cn(
            'tabular-nums',
            row.attendance.unpaidLeaveDays > 0
              ? 'font-medium text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground',
          )}
        >
          {formatDecimal(row.attendance.unpaidLeaveDays)}
        </span>
      )

    case 'otHours': {
      const allowed = wageStructure?.isOvertimeApplicable ?? false
      return (
        <GridAmountInput
          disabled={row.isPaid || !allowed}
          placeholder={allowed ? '0' : NO_VALUE}
          {...register(`rows.${index}.otHours`)}
        />
      )
    }

    /* ── Money — the server's, dimmed while the row's days are unsaved ──── */

    case 'basic':
      return (
        <div className="leading-tight">
          <Money value={figures.basicPay} stale={isStale} className="font-medium" />
          <span className="block text-[10px] text-muted-foreground">
            {formatAmount(figures.wagesPerDay)} / day
          </span>
        </div>
      )

    case 'earned':
      return <EarnedCell index={index} row={row} control={control} isStale={isStale} />

    case 'allowanceHead':
      return (
        <Money
          value={headAmount(figures.allowances, column.head?.payComponentId)}
          stale={isStale}
        />
      )

    case 'allowanceTotal':
      return (
        <Money
          value={figures.totalAllowance}
          stale={isStale}
          className="font-semibold text-teal-600 dark:text-teal-400"
        />
      )

    case 'otRate':
      return figures.otRate ? (
        <Money value={figures.otRate} stale={isStale} className="text-muted-foreground" />
      ) : (
        <span className="text-muted-foreground">{NO_VALUE}</span>
      )

    case 'otWage':
      return <OtWageCell index={index} row={row} control={control} isStale={isStale} />

    case 'gross':
      return (
        <Money
          value={figures.grossPay}
          stale={isStale}
          className="font-semibold text-emerald-600 dark:text-emerald-400"
        />
      )

    case 'deductionHead':
      return (
        <Money
          value={headAmount(figures.deductions, column.head?.payComponentId)}
          stale={isStale}
        />
      )

    case 'lwf':
      return (
        <ActAmount
          applicable={wageStructure?.isLwfActApplicable ?? false}
          value={figures.employeeLwf}
          stale={isStale}
        />
      )

    case 'pt':
      return (
        <ActAmount
          applicable={wageStructure?.isPtActApplicable ?? false}
          value={figures.employeePt}
          stale={isStale}
        />
      )

    case 'esic':
      return (
        <ActAmount
          applicable={wageStructure?.isEsicActApplicable ?? false}
          value={figures.employeeEsic}
          stale={isStale}
        />
      )

    case 'pf':
      return (
        <ActAmount
          applicable={wageStructure?.isPfActApplicable ?? false}
          value={figures.employeePf}
          stale={isStale}
        />
      )

    case 'tds':
      return (
        <ActAmount
          applicable={wageStructure?.isTdsActApplicable ?? false}
          value={figures.employeeTds}
          stale={isStale}
        />
      )

    case 'deductionTotal':
      return (
        <Money
          value={figures.totalDeduction}
          stale={isStale}
          className="font-semibold text-rose-600 dark:text-rose-400"
        />
      )

    case 'net':
      return (
        <Money
          value={figures.netPay}
          stale={isStale}
          className="text-sm font-semibold text-foreground"
        />
      )

    case 'state':
      return <StateCell row={row} isStale={isStale} />

    default:
      return null
  }
}

/** Photo, name and code — the column the register is read by. */
function EmployeeCell({ row }: { row: SalaryRegisterRow }) {
  const photoUrl = useMediaUrl(row.photo)
  const label = [row.employeePrefix, row.employeeName].filter(Boolean).join(' ')

  return (
    <div className="flex items-center gap-2">
      <ImageWithFallback
        src={photoUrl}
        alt={row.employeeName || 'Employee photo'}
        wrapperClassName="size-7 shrink-0 rounded-full ring-1 ring-border"
        className="object-cover"
      />
      <div className="min-w-0 leading-tight">
        <span className="block truncate font-medium text-foreground">
          {label || NO_VALUE}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {row.employeeCode || 'No code'}
        </span>
      </div>
    </div>
  )
}

/**
 * Earned basic. While the row's present days are unsaved this shows what those
 * days come to at the daily wage — the server still owns the figure, but the cell
 * shouldn't keep quoting a month that nobody is asking for any more.
 */
function EarnedCell({
  index,
  row,
  control,
  isStale,
}: {
  index: number
  row: SalaryRegisterRow
  control: Ctl
  isStale: boolean
}) {
  const presentDays = useWatch({ control, name: `rows.${index}.presentDays` })

  if (!isStale) {
    return <Money value={row.figures.earnedBasic} stale={false} className="font-medium" />
  }
  return (
    <Preview
      value={previewEarnedBasic(row.figures.wagesPerDay, Number(presentDays) || 0)}
    />
  )
}

/** Overtime wage — the same arrangement, at the structure's hourly rate. */
function OtWageCell({
  index,
  row,
  control,
  isStale,
}: {
  index: number
  row: SalaryRegisterRow
  control: Ctl
  isStale: boolean
}) {
  const otHours = useWatch({ control, name: `rows.${index}.otHours` })

  if (!isStale) {
    return (
      <Money
        value={row.figures.otAmount}
        stale={false}
        className="text-sky-700 dark:text-sky-400"
      />
    )
  }
  return <Preview value={previewOtAmount(row.figures.otRate, Number(otHours) || 0)} />
}

/** Whether this month has been processed, and whether it's been paid. */
function StateCell({ row, isStale }: { row: SalaryRegisterRow; isStale: boolean }) {
  if (row.isPaid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        <Lock className="size-3" />
        Paid
      </span>
    )
  }
  if (isStale) {
    return (
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        Edited
      </span>
    )
  }
  if (row.isProcessed) {
    return (
      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
        {row.isImported ? 'Imported' : 'Processed'}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
      Pending
    </span>
  )
}

/* ── Shared value renderers ─────────────────────────────────────────────── */

/** A head's amount on a row; a head the row doesn't carry pays nothing. */
function headAmount(
  heads: { payComponentId: number; amount: number }[],
  payComponentId?: number,
): number {
  if (payComponentId === undefined) return 0
  return heads.find((head) => head.payComponentId === payComponentId)?.amount ?? 0
}

/**
 * A server figure. `stale` dims it: the row's days have been typed into, so this
 * is what the month came to *before* the change and the save is what settles it.
 */
function Money({
  value,
  stale,
  className,
}: {
  value: number
  stale: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'block tabular-nums',
        stale && 'text-muted-foreground/60 line-through decoration-muted-foreground/40',
        className,
      )}
      title={stale ? 'Recomputed by the server when this row is processed' : undefined}
    >
      {formatAmount(value)}
    </span>
  )
}

/** What the typed days come to — marked as a preview, not as the figure. */
function Preview({ value }: { value: number }) {
  return (
    <span
      className="block border-b border-dashed border-primary/40 tabular-nums font-medium text-primary"
      title="Preview of the typed days — the server computes the figure that is saved"
    >
      {formatAmount(value)}
    </span>
  )
}

/** A statutory deduction, or a dash where its act doesn't apply to the row. */
function ActAmount({
  applicable,
  value,
  stale,
}: {
  applicable: boolean
  value: number
  stale: boolean
}) {
  if (!applicable) {
    return <span className="text-muted-foreground">{NO_VALUE}</span>
  }
  return <Money value={value} stale={stale} />
}

/* ── Grand total ────────────────────────────────────────────────────────── */

/**
 * The page's grand total, pinned to the bottom of the scrollport.
 *
 * It sums the register as the *server* currently has it — the stored figures on a
 * processed row, the preview on a pending one — so a row whose days have been
 * typed but not saved doesn't move it. That's deliberate: the footer says what
 * the month comes to now, and the difference is what the save is for.
 */
const GridFoot = memo(function GridFoot({
  layout,
  totals,
  rowCount,
}: {
  layout: GridLayout
  totals: SalaryColumnTotals
  rowCount: number
}) {
  if (rowCount === 0) return null

  return (
    <tfoot>
      <tr className="wage-total-row sticky bottom-0 z-[18]">
        {layout.columns.map((column) => (
          <td
            key={column.key}
            style={pinStyle(column)}
            className={cn(
              CELL,
              'border-t border-border font-semibold',
              column.pin !== undefined && 'wage-sticky sticky z-[19]',
              column.kind === 'select' || column.kind === 'employee'
                ? 'text-left'
                : 'text-right',
            )}
          >
            <TotalCell column={column} totals={totals} />
          </td>
        ))}
      </tr>
    </tfoot>
  )
})

function TotalCell({
  column,
  totals,
}: {
  column: SalaryColumn
  totals: SalaryColumnTotals
}) {
  switch (column.kind) {
    case 'employee':
      return (
        <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
          Grand Total
        </span>
      )
    case 'earned':
      return <TotalAmount value={totals.earnedBasic} />
    case 'allowanceHead':
      return (
        <TotalAmount
          value={totals.allowanceByHead.get(column.head?.payComponentId ?? -1) ?? 0}
        />
      )
    case 'allowanceTotal':
      return (
        <TotalAmount
          value={totals.totalAllowance}
          className="text-teal-600 dark:text-teal-400"
        />
      )
    case 'otHours':
      return (
        <span className="tabular-nums text-primary">{formatDecimal(totals.otHours)}</span>
      )
    case 'otWage':
      return <TotalAmount value={totals.otAmount} className="text-sky-700 dark:text-sky-400" />
    case 'gross':
      return (
        <TotalAmount
          value={totals.grossPay}
          className="text-emerald-600 dark:text-emerald-400"
        />
      )
    case 'deductionHead':
      return (
        <TotalAmount
          value={totals.deductionByHead.get(column.head?.payComponentId ?? -1) ?? 0}
        />
      )
    case 'lwf':
      return <TotalAmount value={totals.employeeLwf} />
    case 'pt':
      return <TotalAmount value={totals.employeePt} />
    case 'esic':
      return <TotalAmount value={totals.employeeEsic} />
    case 'pf':
      return <TotalAmount value={totals.employeePf} />
    case 'tds':
      return <TotalAmount value={totals.employeeTds} />
    case 'deductionTotal':
      return (
        <TotalAmount
          value={totals.totalDeduction}
          className="text-rose-600 dark:text-rose-400"
        />
      )
    case 'net':
      return <TotalAmount value={totals.netPay} className="text-sm text-foreground" />
    default:
      return null
  }
}

function TotalAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('block tabular-nums', className)}>{formatAmount(value)}</span>
  )
}
