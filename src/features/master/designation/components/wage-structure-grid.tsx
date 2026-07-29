import { memo, useLayoutEffect, useRef, useState } from 'react'
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CalendarDays, Trash2, UserPen } from 'lucide-react'
import { MonthPicker } from '@/components/ui/month-picker'
import { cn } from '@/lib/utils'
import {
  WAGE_ACT_TYPE_OPTIONS,
  WAGE_ALLOWANCE_HEADS,
  WAGE_DEDUCTION_HEADS,
  WAGE_ESIC_DEDUCTION_BASIS_OPTIONS,
  WAGE_OVERTIME_CALCULATION_OPTIONS,
  WAGE_SALARY_TYPE_OPTIONS,
  WAGE_WEEKLY_OFF_OPTIONS,
  WORKING_DAY_CALCULATION_OPTIONS,
} from '../constants'
import { formatMonth } from '../lib/effective-month'
import { deriveOvertimeRate, deriveWages } from '../lib/wage-structure-calculations'
import type { WageStructureFormValues } from '../schemas'
import type { DesignationWageStructure } from '../types'
import type { useDesignationWageForm } from '../hooks/use-designation-wage-form'
import {
  ActMarkerButton,
  CellTooltip,
  ColumnHint,
  GridAmountInput,
  GridInput,
  GridSelect,
  GridSwitch,
  ReadAmount,
  ReadBoolean,
  ReadChoice,
  ReadText,
  TogglePill,
  UnitAmountField,
} from './wage-grid-fields'

type WageForm = ReturnType<typeof useDesignationWageForm>
type Ctl = Control<WageStructureFormValues>
type Reg = UseFormRegister<WageStructureFormValues>

/** Height of a saved row. Fixed, so the virtualiser never has to measure one. */
const SAVED_ROW_HEIGHT = 52

/**
 * Height of the banner (group) header row, and where the column header row pins
 * beneath it. Both come from this one constant and the banner's height is set
 * explicitly, so the two can't drift apart — left to the row's natural height,
 * any mismatch opens a seam between them that scrolling rows show through.
 * The column row tucks a pixel under the banner to swallow sub-pixel rounding.
 */
const BANNER_HEIGHT = 34
const COLUMN_ROW_TOP = BANNER_HEIGHT - 1

/* ── Column model ───────────────────────────────────────────────────────── */

type WageGroup =
  | 'workingDays'
  | 'allowances'
  | 'overtime'
  | 'deductions'
  | 'pf'
  | 'esic'
  | 'pt'
  | 'lwf'

interface WageColumn {
  key: string
  label: string
  /** Banner the column sits under; ungrouped columns stand on their own. */
  group?: WageGroup
  /** Exact width in px — the table is fixed-layout, so nothing is measured. */
  width: number
  hint?: string
  /**
   * For an allowance / deduction column, which head it is and where that head
   * sits in the row's field array. Resolved once here rather than parsed out of
   * the key per cell — at forty columns times the rows on screen, that lookup
   * was running a thousand times per scroll step.
   */
  head?: { kind: 'allowance' | 'deduction'; at: number }
}

const GROUP_META: Record<WageGroup, { label: string; tone: string; hint: string }> = {
  workingDays: {
    label: 'Working Days Config',
    tone: 'text-primary',
    hint: 'How the month’s paid working days are arrived at.',
  },
  allowances: {
    label: 'Allowances',
    tone: 'text-teal-600 dark:text-teal-400',
    hint: 'Each head takes a percentage of basic pay or a flat amount, plus the acts it counts towards. Left blank, the head does not apply.',
  },
  overtime: {
    label: 'Overtime',
    tone: 'text-emerald-600 dark:text-emerald-400',
    hint: 'On “Auto” the hourly rate is derived from the wage per day at double time; on “Manual” it is entered here.',
  },
  deductions: {
    label: 'Deductions',
    tone: 'text-rose-600 dark:text-rose-400',
    hint: 'Recurring deductions applied on top of the statutory ones.',
  },
  pf: {
    label: 'PF Act',
    tone: 'text-sky-600 dark:text-sky-400',
    hint: 'Provident fund — the employee share and whether either contribution is capped at the statutory wage limit.',
  },
  esic: {
    label: 'ESIC',
    tone: 'text-emerald-600 dark:text-emerald-400',
    hint: 'Employee state insurance, and what the contribution is worked out on.',
  },
  pt: {
    label: 'PT',
    tone: 'text-violet-600 dark:text-violet-400',
    hint: 'Professional tax — from the act’s slab, or a fixed amount.',
  },
  lwf: {
    label: 'LWF',
    tone: 'text-amber-600 dark:text-amber-400',
    hint: 'Labour welfare fund — from the act’s rate, or a fixed amount.',
  },
}

