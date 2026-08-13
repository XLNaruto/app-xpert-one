import { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { Eye, Lock, Pencil } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import {
  CellTooltip,
  ColumnHint,
  GridAmountInput,
  NO_VALUE,
} from '@/components/common/wage-grid-fields'
import { useMediaUrl } from '@/hooks/use-media-url'
import { formatAmount, formatDecimal, gridAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  liveRow,
  presentDaysProblem,
  PRESENT_DAYS_LIMIT,
  rowFigures,
  salaryColumnTotals,
  type SalaryColumnTotals,
  type SalaryRowFigures,
  type StatutoryComponentIds,
} from '../lib/salary-calculations'
import { SalaryAttendanceDialog } from './salary-attendance-dialog'
import type { SalaryHeadColumn } from '../lib/salary-mappers'
import type { SalaryFormValues, SalaryStatutoryKey } from '../schemas'
import type {
  SalaryHeadConfig,
  SalaryHeadConfigs,
  SalaryRates,
  SalaryRegisterRow,
} from '../types'

type Ctl = Control<SalaryFormValues>
type Reg = UseFormRegister<SalaryFormValues>
type Setter = UseFormSetValue<SalaryFormValues>

/**
 * A double-click-to-edit cell's field group — the three places on a row that
 * carry an `{ amount, overridden }` pair. Spelled out as a union rather than as a
 * generic field path so `setValue` still knows the amount is a string and the
 * flag a boolean.
 */
type CellPath =
  | `rows.${number}.allowances.${number}`
  | `rows.${number}.deductions.${number}`
  | `rows.${number}.statutory.${SalaryStatutoryKey}`

/**
 * The register itself: a row per posting, the month's pay across it, and the
 * cells that decide what gets saved.
 *
 * What can be typed, and what can't:
 *
 * - **Present days** and **overtime hours** are ordinary inputs. They are the
 *   month's two variables and everything else follows them.
 * - **Working days** is read-only. It comes off the wage structure, or off the
 *   attendance where the structure calculates it, and it is what pay is spread
 *   over rather than something decided per person.
 * - **Every allowance and deduction head**, and **PF, ESIC, PT, LWF and TDS**,
 *   are read-only until double-clicked, then typed over — see `HeadCell`. A head
 *   configured as a percentage follows the present days; typed over, it is pinned
 *   to the figure entered. The statutory five follow the days too, through the
 *   wage structure's act settings and the period's rate masters, and pin the same
 *   way — a month where an act was deducted differently is exactly what typing
 *   one over is for.
 * - **The totals, the gross and the net** are computed, never typed: they are the
 *   sum of the parts above and `bulk-save` refuses a row where they aren't.
 *
 * A row is recomputed live rather than left to the save to settle — the client is
 * what decides the pay now, so the grid can simply show it. A row whose month was
 * already stored is the exception: it keeps its stored figures until it is
 * edited, so that looking at a processed month doesn't quietly redraw it.
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
  /**
   * For a head column: its position among its side's heads, which is also the
   * position of its cell in every row — the form is seeded in column order, so a
   * column addresses `rows.n.allowances.<headIndex>` directly.
   */
  headIndex?: number
  /** Set on a pinned column: how far from the scrollport's left edge it sits. */
  pin?: number
}

/**
 * The five statutory columns, each tied to the act that decides whether it
 * applies, the figure it shows and the cell it writes to. One table rather than
 * five near-identical cases, since the only thing that differs between them is
 * which act is being read.
 */
const ACTS: Record<
  'pf' | 'esic' | 'pt' | 'lwf' | 'tds',
  {
    key: SalaryStatutoryKey
    applies: (wage: SalaryRegisterRow['wageStructure']) => boolean
    of: (figures: SalaryRowFigures) => number
    /** The chip under the figure while it hasn't been typed over. */
    basis: string
    hint: string
  }
