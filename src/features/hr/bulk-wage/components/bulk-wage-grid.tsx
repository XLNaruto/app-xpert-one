import { memo, useMemo } from 'react'
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form'
import { Briefcase, CalendarClock, PencilLine } from 'lucide-react'
import { amountLabel, gridAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  ActMarkerButton,
  ColumnHint,
  GridAmountInput,
  GridInput,
  GridSelect,
  GridSwitch,
  TogglePill,
  UnitAmountField,
  NO_VALUE,
} from '@/components/common/wage-grid-fields'
import {
  deriveOvertimeRate,
  deriveWages,
  formatMonth,
  WAGE_ACT_TYPE_OPTIONS,
  WAGE_ESIC_DEDUCTION_BASIS_OPTIONS,
  WAGE_SALARY_TYPE_OPTIONS,
  WAGE_WEEKLY_OFF_OPTIONS,
  WORKING_DAY_CALCULATION_OPTIONS,
  type WageHeads,
} from '@/features/master/designation'
import type { BulkWageFormValues } from '../schemas'
import type { BulkWageDesignation } from '../types'

type Ctl = Control<BulkWageFormValues>
type Reg = UseFormRegister<BulkWageFormValues>

/**
 * The pinned column: which designation the row is. It stays put while the forty
 * columns of settings scroll past it, because it's the only thing that says what
 * you're looking at.
 *
 * There's no action column beside it — the screen saves as a whole, from Save
 * All, so a row has nothing of its own to be done to it.
 */
const PINNED_WIDTHS = { designation: 232 } as const

/** Height of the banner (group) header row; the column row pins beneath it. */
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
  | 'tds'
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
   * the key per cell.
   */
  head?: { kind: 'allowance' | 'deduction'; at: number }
  /** Set on a pinned column: how far from the scrollport's left edge it sits. */
  pin?: number
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
    hint: 'The hourly rate paid for overtime — entered on the row, or left blank to derive it from the wage per day at double time.',
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
  tds: {
    label: 'TDS',
    tone: 'text-rose-600 dark:text-rose-400',
    hint: 'Tax deducted at source — no slab behind it, so the row carries the rate itself.',
  },
  lwf: {
    label: 'LWF',
    tone: 'text-amber-600 dark:text-amber-400',
    hint: 'Labour welfare fund — from the act’s rate, or a fixed amount.',
  },
}

/**
 * Every column of the grid, in order — the same wage structure the designation
 * master configures one designation at a time, turned on its side: a row is a
 * designation rather than a month, and the effective month is the screen's, at
 * the top, rather than a column.
 *
 * The allowance and deduction columns are the allowance / deduction master's own
 * heads, one column per head headed by its short code, so the grid follows that
 * master rather than a list of its own.
 */