/**
 * Every column of the grid, in order. The header rows and both row renderers all
 * walk this one list, so a column can never appear in one and not the other.
 *
 * A column under a banner gets one header row, so its label has to fit on one
 * line and its width is set accordingly. A column with no banner spans both
 * header rows instead, so its label is free to wrap over two lines — which is
 * why these are the narrower ones despite some having the longest names.
 */
const COLUMNS: WageColumn[] = [
  { key: 'effectiveFrom', label: 'Effective From', width: 178 },

  {
    key: 'calcType',
    label: 'Calc Type',
    group: 'workingDays',
    width: 128,
    hint: '“Fixed” pins the paid days; “As Per Calculation” derives them from the weekly off.',
  },
  { key: 'weeklyOff', label: 'Weekly Off', group: 'workingDays', width: 128 },
  {
    key: 'workingDays',
    label: 'W. Days',
    group: 'workingDays',
    width: 96,
    hint: 'Paid working days in the month — asked only when the calc type is “Fixed”.',
  },

  {
    key: 'salaryType',
    label: 'Salary Type',
    width: 118,
    hint: 'Whether the wage is quoted per month or per day. The other figure is derived.',
  },
  {
    key: 'basicPay',
    label: 'Basic Pay',
    width: 100,
    hint: 'Captured on a monthly wage; on a daily one it is the wage per day carried over the 26 statutory paid days, and disabled.',
  },
  {
    key: 'wagePerDay',
    label: 'Wage/Day (₹)',
    width: 126,
    hint: 'Captured on a daily wage; on a monthly one it is the basic spread over the 26 statutory paid days, and disabled.',
  },
  {
    key: 'extraDay',
    label: 'Extra Day Amount (₹)',
    width: 116,
    hint: 'Paid for each day worked beyond the row’s working days.',
  },

  /*
   * Wider than a plain amount column: each of these carries the PF / ESI / PT
   * markers under its input, and those three share the cell's width evenly, so
   * the column has to be wide enough for the longest label ("ESI") plus its
   * border to sit in a third of it without wrapping.
   */
  ...WAGE_ALLOWANCE_HEADS.map((head, at) => ({
    key: `allowance:${head.code}`,
    label: head.code,
    group: 'allowances' as const,
    width: 148,
    hint: head.label,
    head: { kind: 'allowance' as const, at },
  })),

  {
    key: 'ot',
    label: 'OT',
    group: 'overtime',
    width: 62,
    hint: 'Whether overtime is paid at all.',
  },
  { key: 'otCalcType', label: 'Calc Type', group: 'overtime', width: 102 },
  {
    key: 'otRate',
    label: 'Rate/Hr (₹)',
    group: 'overtime',
    width: 124,
    hint: 'Derived on “Auto”, entered on “Manual”.',
  },

  ...WAGE_DEDUCTION_HEADS.map((head, at) => ({
    key: `deduction:${head.code}`,
    label: head.code,
    group: 'deductions' as const,
    width: 106,
    hint: head.label,
    head: { kind: 'deduction' as const, at },
  })),

  { key: 'pf', label: 'PF', group: 'pf', width: 62, hint: 'PF act applicable.' },
  {
    key: 'empWl',
    label: 'Emp WL',
    group: 'pf',
    width: 86,
    hint: 'Cap the employee share at the statutory wage limit.',
  },
  {
    key: 'emprWl',
    label: 'Empr WL',
    group: 'pf',
    width: 90,
    hint: 'Cap the employer share at the statutory wage limit.',
  },
  {
    key: 'pfAmt',
    label: 'PF Amt',
    group: 'pf',
    width: 106,
    hint: 'The employee share, as a percentage of EPF wages or a flat amount.',
  },

  { key: 'esic', label: 'ESIC', group: 'esic', width: 66, hint: 'ESIC act applicable.' },
  {
    key: 'esicDedOn',
    label: 'Ded. On',
    group: 'esic',
    width: 158,
    hint: 'What the ESIC contribution is calculated on.',
  },

  { key: 'pt', label: 'PT', group: 'pt', width: 62, hint: 'PT act applicable.' },
  { key: 'ptType', label: 'Type', group: 'pt', width: 92 },
  {
    key: 'ptAmt',
    label: 'Amt (₹)',
    group: 'pt',
    width: 94,
    hint: 'Asked only when the type is “Manual”.',
  },

  { key: 'lwf', label: 'LWF', group: 'lwf', width: 66, hint: 'LWF act applicable.' },
  { key: 'lwfType', label: 'Type', group: 'lwf', width: 92 },
  {
    key: 'lwfAmt',
    label: 'Amt (₹)',
    group: 'lwf',
    width: 94,
    hint: 'Asked only when the type is “Manual”.',
  },

  { key: 'delete', label: 'Delete', width: 64 },
]

const TOTAL_WIDTH = COLUMNS.reduce((sum, column) => sum + column.width, 0)