> = {
  pf: {
    key: 'pf',
    applies: (wage) => wage?.isPfActApplicable ?? false,
    of: (figures) => figures.employeePf,
    basis: 'Act',
    hint: 'Provident fund — the PF rate in force for the period, on the wage the PF-applicable heads make up, or the designation’s own fixed amount. Follows the present days. Double-click to deduct a different amount this month.',
  },
  esic: {
    key: 'esic',
    applies: (wage) => wage?.isEsicActApplicable ?? false,
    of: (figures) => figures.employeeEsic,
    basis: 'Act',
    hint: 'ESIC — the rate in force for the period, on whatever the designation’s deduction basis charges it: the wage ceiling, the whole gross, or nothing at all once the ceiling is passed. Double-click to deduct a different amount this month.',
  },
  pt: {
    key: 'pt',
    applies: (wage) => wage?.isPtActApplicable ?? false,
    of: (figures) => figures.employeePt,
    basis: 'Slab',
    hint: 'Professional tax — the state’s slab for this wage and month, or the designation’s own amount where it is set manually. Double-click to deduct a different amount this month.',
  },
  lwf: {
    key: 'lwf',
    applies: (wage) => wage?.isLwfActApplicable ?? false,
    of: (figures) => figures.employeeLwf,
    basis: 'Act',
    hint: 'Labour welfare fund — the state’s contribution, and only in the months it is collected in. Zero in every other month. Double-click to deduct a different amount this month.',
  },
  tds: {
    key: 'tds',
    applies: (wage) => wage?.isTdsActApplicable ?? false,
    of: (figures) => figures.employeeTds,
    basis: 'Manual',
    hint: 'Tax deducted at source — the designation’s percentage of the gross where one is set, and nothing otherwise. Double-click to type a figure for the month.',
  },
}

const GROUP_META: Record<SalaryGroup, { label: string; tone: string; hint: string }> = {
  attendance: {
    label: 'Attendance',
    tone: 'text-primary',
    hint: 'The days the month is paid on. Present days open on the attendance’s payable days — punched days, plus company holidays that are not the weekly off, plus approved paid leave — and are the one figure here you set. Working days are read-only: they come off the wage structure, or off the attendance where the structure calculates them.',
  },
  allowance: {
    label: 'Allowance',
    tone: 'text-teal-600 dark:text-teal-400',
    hint: 'The designation’s allowance heads. A head configured as a percentage earns its share of the earned basic and follows the present days; one configured flat stays put. Double-click any of them to type an amount over it for that row.',
  },
  overtime: {
    label: 'OT (Overtime)',
    tone: 'text-emerald-600 dark:text-emerald-400',
    hint: 'Overtime hours for the month, at the wage structure’s hourly rate. Only editable where the structure allows overtime.',
  },
  deduction: {
    label: 'Deduction',
    tone: 'text-rose-600 dark:text-rose-400',
    hint: 'The designation’s deduction heads, and the statutory ones — PF, ESIC, professional tax, labour welfare fund and TDS. The statutory figures are worked out from the wage structure’s act settings and the rate masters in force for the period, so they follow the present days along with everything else. Every column here can be double-clicked and typed over, and a typed figure is then fixed for that row.',
  },
}

