import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type FieldPath,
  type UseFormRegister,
} from 'react-hook-form'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CalendarDays, Pencil, Trash2, UserPen, X } from 'lucide-react'
import { MonthPicker } from '@/components/ui/month-picker'
import { amountLabel } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  WAGE_ACT_TYPE_OPTIONS,
  WAGE_ESIC_DEDUCTION_BASIS_OPTIONS,
  WAGE_SALARY_TYPE_OPTIONS,
  WAGE_WEEKLY_OFF_OPTIONS,
  WORKING_DAY_CALCULATION_OPTIONS,
} from '../constants'
import { formatMonth } from '../lib/effective-month'
import {
  deriveOvertimeRate,
  deriveWages,
  gridAmount,
} from '../lib/wage-structure-calculations'
import type { WageHeads } from '../lib/wage-structure-mappers'
import type { WageStructureFormValues } from '../schemas'
import type { DesignationWageStructure, WageAllowance, WageDeduction } from '../types'
import type { useDesignationWageForm } from '../hooks/use-designation-wage-form'
import {
  ActMarkerButton,
  CellTooltip,
  ColumnHint,
  GridAmountInput,
  GridInput,
  GridSelect,
  GridSwitch,
  ReadActMarkers,
  ReadAmount,
  ReadBoolean,
  ReadChoice,
  ReadMoney,
  ReadText,
  TogglePill,
  UnitAmountField,
  NO_VALUE,
} from '@/components/common/wage-grid-fields'

/**
 * What the grid needs of a screen's form hook. The designation master's
 * `useDesignationWageForm` is the reference shape; HR's employee wage override
 * supplies the same members against its own endpoints.
 */
type WageForm = ReturnType<typeof useDesignationWageForm> & {
  /**
   * Withdraw a SAVED version, when the screen has somewhere for it to fall back
   * to. The designation's history has nowhere — it *is* the bottom tier, and the
   * months it priced are the audit trail — so that screen leaves this out and no
   * bin appears. An employee's override does: dropping a version puts them back
   * on their designation's terms, which is the only way to undo an override.
   */
  deleteRow?: (row: DesignationWageStructure) => void
}
type Ctl = Control<WageStructureFormValues>
type Reg = UseFormRegister<WageStructureFormValues>

/**
 * Height of a saved row. Fixed and set on the row, so the virtualiser's estimate
 * is exact for every row it hasn't measured. A row opened for correction is the
 * one exception — an editable row is taller, so those get measured.
 */
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

/**
 * The pinned columns, in order: the row's action and the month it takes effect
 * from — what tells you which row you're looking at and what you can do to it, so
 * both stay put while the forty columns of settings scroll past them.
 *
 * Their widths live here because they're needed twice: as the columns' own widths
 * and as each one's `left` offset. Anything after these two scrolls.
 */
const PINNED_WIDTHS = { action: 78, effectiveFrom: 178 } as const

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
   * the key per cell — at forty columns times the rows on screen, that lookup
   * was running a thousand times per scroll step.
   */
  head?: {
    kind: 'allowance' | 'deduction'
    at: number
    /** The head's `pay_component_id`, for reading a saved row back. */
    id: number
  }
  /**
   * Set on a pinned column: how far from the scrollport's left edge it sits, i.e.
   * the summed width of the pinned columns before it. Fixed widths, so these are
   * known up front rather than measured — see `PINNED_WIDTHS`.
   */
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
 * Every column of the grid, in order. The header rows and both row renderers all
 * walk this one list, so a column can never appear in one and not the other.
 *
 * The allowance and deduction columns are the allowance / deduction master's own
 * heads — one column per head, headed by its short code — so the grid follows the
 * master rather than a list of its own. Everything else is fixed.
 *
 * A column under a banner gets one header row, so its label has to fit on one
 * line and its width is set accordingly. A column with no banner spans both
 * header rows instead, so its label is free to wrap over two lines — which is
 * why these are the narrower ones despite some having the longest names.
 */