function buildColumns(heads: WageHeads): WageColumn[] {
  return [
    {
      key: 'designation',
      label: 'Designation',
      width: PINNED_WIDTHS.designation,
      pin: 0,
      hint: 'The month underneath is what this designation is paid on today. Saving replaces it when the screen’s month matches, and supersedes it otherwise.',
    },

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
      label: amountLabel('Basic Pay'),
      width: 112,
      hint: 'Captured on a monthly wage; on a daily one it is the wage per day carried over the 26 statutory paid days, and disabled.',
    },
    {
      key: 'wagePerDay',
      label: amountLabel('Wage/Day'),
      width: 126,
      hint: 'Captured on a daily wage; on a monthly one it is the basic spread over the 26 statutory paid days, and disabled.',
    },
    {
      key: 'extraDay',
      label: amountLabel('Extra Day Amount'),
      width: 116,
      hint: 'Paid for each day worked beyond the row’s working days.',
    },

    ...heads.allowances.map((head, at) => ({
      key: `allowance:${head.id}`,
      label: head.code,
      group: 'allowances' as const,
      width: 148,
      hint: head.name,
      head: { kind: 'allowance' as const, at },
    })),

    {
      key: 'ot',
      label: 'OT',
      group: 'overtime',
      width: 62,
      hint: 'Whether overtime is paid at all.',
    },
    {
      key: 'otRate',
      label: amountLabel('Rate/Hr'),
      group: 'overtime',
      width: 124,
      hint: 'Left blank, the rate derived from the wage per day is what gets saved — the empty field shows that figure.',
    },

    ...heads.deductions.map((head, at) => ({
      key: `deduction:${head.id}`,
      label: head.code,
      group: 'deductions' as const,
      width: 106,
      hint: head.name,
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
      label: amountLabel('Amt'),
      group: 'pt',
      width: 94,
      hint: 'Asked only when the type is “Manual”.',
    },

    /* PF · ESIC · PT · TDS · LWF — the order payroll reads the acts in. */
    { key: 'tds', label: 'TDS', group: 'tds', width: 66, hint: 'TDS act applicable.' },
    {
      key: 'tdsPct',
      label: 'Rate %',
      group: 'tds',
      width: 94,
      hint: 'The rate deducted from gross pay — asked only while the act is on.',
    },

    { key: 'lwf', label: 'LWF', group: 'lwf', width: 66, hint: 'LWF act applicable.' },
    { key: 'lwfType', label: 'Type', group: 'lwf', width: 92 },
    {
      key: 'lwfAmt',
      label: amountLabel('Amt'),
      group: 'lwf',
      width: 94,
      hint: 'Asked only when the type is “Manual”.',
    },
  ]
}

/** One cell of the top header row — a banner, or a column that spans both rows. */
type HeaderCell =
  | { kind: 'group'; group: WageGroup; span: number }
  | { kind: 'single'; column: WageColumn }

interface GridLayout {
  columns: WageColumn[]
  headerCells: HeaderCell[]
  /** Only banner-owned columns need a cell in the second header row. */
  subColumns: WageColumn[]
  totalWidth: number
}

function buildLayout(heads: WageHeads): GridLayout {
  const columns = buildColumns(heads)

  const headerCells = columns.reduce<HeaderCell[]>((cells, column) => {
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

  return {
    columns,
    headerCells,
    subColumns: columns.filter((column) => column.group),
    totalWidth: columns.reduce((sum, column) => sum + column.width, 0),
  }
}

/** Shared cell frame for every header and body cell. */
const CELL = 'border-b border-r border-border px-2 py-1.5 align-middle'

/*
 * A pinned body cell. Its background is opaque and flat — see the `.wage-*` rules
 * in globals.css. Anything translucent here has to be re-blended against the
 * cells scrolling underneath it on every frame.
 */
const STICKY = 'wage-sticky sticky z-10'

/** `left` for a pinned cell; nothing at all for a column that scrolls. */
function pinStyle(column: WageColumn) {
  return column.pin === undefined ? undefined : { left: column.pin }
}

/* ── The grid ───────────────────────────────────────────────────────────── */

interface BulkWageGridProps {
  designations: BulkWageDesignation[]
  heads: WageHeads
  control: Ctl
  register: Reg
  dirtyRows: Set<number>
  changeSalaryType: (index: number, value: 'Daily' | 'Monthly') => void
  changeWorkingDayCalculationType: (index: number, value: string) => void
}

/**
 * Every designation of the company as one wide grid: a row each, all editable,
 * against the one effective month chosen above it. Forty columns across seven
 * banners, so it scrolls both ways with the header and the first two columns
 * pinned.
 *
 * Built to stay responsive while typing across a grid this wide:
 *
 * - **Rows are memoised on primitive props**, so a keystroke in one row can't
 *   re-render the others — and neither can the screen re-rendering around them.
 * - **Nothing subscribes to the whole form.** Amount inputs are uncontrolled
 *   (`register`), and a cell that reacts to another cell — a derived wage, a
 *   setting behind an act toggle — watches only that one field.
 * - **The table is fixed-layout** off an explicit `<colgroup>`, so the browser
 *   never measures cell content to decide column widths.
 *
 * Deliberately not virtualised, unlike the designation master's history grid.
 * Every row here is an editable form row rather than a read-only record, and the
 * endpoint caps a save at 200 designations — a bound low enough that keeping the
 * rows mounted is cheaper than the correctness questions that unmounting live
 * form fields raises.
 */
export function BulkWageGrid({
  designations,
  heads,
  control,
  register,
  dirtyRows,
  changeSalaryType,
  changeWorkingDayCalculationType,
}: BulkWageGridProps) {
  /*
   * The allowance and deduction columns come from the master, so the layout is
   * rebuilt when that list changes and at no other time.
   */
  const layout = useMemo(() => buildLayout(heads), [heads])

  return (
    <div className="relative max-h-144 overflow-auto">
      <table
        className="table-fixed border-separate border-spacing-0 text-xs"
        style={{ width: layout.totalWidth }}
      >
        <GridHead layout={layout} />

        <tbody>
          {designations.map((designation, index) => (
            <WageRow
              key={designation.id}
              index={index}
              designationName={designation.designationName}
              inForceFrom={designation.wageStructure?.effectiveFrom ?? ''}
              columns={layout.columns}
              control={control}
              register={register}
              isDirty={dirtyRows.has(index)}
              changeSalaryType={changeSalaryType}
              changeWorkingDayCalculationType={changeWorkingDayCalculationType}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The column layout and the two header rows. Memoised on the layout, which only
 * changes when the master's heads do.
 *
 * Note there's no `backdrop-blur` on these: a blurred sticky header has to
 * re-filter everything scrolling beneath it every frame, which is the single
 * most expensive thing you can put on a pinned row. The background is flat and
 * opaque instead.
 */
const GridHead = memo(function GridHead({ layout }: { layout: GridLayout }) {
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

        {/* Sub-columns of each banner. */}
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

interface WageRowProps {
  index: number
  designationName: string
  /** Month the version in force takes effect from; `''` if never configured. */
  inForceFrom: string
  /** The grid's columns — the layout's list, stable between heads changes. */
  columns: WageColumn[]
  control: Ctl
  register: Reg
  isDirty: boolean
  changeSalaryType: (index: number, value: 'Daily' | 'Monthly') => void
  changeWorkingDayCalculationType: (index: number, value: string) => void
}

/**
 * One designation's row. Memoised on props that are all primitives or stable
 * references — the callback comes back from the hook via `useCallback` — so
 * typing in one row, or the screen re-rendering around the grid, leaves the
 * other rows alone.
 */
const WageRow = memo(function WageRow(props: WageRowProps) {
  return (
    <tr
      /* An edited row is tinted, so what's about to be saved is visible without
         reading down the Action column. */
      className={cn(props.isDirty && 'wage-row-draft')}
    >
      {props.columns.map((column) => (
        <td
          key={column.key}
          style={pinStyle(column)}
          className={cn(CELL, column.pin !== undefined && STICKY)}
        >
          <RowCell column={column} {...props} />
        </td>
      ))}
    </tr>
  )
})

/** One cell of a row. */
function RowCell({ column, ...props }: WageRowProps & { column: WageColumn }) {
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
    /*
     * Which designation this is, and what it's paid on today. The month is the
     * row's whole context: saving against the same month corrects that version,
     * and against any other one supersedes it — so it sits under the name rather
     * than behind a tooltip.
     */
    case 'designation':
      return (
        <div className="space-y-0.5">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Briefcase className="size-3 shrink-0 text-primary" />
            <span className="truncate" title={props.designationName}>
              {props.designationName}
            </span>
          </span>
          {/*
            Where a changed row says so. The whole row is tinted, but a tint read
            forty columns to the right of the name it belongs to is easy to lose
            — so the pinned cell, the one always on screen, carries the word too.
          */}
          {props.isDirty ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
              <PencilLine className="size-2.5 shrink-0" />
              Changed — not saved yet
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarClock className="size-2.5 shrink-0" />
              {props.inForceFrom
                ? `In force from ${formatMonth(props.inForceFrom)}`
                : 'Not configured yet'}
            </span>
          )}
        </div>
      )

    /*
     * The two working-day answers are alternatives, each owned by one calc type,
     * so switching drops the one that just went off screen.
     */
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

    /*
     * Switching the salary type clears the wage the other mode owns, so a row
     * never carries both a monthly basic and a hand-entered daily wage —
     * whichever is on screen is the one that counts.
     */
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

    case 'tds':
      return (
        <ActSwitch
          control={control}
          name={`rows.${index}.tdsActApplicable`}
          label="TDS act applicable"
        />
      )
    case 'tdsPct':
      return <TdsPercentCell index={index} control={control} register={register} />

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
    | `rows.${number}.tdsActApplicable`
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
    return (
      <DerivedAmount
        value={deriveWages({ salaryType, basicPay: '', wagePerDay }).basicPay}
      />
    )
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
      <DerivedAmount
        value={deriveWages({ salaryType, basicPay, wagePerDay: '' }).wagePerDay}
      />
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

/**
 * The overtime rate. Always the row's own to type once overtime is on — the
 * figure the row would derive from its wage stands in the empty field as its
 * placeholder, and left blank that derived figure is what gets saved.
 *
 * Switched off, the input is *disabled* rather than swapped for a read-only
 * stand-in. That matters: react-hook-form drops a field's value when its input
 * unmounts, so replacing the element would delete the stored rate from the form
 * — and toggling overtime back on would then save a rate derived from the wage
 * instead of the one on record. Every conditional cell in this grid keeps its
 * input mounted for that reason.
 */
function OtRateCell({ index, control, register }: CellProps) {
  const applicable = useWatch({ control, name: `rows.${index}.overtimeApplicable` })
  const salaryType = useWatch({ control, name: `rows.${index}.salaryType` })
  const basicPay = useWatch({ control, name: `rows.${index}.basicPay` })
  const wagePerDay = useWatch({ control, name: `rows.${index}.wagePerDay` })

  const derived = applicable
    ? deriveOvertimeRate({
        salaryType,
        basicPay,
        wagePerDay,
        overtimeApplicable: applicable,
        overtimeRatePerHour: '',
      })
    : null

  return (
    <GridAmountInput
      disabled={!applicable}
      placeholder={
        !applicable ? NO_VALUE : derived === null ? '0.00' : String(gridAmount(derived))
      }
      {...register(`rows.${index}.overtimeRatePerHour`)}
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

/**
 * A statutory amount, asked for only when its act is on and set to "Manual" —
 * disabled otherwise, and mounted either way so the form can't lose the stored
 * amount while the act is switched off (see `OtRateCell`).
 */
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
  const asked = applicable && actType === 'Manual'

  return (
    <GridAmountInput
      disabled={!asked}
      placeholder={asked ? '0.00' : NO_VALUE}
      {...register(amountName)}
    />
  )
}

/**
 * The TDS rate. One cell rather than the type-plus-amount pair PT and LWF carry:
 * there is no slab to defer to, so the row either deducts at its own rate or the
 * act is off. Mounted while it's off as well, so switching the act back on can't
 * lose a stored rate.
 */
function TdsPercentCell({ index, control, register }: CellProps) {
  const applicable = useWatch({ control, name: `rows.${index}.tdsActApplicable` })
  return (
    <GridAmountInput
      disabled={!applicable}
      placeholder={applicable ? '0.00' : NO_VALUE}
      {...register(`rows.${index}.tdsPercentage`)}
    />
  )
}

/** One allowance head — its value, then the acts it counts towards. */
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

/** One deduction head — a value and the unit it's in. */
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
      placeholder={NO_VALUE}
      value={value === null ? '' : gridAmount(value)}
      className="border-dashed bg-muted/50 text-muted-foreground"
    />
  )
}