/**
 * Every column of the grid, in order. The allowance and deduction columns are the
 * company's own heads, from the allowance / deduction master — the same columns
 * in the same places whichever designation, month or tab is on screen, which is
 * how the bulk wage grid reads too.
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
      hint: 'Working days in the month, from the wage structure — or from the attendance where the structure calculates them. Read-only: it is what pay is spread over, not something set per person.',
    },
    {
      key: 'presentDays',
      label: 'Present',
      kind: 'presentDays',
      group: 'attendance',
      /* Wider than the other day columns: the cell carries the eye that opens
         the attendance breakdown beside its input. */
      width: 132,
      hint: 'Days this month is paid for — punched days, holidays and paid leave. The eye opens the breakdown; change the figure to pay a different number of days than the attendance shows.',
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

    ...heads.allowances.map((head, headIndex) => ({
      key: `allowance:${head.payComponentId}`,
      label: head.code,
      kind: 'allowanceHead' as const,
      group: 'allowance' as const,
      width: 140,
      hint: head.name,
      head,
      headIndex,
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

    ...heads.deductions.map((head, headIndex) => ({
      key: `deduction:${head.payComponentId}`,
      label: head.code,
      kind: 'deductionHead' as const,
      group: 'deduction' as const,
      width: 140,
      hint: head.name,
      head,
      headIndex,
    })),
    /* PF · ESIC · PT · TDS · LWF — the order payroll reads them in. */
    { key: 'pf', label: 'PF', kind: 'pf', group: 'deduction', width: 100 },
    { key: 'esic', label: 'ESIC', kind: 'esic', group: 'deduction', width: 100 },
    { key: 'pt', label: 'PT', kind: 'pt', group: 'deduction', width: 100 },
    { key: 'tds', label: 'TDS', kind: 'tds', group: 'deduction', width: 100 },
    { key: 'lwf', label: 'LWF', kind: 'lwf', group: 'deduction', width: 100 },
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
  setValue: Setter
  /** How the designation configures each head — percentage, or a flat amount. */
  headConfigs: SalaryHeadConfigs
  statutoryIds: StatutoryComponentIds
  /** The rate masters PF / ESIC / PT / LWF are priced from for this period. */
  rates: SalaryRates
  /** 1–12 — which month's PT and LWF collection rules apply. */
  periodMonth: number
  /** Rows typed into since the register loaded — these are the recomputed ones. */
  dirtyRows: Set<number>
  selected: Set<number>
  onToggleRow: (employeeServiceId: number) => void
  onToggleAll: () => void
  /** How many rows can be selected at all — a paid row can't. */
  selectableCount: number
}

export function SalaryRegisterGrid({
  rows,
  heads,
  control,
  register,
  setValue,
  headConfigs,
  statutoryIds,
  rates,
  periodMonth,
  dirtyRows,
  selected,
  onToggleRow,
  onToggleAll,
  selectableCount,
}: SalaryRegisterGridProps) {
  const layout = useMemo(() => buildLayout(heads), [heads])

  /**
   * The row whose attendance is being read, and the days its cell held when the
   * eye was clicked — captured rather than watched, so the dialog can't move
   * under the person reading it.
   */
  const [breakdown, setBreakdown] = useState<{
    row: SalaryRegisterRow
    presentDays: string
  } | null>(null)

  const showBreakdown = useCallback(
    (row: SalaryRegisterRow, presentDays: string) => setBreakdown({ row, presentDays }),
    [],
  )

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
              setValue={setValue}
              headConfigs={headConfigs}
              statutoryIds={statutoryIds}
              rates={rates}
              periodMonth={periodMonth}
              isStale={dirtyRows.has(index)}
              isSelected={selected.has(row.employeeServiceId)}
              onToggleRow={onToggleRow}
              onShowBreakdown={showBreakdown}
            />
          ))}
        </tbody>

        <GridFoot
          layout={layout}
          rows={rows}
          control={control}
          headConfigs={headConfigs}
          statutoryIds={statutoryIds}
          rates={rates}
          periodMonth={periodMonth}
          dirtyRows={dirtyRows}
        />
      </table>

      <SalaryAttendanceDialog
        row={breakdown?.row ?? null}
        presentDays={breakdown?.presentDays ?? ''}
        onClose={() => setBreakdown(null)}
      />
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
  setValue: Setter
  headConfigs: SalaryHeadConfigs
  statutoryIds: StatutoryComponentIds
  rates: SalaryRates
  periodMonth: number
  /** The row has been typed into, so its money is recomputed from its cells. */
  isStale: boolean
  isSelected: boolean
  onToggleRow: (employeeServiceId: number) => void
  /** Opens the attendance breakdown for this row, at the days now in its cell. */
  onShowBreakdown: (row: SalaryRegisterRow, presentDays: string) => void
}