/**
 * One cell of the top header row: either a banner spanning the columns beneath
 * it, or a column with no banner, which spans both header rows instead of
 * leaving a blank cell above itself.
 */
type HeaderCell =
  | { kind: 'group'; group: WageGroup; span: number }
  | { kind: 'single'; column: WageColumn }

const HEADER_CELLS: HeaderCell[] = COLUMNS.reduce<HeaderCell[]>((cells, column) => {
  if (!column.group) {
    cells.push({ kind: 'single', column })
    return cells
  }
  const last = cells[cells.length - 1]
  if (last?.kind === 'group' && last.group === column.group) {
    last.span += 1
    return cells
  }
  cells.push({ kind: 'group', group: column.group, span: 1 })
  return cells
}, [])

/** Only banner-owned columns need a cell in the second header row. */
const SUB_COLUMNS = COLUMNS.filter((column) => column.group)

/** Shared cell frame for every header and body cell. */
const CELL = 'border-b border-r border-border px-2 py-1.5 align-middle'

/*
 * The pinned effective-from column. Its background is opaque and flat — see the
 * `.wage-*` rules in globals.css. Anything translucent here has to be re-blended
 * against the cells scrolling underneath it on every frame.
 */
const STICKY = 'wage-sticky sticky left-0 z-10'

/* ── The grid ───────────────────────────────────────────────────────────── */

/**
 * The wage structure history as one wide grid: the draft rows being added on top,
 * every saved row read-only beneath. Forty columns across seven banners, so it
 * scrolls both ways with the header and the effective-from column pinned.
 *
 * Built to stay smooth with a long history and while typing:
 *
 * - **Saved rows are virtualised** — only the ones in view are in the DOM, so a
 *   thousand rows cost about what ten do. Each is memoised on its record, so
 *   scrolling re-renders only the rows entering the window.
 * - **Draft rows are memoised on stable props**, so scrolling the history below
 *   doesn't re-render the editable rows either.
 * - **Nothing subscribes to the whole form.** Amount inputs are uncontrolled
 *   (`register`), and a cell that reacts to another cell — a derived wage, a
 *   setting behind an act toggle — watches only that one field. A keystroke
 *   repaints a cell or two, never the table.
 * - **The table is fixed-layout** off an explicit `<colgroup>`, so the browser
 *   never measures cell content to decide column widths.
 */