function buildColumns(heads: WageHeads): WageColumn[] {
  return [
    /*
     * What can be done to the row — remove it while it's a draft, pull it back
     * onto the grid once it's saved. First and pinned, so it's reachable however
     * far across the settings you've scrolled.
     */
    { key: 'action', label: 'Action', width: PINNED_WIDTHS.action, pin: 0 },
    {
      key: 'effectiveFrom',
      label: 'Effective From',
      width: PINNED_WIDTHS.effectiveFrom,
      pin: PINNED_WIDTHS.action,
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
      /*
       * Always rupees, so it's signed like every other money column. The heads and
       * the PF amount aren't signed, and shouldn't be — those cells take either a
       * percentage or an amount, and the unit is the cell's own to say.
       */
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

    /*
     * Wider than a plain amount column: each of these carries the PF / ESI / PT
     * markers under its input, and those three share the cell's width evenly, so
     * the column has to be wide enough for the longest label ("ESI") plus its
     * border to sit in a third of it without wrapping.
     */
    ...heads.allowances.map((head, at) => ({
      key: `allowance:${head.id}`,
      label: head.code,
      group: 'allowances' as const,
      width: 148,
      hint: head.name,
      head: { kind: 'allowance' as const, at, id: head.id },
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
      head: { kind: 'deduction' as const, at, id: head.id },
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

/**
 * One cell of the top header row: either a banner spanning the columns beneath
 * it, or a column with no banner, which spans both header rows instead of
 * leaving a blank cell above itself.
 */
type HeaderCell =
  | { kind: 'group'; group: WageGroup; span: number }
  | { kind: 'single'; column: WageColumn }

/**
 * The grid's shape for one set of heads — the columns and everything the header
 * rows and the `<colgroup>` are laid out from. Built once per heads list and
 * passed down, so a scroll frame never rebuilds it.
 */
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
 * in globals.css. Anything translucent here has to be re-blended against the cells
 * scrolling underneath it on every frame.
 */
const STICKY = 'wage-sticky sticky z-10'

/** `left` for a pinned cell; nothing at all for a column that scrolls. */
function pinStyle(column: WageColumn) {
  return column.pin === undefined ? undefined : { left: column.pin }
}

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
   * The allowance and deduction columns come from the master, so the layout is
   * rebuilt when that list changes and at no other time — every row renderer
   * reads its columns from here, so one memo keeps the whole grid off the
   * critical path of a scroll frame.
   */
  const layout = useMemo(() => buildLayout(form.heads), [form.heads])

  /*
   * Which saved versions are open for correction, and at what index in the field
   * array — a stored row opens *in its own place* in the history rather than as a
   * new row on top, so the grid needs to find the draft belonging to a saved id
   * while it walks the history. Built once per rows change, not per row.
   */
  const editing = useMemo(() => {
    const at = new Map<number, number>()
    form.fields.forEach((field, index) => {
      if (field.wageStructureId !== undefined) at.set(field.wageStructureId, index)
    })
    return at
  }, [form.fields])

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
        style={{ width: layout.totalWidth }}
      >
        <GridHead layout={layout} />

        {/*
          New versions being drafted. Rows opened from the history are in the same
          field array but render further down, in the saved row's own place — so
          only the new ones are up here.
        */}
        <tbody>
          {form.fields.map((field, index) =>
            field.wageStructureId === undefined ? (
              <DraftRow
                key={field.id}
                index={index}
                columns={layout.columns}
                isCorrection={false}
                control={form.control}
                register={form.register}
                monthBounds={form.monthBounds}
                takenMonths={form.takenMonths}
                onRemove={form.removeRow}
                changeSalaryType={form.changeSalaryType}
                changeWorkingDayCalculationType={form.changeWorkingDayCalculationType}
              />
            ) : null,
          )}
        </tbody>

        <tbody ref={savedBodyRef}>
          {form.historyLoading && (
            <StatusRow span={layout.columns.length}>
              Loading wage structure history…
            </StatusRow>
          )}
          {form.historyError && (
            <StatusRow span={layout.columns.length} tone="text-destructive">
              Couldn’t load the wage structure history.
            </StatusRow>
          )}

          {paddingTop > 0 && (
            <SpacerRow span={layout.columns.length} height={paddingTop} />
          )}
          {items.map((item) => {
            const row = form.existing[item.index]
            const at = editing.get(row.id)

            /*
             * Both variants of a history row carry the virtualiser's index and its
             * measuring ref, so the one row that changes height — a version opened
             * for correction — is measured, and measured back down when it closes.
             */
            return at === undefined ? (
              <SavedRow
                key={row.id}
                index={item.index}
                measureRef={virtualizer.measureElement}
                row={row}
                columns={layout.columns}
                onEdit={form.editRow}
                onDelete={form.deleteRow}
              />
            ) : (
              <DraftRow
                key={row.id}
                index={at}
                virtualIndex={item.index}
                measureRef={virtualizer.measureElement}
                columns={layout.columns}
                isCorrection
                control={form.control}
                register={form.register}
                monthBounds={form.monthBounds}
                takenMonths={form.takenMonths}
                onRemove={form.removeRow}
                changeSalaryType={form.changeSalaryType}
                changeWorkingDayCalculationType={form.changeWorkingDayCalculationType}
              />
            )
          })}
          {paddingBottom > 0 && (
            <SpacerRow span={layout.columns.length} height={paddingBottom} />
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The column layout and the two header rows. Memoised on the layout, which only
 * changes when the master's heads do, so it renders once per heads list — the
 * virtualiser re-renders the grid on every scroll frame, and rebuilding eighty
 * header cells each time was most of the cost of a scroll.
 *
 * Note there's no `backdrop-blur` on these: a blurred sticky header has to
 * re-filter everything scrolling beneath it every frame, which is the single
 * most expensive thing you can put on a pinned row. The background is flat and
 * opaque instead.
 */
const GridHead = memo(function GridHead({ layout }: { layout: GridLayout }) {
  return (
    <>
      {/* Fixed layout lays the grid out from these widths rather than by
          measuring cells — which is what keeps a table this wide cheap. */}
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
              /* A pinned header is pinned both ways, so it outranks the rows it
                 covers and the columns that scroll beneath it. */
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

/** A row spanning the grid, for a loading or error message. */
function StatusRow({
  span,
  children,
  tone,
}: {
  span: number
  children: string
  tone?: string
}) {
  return (
    <tr>
      <td
        colSpan={span}
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
function SpacerRow({ span, height }: { span: number; height: number }) {
  return (
    <tr aria-hidden>
      <td colSpan={span} style={{ height, padding: 0, border: 0 }} />
    </tr>
  )
}

/* ── Draft rows ─────────────────────────────────────────────────────────── */

interface DraftRowProps {
  index: number
  /**
   * Set only on a row rendered inside the virtualised history — its index there,
   * and the ref that measures it. A new draft sits above the history and has
   * neither.
   */
  virtualIndex?: number
  measureRef?: (el: HTMLTableRowElement | null) => void
  /** The grid's columns — the layout's list, stable between heads changes. */
  columns: WageColumn[]
  control: Ctl
  register: Reg
  /**
   * Whether this row was opened from the history rather than drafted — a PATCH of
   * that stored version, not a new one on top of it.
   */
  isCorrection: boolean
  monthBounds: WageForm['monthBounds']
  takenMonths: Set<string>
  onRemove: (index: number) => void
  changeSalaryType: (index: number, value: 'Daily' | 'Monthly') => void
  changeWorkingDayCalculationType: (index: number, value: string) => void
}

/**
 * One row being edited — a new version at the top of the grid, or a stored one
 * opened for correction in its own place in the history. Memoised on props that
 * are all stable — the callbacks come back from the hook via `useCallback` — so
 * scrolling the saved history below never re-renders the editable rows.
 */
const DraftRow = memo(function DraftRow(props: DraftRowProps) {
  return (
    <tr
      ref={props.measureRef}
      data-index={props.virtualIndex}
      /* A correction is outlined, so it reads as this history row opened up
         rather than as a row that has appeared next to it. */
      className={cn(
        'wage-row-draft',
        props.isCorrection && 'outline-1 -outline-offset-1 outline-primary/40',
      )}
    >
      {props.columns.map((column) => (
        <td
          key={column.key}
          style={pinStyle(column)}
          className={cn(CELL, column.pin !== undefined && STICKY)}
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
              {/*
                A row opened from the history saves back over that same version,
                so it doesn't supersede anything — say which of the two is about
                to happen, since the difference is what past months are read as.
              */}
              {props.isCorrection ? (
                <p className="flex items-center gap-1 text-[10px] leading-tight text-primary">
                  <Pencil className="size-2.5 shrink-0" />
                  Editing this version
                </p>
              ) : (
                field.value &&
                props.takenMonths.has(field.value) && (
                  <p className="text-[10px] leading-tight text-amber-600 dark:text-amber-400">
                    Supersedes the existing row for this month
                  </p>
                )
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

    /*
     * A new draft is thrown away; a correction is only *closed* — the stored
     * version it was opened from stays exactly as it is, so the icon says close
     * rather than delete.
     */
    case 'action':
      return props.isCorrection ? (
        <CellTooltip label="Close without saving this correction">
          <button
            type="button"
            onClick={() => props.onRemove(index)}
            aria-label="Close this correction without saving"
            className="mx-auto flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </CellTooltip>
      ) : (
        <CellTooltip label="Remove this row">
          <button
            type="button"
            onClick={() => props.onRemove(index)}
            aria-label="Remove this row"
            className="mx-auto flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
  const error = useFieldError(control, `rows.${index}.basicPay`)

  if (salaryType === 'Daily') {
    return <DerivedAmount value={deriveWages({ salaryType, basicPay: '', wagePerDay }).basicPay} />
  }
  return (
    <GridAmountInput
      placeholder="0.00"
      aria-invalid={!!error}
      title={error}
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
  const error = useFieldError(control, `rows.${index}.wagePerDay`)

  if (salaryType === 'Monthly') {
    return (
      <DerivedAmount value={deriveWages({ salaryType, basicPay, wagePerDay: '' }).wagePerDay} />
    )
  }
  return (
    <GridAmountInput
      placeholder="0.00"
      aria-invalid={!!error}
      title={error}
      {...register(`rows.${index}.wagePerDay`)}
    />
  )
}

/**
 * The message standing against one field of one row, or `undefined` while it's
 * fine. Scoped to that field, so the cell re-renders when its error appears or
 * clears rather than on every keystroke — the inputs stay uncontrolled.
 *
 * Read off the path by hand: `errors` mirrors the row's shape, and a head's
 * amount is four levels down (`rows.0.allowances.2.amount`), which no indexed
 * lookup expresses without casting at every step anyway.
 */
function useFieldError(
  control: Ctl,
  name: FieldPath<WageStructureFormValues>,
): string | undefined {
  const { errors } = useFormState({ control, name })
  const node = name
    .split('.')
    .reduce<unknown>(
      (at, key) => (at as Record<string, unknown> | undefined)?.[key],
      errors,
    ) as { message?: string } | undefined
  return typeof node?.message === 'string' ? node.message : undefined
}

/**
 * The overtime rate. Always the row's own to type once overtime is on — there's no
 * "auto or manual" to choose any more, so the figure the row would derive from its
 * wage stands in the empty field as its placeholder. Left blank, that derived
 * figure is what gets saved, so what the cell shows is what the row means.
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

  /*
   * Disabled rather than swapped for a read-only stand-in: react-hook-form drops
   * a field's value when its input unmounts, so replacing the element would
   * delete a rate the row was opened with — and toggling overtime back on would
   * then save one derived from the wage instead of the one on record.
   */
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
  const error = useFieldError(control, `rows.${index}.pfValue`)
  return (
    <Controller
      control={control}
      name={`rows.${index}.pfValueType`}
      render={({ field }) => (
        <UnitAmountField
          valueType={field.value}
          onValueTypeChange={field.onChange}
          disabled={!applicable}
          invalid={!!error}
        >
          <GridInput
            placeholder="12"
            disabled={!applicable}
            aria-invalid={!!error}
            title={error}
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

  const asked = applicable && actType === 'Manual'

  /* Mounted either way — see `OtRateCell` on why an unmounted input loses its
     value, and what that would cost a stored statutory amount. */
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
 * act is off. Mounted while it's off as well — see `OtRateCell` on what an
 * unmounted input costs a stored figure.
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

/** One allowance head in a draft row — its value, then the acts it counts to. */
function AllowanceCell({ index, at, control, register }: CellProps & { at: number }) {
  const error = useFieldError(control, `rows.${index}.allowances.${at}.amount`)
  return (
    <div className="space-y-1">
      <Controller
        control={control}
        name={`rows.${index}.allowances.${at}.valueType`}
        render={({ field }) => (
          <UnitAmountField
            valueType={field.value}
            onValueTypeChange={field.onChange}
            invalid={!!error}
          >
            <GridInput
              placeholder="0"
              aria-invalid={!!error}
              title={error}
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
  const error = useFieldError(control, `rows.${index}.deductions.${at}.amount`)
  return (
    <Controller
      control={control}
      name={`rows.${index}.deductions.${at}.valueType`}
      render={({ field }) => (
        <UnitAmountField
          valueType={field.value}
          onValueTypeChange={field.onChange}
          invalid={!!error}
        >
          <GridInput
            placeholder="0.00"
            aria-invalid={!!error}
            title={error}
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
      /* Nothing to derive yet — the wage it comes from hasn't been typed. */
      placeholder={NO_VALUE}
      value={value === null ? '' : gridAmount(value)}
      className="border-dashed bg-muted/50 text-muted-foreground"
    />
  )
}


/* ── Saved rows ─────────────────────────────────────────────────────────── */

/**
 * One saved row. Memoised on the record, which the query keeps referentially
 * stable — so scrolling renders only the rows entering the window.
 */
const SavedRow = memo(function SavedRow({
  row,
  index,
  measureRef,
  columns,
  onEdit,
  onDelete,
}: {
  row: DesignationWageStructure
  /** Its index in the virtual window, and the ref that measures it back down. */
  index: number
  measureRef: (el: HTMLTableRowElement | null) => void
  columns: WageColumn[]
  onEdit: (row: DesignationWageStructure) => void
  /** Omitted where a saved version has nothing to fall back to — see `WageForm`. */
  onDelete?: (row: DesignationWageStructure) => void
}) {
  return (
    <tr
      ref={measureRef}
      data-index={index}
      className="wage-row-saved"
      style={{ height: SAVED_ROW_HEIGHT }}
    >
      {columns.map((column) => (
        <td
          key={column.key}
          style={pinStyle(column)}
          /*
           * A stored value sits centred in its cell, the pinned columns included —
           * there's no input to line up with, and centring is what makes a whole
           * row read as recorded rather than editable.
           */
          className={cn(CELL, 'text-center', column.pin !== undefined && STICKY)}
        >
          <SavedCell column={column} row={row} onEdit={onEdit} onDelete={onDelete} />
        </td>
      ))}
    </tr>
  )
})

/** One cell of a saved row — the same columns, rendered read-only. */
function SavedCell({
  column,
  row,
  onEdit,
  onDelete,
}: {
  column: WageColumn
  row: DesignationWageStructure
  onEdit: (row: DesignationWageStructure) => void
  onDelete?: (row: DesignationWageStructure) => void
}) {
  if (column.head) {
    const value = savedHeadValue(row, column.head)
    if (!value) return <ReadText value={null} />

    const amount = <ReadAmount amount={value.amount} valueType={value.valueType} />
    /*
     * An allowance also shows the acts it counts towards, the same three markers
     * the draft row carries. Nothing to show for a head this version didn't value,
     * and a deduction has no markers at all.
     */
    if (value.amount === null || !('pfApplicable' in value)) return amount

    return (
      <div className="space-y-0.5">
        {amount}
        <ReadActMarkers
          pfApplicable={value.pfApplicable}
          esicApplicable={value.esicApplicable}
          ptApplicable={value.ptApplicable}
        />
      </div>
    )
  }

  switch (column.key) {
    case 'effectiveFrom':
      return (
        <div className="space-y-0.5">
          {/* Both lines centre as a pair, so the icons stay beside their text
              rather than pinning each line to the cell's left edge. */}
          <span className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
            <CalendarDays className="size-3 shrink-0 text-primary" />
            {formatMonth(row.effectiveFrom)}
          </span>
          <span className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
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

    /* The money columns — signed and grouped. Working days above is a count, so
       it stays a plain number. */
    case 'basicPay':
      return <ReadMoney value={row.basicPay} />
    case 'wagePerDay':
      return <ReadMoney value={row.wagePerDay} />
    case 'extraDay':
      return <ReadMoney value={row.extraDayAmountPerDay} />

    case 'ot':
      return (
        <ReadBoolean
          value={row.overtimeApplicable}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
      )
    case 'otRate':
      return <ReadMoney value={row.overtimeRatePerHour} />

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
      return <ReadMoney value={row.ptAmount} />

    case 'tds':
      return (
        <ReadBoolean
          value={row.tdsActApplicable}
          tone="bg-rose-500/15 text-rose-700 dark:text-rose-400"
        />
      )
    case 'tdsPct':
      return <ReadAmount amount={row.tdsPercentage} valueType="Percentage" />

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
      return <ReadMoney value={row.lwfAmount} />

    case 'action':
      /*
       * A saved version can always be corrected: this pulls it onto the grid as an
       * editable row that saves back over the same version, for fixing a row that
       * was entered wrong. A *revision* is a new row instead, so that the months
       * already paid on the old figures keep them.
       *
       * Withdrawing it is offered only where the screen has somewhere for the
       * months to fall back to — see `deleteRow` on `WageForm`.
       */
      return (
        <div className="flex items-center justify-center gap-1">
          <CellTooltip label="Correct this version in place">
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={`Correct the wage structure effective ${formatMonth(row.effectiveFrom)}`}
            >
              <Pencil className="size-3.5" />
            </button>
          </CellTooltip>
          {onDelete && (
            <CellTooltip label="Withdraw this version">
              <button
                type="button"
                onClick={() => onDelete(row)}
                className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Withdraw the wage version effective ${formatMonth(row.effectiveFrom)}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </CellTooltip>
          )}
        </div>
      )

    default:
      return null
  }
}

/**
 * What one saved row holds for one head column. The row's entries are built from
 * the same heads list as the columns, so the head sits at the column's own index —
 * but a row read before the master last changed can be one entry short or long, so
 * the id is checked and only a mismatch pays for a lookup.
 */
function savedHeadValue(
  row: DesignationWageStructure,
  head: NonNullable<WageColumn['head']>,
): WageAllowance | WageDeduction | undefined {
  const side = head.kind === 'allowance' ? row.allowances : row.deductions
  const at = side[head.at]
  if (at?.componentId === head.id) return at
  return side.find((entry) => entry.componentId === head.id)
}

/** "As Per Act" is spelled short inside the grid's narrow act columns. */
function actTypeLabel(value: string | null): string | null {
  if (!value) return null
  return value === 'As Per Act' ? 'Act' : value
}