/**
 * One posting's row.
 *
 * The row watches **its own** form values and nothing else, so a keystroke here
 * re-renders this row and no other — the arrangement the bulk wage grid uses, for
 * the same reason. What it does with them is the part that changed: since the
 * client now decides the pay, an edited row's money is recomputed here and shown
 * live rather than dimmed and left to the save to settle.
 */
const SalaryGridRow = memo(function SalaryGridRow(props: SalaryGridRowProps) {
  const { columns, index, row, control, headConfigs, statutoryIds, rates, periodMonth, isStale } =
    props

  const values = useWatch({ control, name: `rows.${index}` })
  const figures = useMemo(
    () =>
      rowFigures(
        row,
        values,
        headConfigs,
        statutoryIds,
        liveRow(row, isStale),
        rates,
        periodMonth,
      ),
    [row, values, headConfigs, statutoryIds, rates, periodMonth, isStale],
  )

  return (
    <tr className={cn(isStale && 'wage-row-draft', !isStale && 'wage-row-saved')}>
      {columns.map((column) => (
        <td
          key={column.key}
          style={pinStyle(column)}
          className={cn(
            CELL,
            column.pin !== undefined && STICKY,
            /* Centred throughout, except the employee column: a name and a code
               read left-aligned, and they are the column the eye scans down. */
            column.kind === 'employee' ? 'text-left' : 'text-center',
          )}
        >
          <RowCell column={column} figures={figures} values={values} {...props} />
        </td>
      ))}
    </tr>
  )
})