export function WageStructureGrid({ form }: { form: WageForm }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const savedBodyRef = useRef<HTMLTableSectionElement>(null)

  /*
   * Where the saved rows begin inside the scrollport — below the header and the
   * draft rows. The header is a fixed height and the table a fixed width, so the
   * only thing that moves it is a draft row being added or removed.
   */
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    const next = savedBodyRef.current?.offsetTop ?? 0
    setScrollMargin((current) => (current === next ? current : next))
  }, [form.fields.length])

  const virtualizer = useVirtualizer({
    count: form.existing.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => SAVED_ROW_HEIGHT,
    overscan: 12,
    scrollMargin,
  })

  const items = virtualizer.getVirtualItems()
  /*
   * Spacer rows stand in for the rows outside the window, holding the scrollbar
   * at its full length without their cells existing. Virtual offsets include the
   * scroll margin, so it comes back off here.
   */
  const paddingTop = items.length > 0 ? items[0].start - scrollMargin : 0
  const paddingBottom =
    items.length > 0
      ? virtualizer.getTotalSize() - (items[items.length - 1].end - scrollMargin)
      : 0

  return (
    <div
      ref={scrollRef}
      /* No border or rounding of its own: it sits flush between the card's
         header and footer, which already frame it. */
      className="relative max-h-136 overflow-auto"
    >
      <table
        className="table-fixed border-separate border-spacing-0 text-xs"
        style={{ width: TOTAL_WIDTH }}
      >
        <GridHead />

        {/* Draft rows — the only editable ones; history is append-only. */}
        <tbody>
          {form.fields.map((field, index) => (
            <DraftRow
              key={field.id}
              index={index}
              control={form.control}
              register={form.register}
              monthBounds={form.monthBounds}
              takenMonths={form.takenMonths}
              onRemove={form.removeRow}
              changeSalaryType={form.changeSalaryType}
              changeWorkingDayCalculationType={form.changeWorkingDayCalculationType}
            />
          ))}
        </tbody>

        <tbody ref={savedBodyRef}>
          {form.historyLoading && <StatusRow>Loading wage structure history…</StatusRow>}
          {form.historyError && (
            <StatusRow tone="text-destructive">
              Couldn’t load the wage structure history.
            </StatusRow>
          )}

          {paddingTop > 0 && <SpacerRow height={paddingTop} />}
          {items.map((item) => (
            <SavedRow
              key={form.existing[item.index].id}
              row={form.existing[item.index]}
            />
          ))}
          {paddingBottom > 0 && <SpacerRow height={paddingBottom} />}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The column layout and the two header rows. Static, so it's memoised with no
 * props and renders exactly once — the virtualiser re-renders the grid on every
 * scroll frame, and rebuilding eighty header cells each time was most of the
 * cost of a scroll.
 *
 * Note there's no `backdrop-blur` on these: a blurred sticky header has to
 * re-filter everything scrolling beneath it every frame, which is the single
 * most expensive thing you can put on a pinned row. The background is flat and
 * opaque instead.
 */
const GridHead = memo(function GridHead() {
  return (
    <>
      {/* Fixed layout lays the grid out from these widths rather than by
          measuring cells — which is what keeps a table this wide cheap. */}
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.key} style={{ width: column.width }} />
        ))}
      </colgroup>

      <thead>
        {/* Banners, and any column that has none — those span both rows. */}
        <tr>
          {HEADER_CELLS.map((cell, index) => {
            const pinned = index === 0 && 'left-0 z-50'

            if (cell.kind === 'single') {
              return (
                <th
                  key={cell.column.key}
                  rowSpan={2}
                  className={cn(
                    'wage-head-cell sticky top-0 z-40 border-b border-r border-border px-2 py-2 text-center align-middle text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground',
                    pinned,
                  )}
                >
                  {cell.column.label}
                  {cell.column.hint && <ColumnHint text={cell.column.hint} />}
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
                  'wage-head-cell sticky top-0 z-40 whitespace-nowrap border-b border-r border-border px-2 text-center text-[11px] font-bold uppercase leading-none tracking-wide',
                  meta.tone,
                  pinned,
                )}
              >
                {meta.label}
                <ColumnHint text={meta.hint} />
              </th>
            )
          })}
        </tr>

        {/* Sub-columns of each banner. */}
        <tr>
          {SUB_COLUMNS.map((column) => (
            <th
              key={column.key}
              style={{ top: COLUMN_ROW_TOP }}
              className={cn(
                CELL,
                'wage-head-cell sticky z-30 whitespace-nowrap text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
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

/** A row spanning the grid, for a loading or error message. */
function StatusRow({ children, tone }: { children: string; tone?: string }) {
  return (
    <tr>
      <td
        colSpan={COLUMNS.length}
        className={cn(
          'border-b border-border px-3 py-6 text-center text-xs text-muted-foreground',
          tone,
        )}
      >
        {children}
      </td>
    </tr>
  )
}

/** Holds the scroll height of the rows outside the virtual window. */
function SpacerRow({ height }: { height: number }) {
  return (
    <tr aria-hidden>
      <td colSpan={COLUMNS.length} style={{ height, padding: 0, border: 0 }} />
    </tr>
  )
}

/* ── Draft rows ─────────────────────────────────────────────────────────── */

interface DraftRowProps {
  index: number
  control: Ctl
  register: Reg
  monthBounds: WageForm['monthBounds']
  takenMonths: Set<string>
  onRemove: (index: number) => void
  changeSalaryType: (index: number, value: 'Daily' | 'Monthly') => void
  changeWorkingDayCalculationType: (index: number, value: string) => void
}

/**
 * One row being drafted. Memoised on props that are all stable — the callbacks
 * come back from the hook via `useCallback` — so scrolling the saved history
 * below never re-renders the editable rows.
 */
const DraftRow = memo(function DraftRow(props: DraftRowProps) {
  return (
    <tr className="wage-row-draft">
      {COLUMNS.map((column, columnIndex) => (
        <td
          key={column.key}
          className={cn(CELL, columnIndex === 0 && STICKY)}
        >
          <DraftCell column={column} {...props} />
        </td>
      ))}
    </tr>
  )
})

/** One cell of a draft row. */
function DraftCell({ column, ...props }: DraftRowProps & { column: WageColumn }) {
  const { index, control, register } = props

  if (column.head) {
    const { kind, at } = column.head
    return kind === 'allowance' ? (
      <AllowanceCell index={index} at={at} control={control} register={register} />
    ) : (
      <DeductionCell index={index} at={at} control={control} register={register} />
    )
  }

  switch (column.key) {
    case 'effectiveFrom':
      return (
        <Controller
          control={control}
          name={`rows.${index}.effectiveFrom`}
          render={({ field, fieldState }) => (
            <div className="space-y-0.5">
              <MonthPicker
                size="sm"
                invalid={!!fieldState.error}
                value={field.value}
                onChange={field.onChange}
                minDate={props.monthBounds.minDate}
                maxDate={props.monthBounds.maxDate}
              />
              {field.value && props.takenMonths.has(field.value) && (
                <p className="text-[10px] leading-tight text-amber-600 dark:text-amber-400">
                  Supersedes the existing row for this month
                </p>
              )}
            </div>
          )}
        />
      )

    case 'calcType':
      return (
        <Controller
          control={control}
          name={`rows.${index}.workingDayCalculationType`}
          render={({ field }) => (
            <GridSelect
              value={field.value}
              onChange={(value) => props.changeWorkingDayCalculationType(index, value)}
              options={WORKING_DAY_CALCULATION_OPTIONS}
              placeholder="Select"
            />
          )}
        />
      )

    case 'weeklyOff':
      return (
        <Controller
          control={control}
          name={`rows.${index}.weeklyOff`}
          render={({ field }) => (
            <GridSelect
              value={field.value}
              onChange={field.onChange}
              options={WAGE_WEEKLY_OFF_OPTIONS}
              placeholder="Select"
            />
          )}
        />
      )

    case 'workingDays':
      return <WorkingDaysCell index={index} control={control} register={register} />

    case 'salaryType':
      return (
        <Controller
          control={control}
          name={`rows.${index}.salaryType`}
          render={({ field }) => (
            <TogglePill
              value={field.value}
              options={WAGE_SALARY_TYPE_OPTIONS}
              onChange={(value) =>
                props.changeSalaryType(index, value as 'Daily' | 'Monthly')
              }
              tone="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            />
          )}
        />
      )

    case 'basicPay':
      return <BasicPayCell index={index} control={control} register={register} />
    case 'wagePerDay':
      return <WagePerDayCell index={index} control={control} register={register} />

    case 'extraDay':
      return (
        <GridAmountInput
          placeholder="0.00"
          {...register(`rows.${index}.extraDayAmountPerDay`)}
        />
      )

    case 'ot':
      return (
        <ActSwitch
          control={control}
          name={`rows.${index}.overtimeApplicable`}
          label="Overtime applicable"
        />
      )
    case 'otCalcType':
      return <OtCalcTypeCell index={index} control={control} />
    case 'otRate':
      return <OtRateCell index={index} control={control} register={register} />

    case 'pf':
      return (
        <ActSwitch
          control={control}
          name={`rows.${index}.pfActApplicable`}
          label="PF act applicable"
        />
      )
    case 'empWl':
      return (
        <PfSwitchCell
          index={index}
          control={control}
          name={`rows.${index}.employeePfContributionOnWageLimit`}
          label="Employee PF contribution on wage limit"
        />
      )
    case 'emprWl':
      return (
        <PfSwitchCell
          index={index}
          control={control}
          name={`rows.${index}.employerPfContributionOnWageLimit`}
          label="Employer PF contribution on wage limit"
        />
      )
    case 'pfAmt':
      return <PfAmountCell index={index} control={control} register={register} />

    case 'esic':
      return (
        <ActSwitch
          control={control}
          name={`rows.${index}.esicActApplicable`}
          label="ESIC act applicable"
        />
      )
    case 'esicDedOn':
      return <EsicBasisCell index={index} control={control} />

    case 'pt':
      return (
        <ActSwitch
          control={control}
          name={`rows.${index}.ptActApplicable`}
          label="PT act applicable"
        />
      )
    case 'ptType':
      return (
        <ActTypeCell
          index={index}
          control={control}
          appliesTo="ptActApplicable"
          name={`rows.${index}.ptActType`}
          tone="border-violet-500/30 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-400"
        />
      )
    case 'ptAmt':
      return (
        <ActAmountCell
          index={index}
          control={control}
          register={register}
          appliesTo="ptActApplicable"
          typeField="ptActType"
          amountName={`rows.${index}.ptAmount`}
        />
      )

    case 'lwf':
      return (
        <ActSwitch
          control={control}
          name={`rows.${index}.lwfActApplicable`}
          label="LWF act applicable"
        />
      )
    case 'lwfType':
      return (
        <ActTypeCell
          index={index}
          control={control}
          appliesTo="lwfActApplicable"
          name={`rows.${index}.lwfActType`}
          tone="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
        />
      )
    case 'lwfAmt':
      return (
        <ActAmountCell
          index={index}
          control={control}
          register={register}
          appliesTo="lwfActApplicable"
          typeField="lwfActType"
          amountName={`rows.${index}.lwfAmount`}
        />
      )

    case 'delete':
      return (
        <CellTooltip label="Remove this row">
          <button
            type="button"
            onClick={() => props.onRemove(index)}
            aria-label="Remove this row"
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </CellTooltip>
      )

    default:
      return null
  }
}

/* ── Cells that depend on another field ─────────────────────────────────── */
/*
 * Each of these is its own component purely so its `useWatch` subscription is
 * its own. Hoist the same watches onto the row and every keystroke would
 * re-render forty cells instead of one.
 */

interface CellProps {
  index: number
  control: Ctl
  register: Reg
}

/** A plain act toggle — nothing to watch, so it renders on its own value only. */
function ActSwitch({
  control,
  name,
  label,
}: {
  control: Ctl
  name:
    | `rows.${number}.overtimeApplicable`
    | `rows.${number}.pfActApplicable`
    | `rows.${number}.esicActApplicable`
    | `rows.${number}.ptActApplicable`
    | `rows.${number}.lwfActApplicable`
  label: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <GridSwitch checked={field.value} onCheckedChange={field.onChange} label={label} />
      )}
    />
  )
}

function WorkingDaysCell({ index, control, register }: CellProps) {
  const calcType = useWatch({ control, name: `rows.${index}.workingDayCalculationType` })
  return (
    <GridAmountInput
      inputMode="numeric"
      placeholder="0"
      disabled={calcType !== 'Fixed'}
      {...register(`rows.${index}.workingDays`)}
    />
  )
}

/**
 * The monthly basic. Captured on a monthly wage and flagged when it's missing;
 * on a daily wage it's derived from the wage per day and sits disabled.
 */
function BasicPayCell({ index, control, register }: CellProps) {
  const salaryType = useWatch({ control, name: `rows.${index}.salaryType` })
  const wagePerDay = useWatch({ control, name: `rows.${index}.wagePerDay` })
  const invalid = useFieldInvalid(control, index, 'basicPay')

  if (salaryType === 'Daily') {
    return <DerivedAmount value={deriveWages({ salaryType, basicPay: '', wagePerDay }).basicPay} />
  }
  return (
    <GridAmountInput
      placeholder="0.00"
      aria-invalid={invalid}
      {...register(`rows.${index}.basicPay`)}
    />
  )
}

/**
 * The daily wage. Captured on a daily wage and flagged when it's missing; on a
 * monthly wage it's the basic spread over the paid days, and sits disabled.
 */
function WagePerDayCell({ index, control, register }: CellProps) {
  const salaryType = useWatch({ control, name: `rows.${index}.salaryType` })
  const basicPay = useWatch({ control, name: `rows.${index}.basicPay` })
  const invalid = useFieldInvalid(control, index, 'wagePerDay')

  if (salaryType === 'Monthly') {
    return (
      <DerivedAmount value={deriveWages({ salaryType, basicPay, wagePerDay: '' }).wagePerDay} />
    )
  }
  return (
    <GridAmountInput
      placeholder="0.00"
      aria-invalid={invalid}
      {...register(`rows.${index}.wagePerDay`)}
    />
  )
}

/**
 * Whether one field of one row is currently in error. Scoped to that field, so
 * the cell re-renders when its error appears or clears rather than on every
 * keystroke — the inputs stay uncontrolled.
 */
function useFieldInvalid(
  control: Ctl,
  index: number,
  field: 'basicPay' | 'wagePerDay',
): boolean {
  const { errors } = useFormState({ control, name: `rows.${index}.${field}` })
  return Boolean(errors.rows?.[index]?.[field])
}

function OtCalcTypeCell({ index, control }: { index: number; control: Ctl }) {
  const applicable = useWatch({ control, name: `rows.${index}.overtimeApplicable` })
  return (
    <Controller
      control={control}
      name={`rows.${index}.overtimeCalculationType`}
      render={({ field }) => (
        <TogglePill
          value={field.value}
          options={WAGE_OVERTIME_CALCULATION_OPTIONS}
          onChange={field.onChange}
          disabled={!applicable}
          tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
        />
      )}
    />
  )
}

function OtRateCell({ index, control, register }: CellProps) {
  const applicable = useWatch({ control, name: `rows.${index}.overtimeApplicable` })
  const calcType = useWatch({ control, name: `rows.${index}.overtimeCalculationType` })
  const salaryType = useWatch({ control, name: `rows.${index}.salaryType` })
  const basicPay = useWatch({ control, name: `rows.${index}.basicPay` })
  const wagePerDay = useWatch({ control, name: `rows.${index}.wagePerDay` })

  if (!applicable) return <DerivedValue value={null} />
  if (calcType === 'Manual') {
    return (
      <GridAmountInput
        placeholder="0.00"
        {...register(`rows.${index}.overtimeRatePerHour`)}
      />
    )
  }
  return (
    <DerivedAmount
      value={deriveOvertimeRate({
        salaryType,
        basicPay,
        wagePerDay,
        overtimeApplicable: applicable,
        overtimeCalculationType: calcType,
        overtimeRatePerHour: '',
      })}
    />
  )
}

function PfSwitchCell({
  index,
  control,
  name,
  label,
}: {
  index: number
  control: Ctl
  name:
    | `rows.${number}.employeePfContributionOnWageLimit`
    | `rows.${number}.employerPfContributionOnWageLimit`
  label: string
}) {
  const applicable = useWatch({ control, name: `rows.${index}.pfActApplicable` })
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <GridSwitch
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={!applicable}
          label={label}
        />
      )}
    />
  )
}