function RowCell({
  column,
  index,
  row,
  figures,
  values,
  register,
  setValue,
  headConfigs,
  isStale,
  isSelected,
  onToggleRow,
  onShowBreakdown,
}: SalaryGridRowProps & {
  column: SalaryColumn
  figures: SalaryRowFigures
  values: SalaryFormValues['rows'][number] | undefined
}) {
  const { wageStructure } = row

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

    /* ── Days ───────────────────────────────────────────────────────────── */

    /*
      Read-only: the month's working days come off the wage structure, or off the
      attendance where the structure leaves them to be calculated. They are what
      the pay is spread over rather than something payroll decides per person, so
      the cell reports them and the save sends them as part of the snapshot.
    */
    case 'workingDays':
      return (
        <span className="block tabular-nums text-foreground">
          {formatDecimal(figures.workingDays)}
        </span>
      )

    /*
      The one figure payroll sets, and the one that has to be caught here. Since
      the client decides the pay, an impossible day count — 27 against a 26-day
      month — is simply priced and saved unless the screen refuses it, so the cell
      says so as it is typed rather than leaving it to the toast the save raises.
      Same message either way: both come from `presentDaysProblem`.
    */
    case 'presentDays': {
      const problem = values
        ? presentDaysProblem(values.presentDays, values.workingDays)
        : null
      const input = (
        <GridAmountInput
          disabled={row.isPaid}
          placeholder={String(row.attendance.payableDays)}
          aria-invalid={problem !== null}
          max={figures.workingDays || PRESENT_DAYS_LIMIT}
          className={cn(
            'text-center',
            problem &&
              'border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
          )}
          {...register(`rows.${index}.presentDays`)}
        />
      )
      /* Wrapped only when there is something to say — `CellTooltip` renders its
         panel unconditionally, so a blank label is a blank tooltip on hover. */
      return (
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            {problem ? <CellTooltip label={problem}>{input}</CellTooltip> : input}
          </div>
          {/* The cell holds a sum — punched days, holidays and paid leave — and
              may have been typed over since. This opens what it is made of. */}
          <CellTooltip label="Attendance breakdown">
            <button
              type="button"
              onClick={() => onShowBreakdown(row, values?.presentDays ?? '')}
              aria-label={`Attendance breakdown for ${row.employeeName || 'employee'}`}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Eye className="size-3.5" />
            </button>
          </CellTooltip>
        </div>
      )
    }

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
          className="text-center"
          disabled={row.isPaid || !allowed}
          placeholder={allowed ? '0' : NO_VALUE}
          {...register(`rows.${index}.otHours`)}
        />
      )
    }

    /* ── Money ──────────────────────────────────────────────────────────── */

    case 'basic':
      return (
        <div className="leading-tight">
          <Money value={figures.basicPay} stale={false} className="font-medium" />
          <span className="block text-[10px] text-muted-foreground">
            {formatAmount(figures.wagesPerDay)} / day
          </span>
        </div>
      )

    case 'earned':
      return (
        <Money value={figures.earnedBasic} stale={false} className="font-medium" />
      )

    case 'allowanceHead':
    case 'deductionHead': {
      const side = column.kind === 'allowanceHead' ? 'allowances' : 'deductions'
      const cellIndex = column.headIndex ?? 0
      return (
        <HeadCell
          path={`rows.${index}.${side}.${cellIndex}`}
          amount={headAmount(
            side === 'allowances' ? figures.allowances : figures.deductions,
            column.head?.payComponentId,
          )}
          config={headConfigs.get(column.head?.payComponentId ?? -1)}
          overridden={values?.[side]?.[cellIndex]?.overridden ?? false}
          register={register}
          setValue={setValue}
          disabled={row.isPaid}
        />
      )
    }

    case 'allowanceTotal':
      return (
        <Money
          value={figures.totalAllowance}
          stale={false}
          className="font-semibold text-teal-600 dark:text-teal-400"
        />
      )

    case 'otRate':
      return figures.otRate ? (
        <Money value={figures.otRate} stale={false} className="text-muted-foreground" />
      ) : (
        <span className="text-muted-foreground">{NO_VALUE}</span>
      )

    case 'otWage':
      return (
        <Money
          value={figures.otAmount}
          stale={false}
          className="text-sky-700 dark:text-sky-400"
        />
      )

    case 'gross':
      return (
        <Money
          value={figures.grossPay}
          stale={false}
          className="font-semibold text-emerald-600 dark:text-emerald-400"
        />
      )

    /*
      The statutory deductions. Priced from the designation's act settings and the
      period's rate masters, and editable like the heads for the same reason — the
      API stores what it is sent, so a month deducted differently has somewhere to
      say so.

      An act the designation has switched off says **Off** rather than "N/A". The
      two look alike and mean different things: "Off" is a setting someone chose,
      and is answered on the designation; "N/A" is the row having no wage
      structure in force at all, which is a posting problem and not a payroll one.
      Reading a blank column as "the act didn't apply this month" when it was
      really "this person has no structure" is how a missed deduction hides.
    */
    case 'lwf':
    case 'pt':
    case 'esic':
    case 'pf':
    case 'tds': {
      const act = ACTS[column.kind]
      if (!act.applies(wageStructure)) {
        return wageStructure ? (
          <ActOff label={column.label} />
        ) : (
          <CellTooltip label="No wage structure is in force for this posting, so no act can be applied. Set one on the designation.">
            <span className="cursor-help text-muted-foreground">{NO_VALUE}</span>
          </CellTooltip>
        )
      }
      return (
        <HeadCell
          path={`rows.${index}.statutory.${act.key}`}
          amount={act.of(figures)}
          config={undefined}
          overridden={values?.statutory?.[act.key]?.overridden ?? false}
          fallbackBasis={act.basis}
          hint={act.hint}
          register={register}
          setValue={setValue}
          disabled={row.isPaid}
        />
      )
    }

    case 'deductionTotal':
      return (
        <Money
          value={figures.totalDeduction}
          stale={false}
          className="font-semibold text-rose-600 dark:text-rose-400"
        />
      )

    case 'net':
      return (
        <Money
          value={figures.netPay}
          stale={false}
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
 * One allowance or deduction head — **read-only until it is double-clicked**.
 *
 * At rest it is a figure with a chip under it saying where the figure comes
 * from: `10%` for a head the designation configures as a share of pay, `₹500` for
 * one configured flat. A percentage head follows the present days, so changing
 * the days changes it; a fixed head sits still.
 *
 * Double-clicking opens the amount for typing, and what is typed *pins* the head:
 * the chip turns amber and reads "Fixed", and the figure stops following the days
 * for this row. That's the escape hatch payroll needs — a one-off allowance, an
 * amount agreed off the structure — and the API is built for it, storing every
 * figure exactly as sent. Clearing the cell hands the head back to its
 * configuration.
 *
 * Editing is deliberately not one click. Every one of these cells lands under the
 * pointer while scrolling a wide grid sideways, and a single click that turned a
 * whole column of computed pay into typed pay would be a bad accident to have to
 * notice.
 */
/**
 * An act the designation has switched off.
 *
 * Deliberately not a blank or an "N/A". A statutory column that simply reads
 * empty is ambiguous in the direction that costs money — "nothing was deducted"
 * and "this act doesn't apply to this designation" look identical, so a PF
 * setting switched off by mistake reads exactly like a month where PF happened
 * to come to zero. The chip states which of the two it is, and the tooltip says
 * where to change it.
 *
 * Styled as a chip rather than as text so it reads as a *state* at a glance down
 * a column of figures, and toned rose — the deduction group's own colour — so it
 * is legible as "this column is not deducting" from across the grid without
 * being mistaken for an error.
 */
function ActOff({ label }: { label: string }) {
  return (
    <CellTooltip
      label={`${label} is switched off for this designation, so nothing is deducted. Turn it on in the designation's act settings to deduct it here.`}
    >
      <span className="inline-flex cursor-help items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-400">
        Off
      </span>
    </CellTooltip>
  )
}

function HeadCell({
  path,
  amount,
  config,
  overridden,
  fallbackBasis,
  hint,
  register,
  setValue,
  disabled,
}: {
  /** The cell's field group — `.amount` and `.overridden` hang off it. */
  path: CellPath
  amount: number
  config: SalaryHeadConfig | undefined
  overridden: boolean
  /** Chip for a cell with no designation configuration behind it. */
  fallbackBasis?: string
  /** Tooltip for such a cell, in place of the one the configuration explains. */
  hint?: string
  register: Reg
  setValue: Setter
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const field = register(`${path}.amount`)
  /* What the cell held when editing started, so Escape can put it back. */
  const before = useRef<string>('')
  /* Escape unmounts the input, and an unmount can still deliver a blur — which
     would commit the very value Escape just took back. */
  const cancelled = useRef(false)

  const stop = useCallback(
    (commit: boolean, value: string) => {
      setEditing(false)
      if (!commit || cancelled.current) {
        /* Left standing until the cell is opened again, so the blur that follows
           an Escape lands here too rather than committing behind it. */
        cancelled.current = true
        setValue(`${path}.amount`, before.current, { shouldDirty: false })
        return
      }
      const typed = value.trim()

      /* A cleared cell isn't "nothing" — it's "go back to the configuration",
         which is the only way out of an override that doesn't need a reload. */
      if (typed === '') {
        setValue(`${path}.overridden`, false, { shouldDirty: true })
        setValue(`${path}.amount`, before.current, { shouldDirty: true })
        return
      }

      /* Opening a cell and leaving it alone is not an override. Tabbing through a
         row, or double-clicking to read a figure and pressing Enter, would
         otherwise pin every head it passed — and a head pinned by accident stops
         following the days without anything on screen having changed. Only a
         figure that is actually different pins it; one already pinned stays so. */
      if (typed === before.current.trim()) return

      setValue(`${path}.overridden`, true, { shouldDirty: true })
    },
    [path, setValue],
  )

  if (editing) {
    return (
      <GridAmountInput
        autoFocus
        className="text-center"
        {...field}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => {
          void field.onBlur(event)
          stop(true, event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            cancelled.current = true
            stop(false, before.current)
          }
        }}
      />
    )
  }

  const basis = overridden
    ? { label: 'Fixed', tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' }
    : config?.valueType === 'Percentage'
      ? {
          label: `${gridAmount(config.value)}%`,
          tone: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
        }
      : {
          label: fallbackBasis ?? `₹${gridAmount(config?.value ?? amount)}`,
          tone: 'bg-muted text-muted-foreground',
        }

  return (
    <CellTooltip
      label={
        disabled
          ? 'This month is paid — its figures are frozen'
          : overridden
            ? 'Typed by hand, so it no longer follows what was deciding it. Double-click to change it, or clear it to hand it back.'
            : config?.valueType === 'Percentage'
              ? `${gridAmount(config.value)}% of the earned basic — follows the present days. Double-click to set a fixed amount.`
              : (hint ??
                'A fixed amount from the designation. Double-click to change it for this row.')
      }
    >
      <button
        type="button"
        tabIndex={disabled ? -1 : 0}
        onDoubleClick={() => {
          if (disabled) return
          before.current = String(amount)
          cancelled.current = false
          /* The cell shows the *computed* figure while the form still holds the
             one it was seeded with, so the input has to open on what was on
             screen — otherwise a double-click would silently revert it. */
          setValue(`${path}.amount`, String(amount), { shouldDirty: false })
          setEditing(true)
        }}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key !== 'Enter' && event.key !== 'F2') return
          event.preventDefault()
          before.current = String(amount)
          cancelled.current = false
          setValue(`${path}.amount`, String(amount), { shouldDirty: false })
          setEditing(true)
        }}
        className={cn(
          'flex w-full flex-col items-center gap-0.5 rounded px-1 py-0.5 text-center leading-tight',
          disabled
            ? 'cursor-not-allowed'
            : 'cursor-cell hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
        )}
      >
        <span
          className={cn(
            'block tabular-nums',
            overridden ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-foreground',
          )}
        >
          {formatAmount(amount)}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold leading-tight',
            basis.tone,
          )}
        >
          {overridden && <Pencil className="size-2" />}
          {basis.label}
        </span>
      </button>
    </CellTooltip>
  )
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
  const amount = (
    <span
      className={cn(
        'block tabular-nums',
        stale && 'text-muted-foreground/60 line-through decoration-muted-foreground/40',
        className,
      )}
    >
      {formatAmount(value)}
    </span>
  )

  // Only a stale figure has anything to explain — a settled one is just a number.
  return stale ? (
    <CellTooltip label="Computed by the server for the days it had — it settles when this row is saved and the register reloaded">
      {amount}
    </CellTooltip>
  ) : (
    amount
  )
}

/* ── Grand total ────────────────────────────────────────────────────────── */

/**
 * The page's grand total, pinned to the bottom of the scrollport.
 *
 * It sums the page **as it currently reads** — an edited row at what its cells
 * now come to, every other at what the register answered — so the footer says
 * what saving this page would write rather than what it used to be worth.
 *
 * It watches the whole form, which is exactly the subscription the rows are
 * careful not to take. That's affordable only because it is one component: a
 * keystroke re-renders this row and this footer, and nothing else on the grid.
 */
const GridFoot = memo(function GridFoot({
  layout,
  rows,
  control,
  headConfigs,
  statutoryIds,
  rates,
  periodMonth,
  dirtyRows,
}: {
  layout: GridLayout
  rows: SalaryRegisterRow[]
  control: Ctl
  headConfigs: SalaryHeadConfigs
  statutoryIds: StatutoryComponentIds
  rates: SalaryRates
  periodMonth: number
  dirtyRows: Set<number>
}) {
  const values = useWatch({ control, name: 'rows' })

  const totals = useMemo(
    () =>
      salaryColumnTotals(
        rows.map((row, index) =>
          rowFigures(
            row,
            values?.[index],
            headConfigs,
            statutoryIds,
            liveRow(row, dirtyRows.has(index)),
            rates,
            periodMonth,
          ),
        ),
      ),
    [rows, values, headConfigs, statutoryIds, rates, periodMonth, dirtyRows],
  )

  if (rows.length === 0) return null

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
              column.kind === 'employee' ? 'text-left' : 'text-center',
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