function PfAmountCell({ index, control, register }: CellProps) {
  const applicable = useWatch({ control, name: `rows.${index}.pfActApplicable` })
  return (
    <Controller
      control={control}
      name={`rows.${index}.pfValueType`}
      render={({ field }) => (
        <UnitAmountField
          valueType={field.value}
          onValueTypeChange={field.onChange}
          disabled={!applicable}
        >
          <GridInput
            placeholder="12"
            disabled={!applicable}
            {...register(`rows.${index}.pfValue`)}
          />
        </UnitAmountField>
      )}
    />
  )
}

function EsicBasisCell({ index, control }: { index: number; control: Ctl }) {
  const applicable = useWatch({ control, name: `rows.${index}.esicActApplicable` })
  return (
    <Controller
      control={control}
      name={`rows.${index}.esicDeductionBasis`}
      render={({ field }) => (
        <GridSelect
          value={field.value}
          onChange={field.onChange}
          options={WAGE_ESIC_DEDUCTION_BASIS_OPTIONS}
          placeholder="Select…"
          disabled={!applicable}
        />
      )}
    />
  )
}

function ActTypeCell({
  index,
  control,
  appliesTo,
  name,
  tone,
}: {
  index: number
  control: Ctl
  appliesTo: 'ptActApplicable' | 'lwfActApplicable'
  name: `rows.${number}.ptActType` | `rows.${number}.lwfActType`
  tone: string
}) {
  const applicable = useWatch({ control, name: `rows.${index}.${appliesTo}` })
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TogglePill
          value={field.value}
          options={WAGE_ACT_TYPE_OPTIONS}
          onChange={field.onChange}
          disabled={!applicable}
          tone={tone}
        />
      )}
    />
  )
}

/** A statutory amount, asked for only when its act is on and set to "Manual". */
function ActAmountCell({
  index,
  control,
  register,
  appliesTo,
  typeField,
  amountName,
}: CellProps & {
  appliesTo: 'ptActApplicable' | 'lwfActApplicable'
  typeField: 'ptActType' | 'lwfActType'
  amountName: `rows.${number}.ptAmount` | `rows.${number}.lwfAmount`
}) {
  const applicable = useWatch({ control, name: `rows.${index}.${appliesTo}` })
  const actType = useWatch({ control, name: `rows.${index}.${typeField}` })

  if (!applicable || actType !== 'Manual') return <DerivedValue value={null} />
  return <GridAmountInput placeholder="0.00" {...register(amountName)} />
}

/** One allowance head in a draft row — its value, then the acts it counts to. */
function AllowanceCell({ index, at, control, register }: CellProps & { at: number }) {
  return (
    <div className="space-y-1">
      <Controller
        control={control}
        name={`rows.${index}.allowances.${at}.valueType`}
        render={({ field }) => (
          <UnitAmountField valueType={field.value} onValueTypeChange={field.onChange}>
            <GridInput
              placeholder="0"
              {...register(`rows.${index}.allowances.${at}.amount`)}
            />
          </UnitAmountField>
        )}
      />

      <div className="flex items-center gap-1">
        <AllowanceMarker
          control={control}
          label="PF"
          name={`rows.${index}.allowances.${at}.pfApplicable`}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
        <AllowanceMarker
          control={control}
          label="ESI"
          name={`rows.${index}.allowances.${at}.esicApplicable`}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
        <AllowanceMarker
          control={control}
          label="PT"
          name={`rows.${index}.allowances.${at}.ptApplicable`}
          tone="bg-violet-500/15 text-violet-700 dark:text-violet-400"
        />
      </div>
    </div>
  )
}

/**
 * Whether one allowance counts towards one act. Always enabled, so it needs no
 * dependency on the row's act toggles — which also drops three subscriptions per
 * allowance cell, thirty per row.
 */
function AllowanceMarker({
  control,
  label,
  name,
  tone,
}: {
  control: Ctl
  label: string
  name:
    | `rows.${number}.allowances.${number}.pfApplicable`
    | `rows.${number}.allowances.${number}.esicApplicable`
    | `rows.${number}.allowances.${number}.ptApplicable`
  tone: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ActMarkerButton
          label={label}
          checked={field.value}
          onCheckedChange={field.onChange}
          tone={tone}
        />
      )}
    />
  )
}

/** One deduction head in a draft row — a value and the unit it's in. */
function DeductionCell({ index, at, control, register }: CellProps & { at: number }) {
  return (
    <Controller
      control={control}
      name={`rows.${index}.deductions.${at}.valueType`}
      render={({ field }) => (
        <UnitAmountField valueType={field.value} onValueTypeChange={field.onChange}>
          <GridInput
            placeholder="0.00"
            {...register(`rows.${index}.deductions.${at}.amount`)}
          />
        </UnitAmountField>
      )}
    />
  )
}

/**
 * A figure derived from another cell. Rendered as a disabled input rather than
 * plain text, so the column still reads as the same kind of field down the grid
 * and it's obvious the value isn't yours to type.
 */
function DerivedAmount({ value }: { value: number | null }) {
  return (
    <GridAmountInput
      readOnly
      tabIndex={-1}
      placeholder="—"
      value={value === null ? '' : round2(value)}
      className="border-dashed bg-muted/50 text-muted-foreground"
    />
  )
}

/**
 * A figure the row rules out altogether — an act switched off, a statutory
 * amount that follows the act's own rate. Nothing to show and nothing to derive.
 */
function DerivedValue({ value }: { value: number | null }) {
  return (
    <span className="flex h-7 items-center justify-end pr-1 text-xs text-muted-foreground">
      {value === null ? '—' : round2(value)}
    </span>
  )
}

/** Two decimals, without trailing zeros on whole numbers. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/* ── Saved rows ─────────────────────────────────────────────────────────── */

/**
 * One saved row. Memoised on the record, which the query keeps referentially
 * stable — so scrolling renders only the rows entering the window.
 */
const SavedRow = memo(function SavedRow({ row }: { row: DesignationWageStructure }) {
  return (
    <tr className="wage-row-saved" style={{ height: SAVED_ROW_HEIGHT }}>
      {COLUMNS.map((column, columnIndex) => (
        <td
          key={column.key}
          className={cn(CELL, columnIndex === 0 && STICKY)}
        >
          <SavedCell column={column} row={row} />
        </td>
      ))}
    </tr>
  )
})

/** One cell of a saved row — the same columns, rendered read-only. */
function SavedCell({
  column,
  row,
}: {
  column: WageColumn
  row: DesignationWageStructure
}) {
  if (column.head) {
    const { kind, at } = column.head
    const value = kind === 'allowance' ? row.allowances[at] : row.deductions[at]
    if (!value) return <ReadText value={null} />
    return <ReadAmount amount={value.amount} valueType={value.valueType} />
  }

  switch (column.key) {
    case 'effectiveFrom':
      return (
        <div className="space-y-0.5">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <CalendarDays className="size-3 shrink-0 text-primary" />
            {formatMonth(row.effectiveFrom)}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <UserPen className="size-2.5 shrink-0" />
            {row.createdBy}
          </span>
        </div>
      )

    case 'calcType':
      return <ReadText value={row.workingDayCalculationType} />
    case 'weeklyOff':
      return <ReadText value={row.weeklyOff ?? 'None'} />
    case 'workingDays':
      return <ReadText value={row.workingDays} />

    case 'salaryType':
      return <ReadChoice value={row.salaryType} tone="bg-primary/10 text-primary" />
    case 'basicPay':
      return <ReadText value={row.basicPay} />
    case 'wagePerDay':
      return <ReadText value={row.wagePerDay} />
    case 'extraDay':
      return <ReadText value={row.extraDayAmountPerDay} />

    case 'ot':
      return (
        <ReadBoolean
          value={row.overtimeApplicable}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
      )
    case 'otCalcType':
      return (
        <ReadChoice
          value={row.overtimeCalculationType}
          tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        />
      )
    case 'otRate':
      return <ReadText value={row.overtimeRatePerHour} />

    case 'pf':
      return (
        <ReadBoolean
          value={row.pfActApplicable}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
      )
    case 'empWl':
      return (
        <ReadBoolean
          value={row.employeePfContributionOnWageLimit}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
      )
    case 'emprWl':
      return (
        <ReadBoolean
          value={row.employerPfContributionOnWageLimit}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
      )
    case 'pfAmt':
      return <ReadAmount amount={row.pfValue} valueType={row.pfValueType} />

    case 'esic':
      return (
        <ReadBoolean
          value={row.esicActApplicable}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
      )
    case 'esicDedOn':
      return <ReadText value={row.esicDeductionBasis} />

    case 'pt':
      return (
        <ReadBoolean
          value={row.ptActApplicable}
          tone="bg-violet-500/15 text-violet-700 dark:text-violet-400"
        />
      )
    case 'ptType':
      return (
        <ReadChoice
          value={actTypeLabel(row.ptActType)}
          tone="bg-violet-500/10 text-violet-700 dark:text-violet-400"
        />
      )
    case 'ptAmt':
      return <ReadText value={row.ptAmount} />

    case 'lwf':
      return (
        <ReadBoolean
          value={row.lwfActApplicable}
          tone="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        />
      )
    case 'lwfType':
      return (
        <ReadChoice
          value={actTypeLabel(row.lwfActType)}
          tone="bg-amber-500/10 text-amber-700 dark:text-amber-400"
        />
      )
    case 'lwfAmt':
      return <ReadText value={row.lwfAmount} />

    case 'delete':
      /* Saved rows are never removed — history is the audit trail. */
      return <span className="text-muted-foreground/40">—</span>

    default:
      return null
  }
}

/** "As Per Act" is spelled short inside the grid's narrow act columns. */
function actTypeLabel(value: string | null): string | null {
  if (!value) return null
  return value === 'As Per Act' ? 'Act' : value
}
