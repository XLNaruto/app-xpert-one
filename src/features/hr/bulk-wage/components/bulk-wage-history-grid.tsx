import { memo, useMemo } from 'react'
import { Briefcase, CalendarDays, History, UserPen } from 'lucide-react'
import { amountLabel } from '@/lib/currency'
import { cn, formatDate } from '@/lib/utils'
import {
  ColumnHint,
  ReadActMarkers,
  ReadAmount,
  ReadBoolean,
  ReadChoice,
  ReadMoney,
  ReadText,
} from '@/components/common/wage-grid-fields'
import {
  formatMonth,
  type DesignationWageStructure,
  type WageAllowance,
  type WageDeduction,
  type WageHeads,
} from '@/features/master/designation'
import type { BulkWageHistoryDesignation } from '../types'

/**
 * The pinned column: which version of the row you're looking at. It stays put
 * while the forty columns of settings scroll past it, the same way the grid pins
 * the designation — here the designation is the block heading instead, because
 * the rows underneath it are its months rather than its columns.
 */
const PINNED_WIDTHS = { effectiveFrom: 208 } as const

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
   * sits in the version's arrays. Resolved once here rather than per cell.
   */
  head?: { kind: 'allowance' | 'deduction'; id: number; at: number }
  /** Set on a pinned column: how far from the scrollport's left edge it sits. */
  pin?: number
}

const GROUP_META: Record<WageGroup, { label: string; tone: string; hint: string }> = {
  workingDays: {
    label: 'Working Days Config',
    tone: 'text-primary',
    hint: 'How the month’s paid working days were arrived at.',
  },
  allowances: {
    label: 'Allowances',
    tone: 'text-teal-600 dark:text-teal-400',
    hint: 'Each head as that version valued it — a percentage of basic pay or a flat amount, plus the acts it counted towards. Blank means the head did not apply.',
  },
  overtime: {
    label: 'Overtime',
    tone: 'text-emerald-600 dark:text-emerald-400',
    hint: 'The hourly rate paid for overtime, as stored on the version.',
  },
  deductions: {
    label: 'Deductions',
    tone: 'text-rose-600 dark:text-rose-400',
    hint: 'Recurring deductions applied on top of the statutory ones.',
  },
  pf: {
    label: 'PF Act',
    tone: 'text-sky-600 dark:text-sky-400',
    hint: 'Provident fund — the employee share and whether either contribution was capped at the statutory wage limit.',
  },
  esic: {
    label: 'ESIC',
    tone: 'text-emerald-600 dark:text-emerald-400',
    hint: 'Employee state insurance, and what the contribution was worked out on.',
  },
  pt: {
    label: 'PT',
    tone: 'text-violet-600 dark:text-violet-400',
    hint: 'Professional tax — from the act’s slab, or a fixed amount.',
  },
  tds: {
    label: 'TDS',
    tone: 'text-rose-600 dark:text-rose-400',
    hint: 'Tax deducted at source — no slab behind it, so the version carries the rate itself.',
  },
  lwf: {
    label: 'LWF',
    tone: 'text-amber-600 dark:text-amber-400',
    hint: 'Labour welfare fund — from the act’s rate, or a fixed amount.',
  },
}

/**
 * Every column of the history, in order — deliberately the bulk wage grid's own
 * columns in the bulk wage grid's own order, so a version reads here exactly
 * where you typed it there.
 *
 * Two differences, both because this screen records rather than edits: the
 * pinned column is the version's effective month instead of the designation
 * (the designation is the block heading above its versions), and the row ends
 * with who last touched it.
 */
function buildColumns(heads: WageHeads): WageColumn[] {
  return [
    {
      key: 'effectiveFrom',
      label: 'Effective From',
      width: PINNED_WIDTHS.effectiveFrom,
      pin: 0,
      hint: 'The month this version took effect from. It applied from that month onward until the version above it superseded it.',
    },

    {
      key: 'calcType',
      label: 'Calc Type',
      group: 'workingDays',
      width: 128,
      hint: '“Fixed” pinned the paid days; “As Per Calculation” derived them from the weekly off.',
    },
    { key: 'weeklyOff', label: 'Weekly Off', group: 'workingDays', width: 128 },
    {
      key: 'workingDays',
      label: 'W. Days',
      group: 'workingDays',
      width: 96,
      hint: 'Paid working days in the month — recorded only when the calc type was “Fixed”.',
    },

    {
      key: 'salaryType',
      label: 'Salary Type',
      width: 118,
      hint: 'Whether the wage was quoted per month or per day.',
    },
    { key: 'basicPay', label: amountLabel('Basic Pay'), width: 122 },
    { key: 'wagePerDay', label: amountLabel('Wage/Day'), width: 126 },
    {
      key: 'extraDay',
      label: amountLabel('Extra Day Amount'),
      width: 126,
      hint: 'Paid for each day worked beyond the version’s working days.',
    },

    ...heads.allowances.map((head, at) => ({
      key: `allowance:${head.id}`,
      label: head.code,
      group: 'allowances' as const,
      width: 130,
      hint: head.name,
      head: { kind: 'allowance' as const, id: head.id, at },
    })),

    {
      key: 'ot',
      label: 'OT',
      group: 'overtime',
      width: 62,
      hint: 'Whether overtime was paid at all.',
    },
    { key: 'otRate', label: amountLabel('Rate/Hr'), group: 'overtime', width: 118 },

    ...heads.deductions.map((head, at) => ({
      key: `deduction:${head.id}`,
      label: head.code,
      group: 'deductions' as const,
      width: 110,
      hint: head.name,
      head: { kind: 'deduction' as const, id: head.id, at },
    })),

    { key: 'pf', label: 'PF', group: 'pf', width: 62, hint: 'PF act applicable.' },
    {
      key: 'empWl',
      label: 'Emp WL',
      group: 'pf',
      width: 86,
      hint: 'Employee share capped at the statutory wage limit.',
    },
    {
      key: 'emprWl',
      label: 'Empr WL',
      group: 'pf',
      width: 90,
      hint: 'Employer share capped at the statutory wage limit.',
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
      width: 148,
      hint: 'What the ESIC contribution was calculated on.',
    },

    { key: 'pt', label: 'PT', group: 'pt', width: 62, hint: 'PT act applicable.' },
    { key: 'ptType', label: 'Type', group: 'pt', width: 92 },
    { key: 'ptAmt', label: amountLabel('Amt'), group: 'pt', width: 94 },

    /* PF · ESIC · PT · TDS · LWF — the order payroll reads the acts in. */
    { key: 'tds', label: 'TDS', group: 'tds', width: 66, hint: 'TDS act applicable.' },
    { key: 'tdsPct', label: 'Rate %', group: 'tds', width: 94 },

    { key: 'lwf', label: 'LWF', group: 'lwf', width: 66, hint: 'LWF act applicable.' },
    { key: 'lwfType', label: 'Type', group: 'lwf', width: 92 },
    { key: 'lwfAmt', label: amountLabel('Amt'), group: 'lwf', width: 94 },

    {
      key: 'changedBy',
      label: 'Changed By',
      width: 168,
      hint: 'Who last wrote this version, and when. A corrected version shows the correction rather than the original entry.',
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

/**
 * The wage structure history, designation by designation and read-only.
 *
 * Same forty columns as the bulk wage grid, in the same order, rendered as
 * stored: each designation heads a block, and under it sits one row per version
 * it has ever been paid on, newest effective month first. Nothing on here is an
 * input — the history is the audit trail, and it is corrected from the
 * designation master's own Wage Structure tab, never from a bulk screen.
 *
 * A designation with no versions still gets its block. "This title has never
 * been given a wage structure" is one of the things the history is read for.
 */
export function BulkWageHistoryGrid({
  designations,
  heads,
}: {
  designations: BulkWageHistoryDesignation[]
  heads: WageHeads
}) {
  /*
   * The allowance and deduction columns come from the master, so the layout is
   * rebuilt when that list changes and at no other time.
   */
  const layout = useMemo(() => buildLayout(heads), [heads])

  return (
    <div className="relative max-h-160 overflow-auto">
      <table
        className="table-fixed border-separate border-spacing-0 text-xs"
        style={{ width: layout.totalWidth }}
      >
        <GridHead layout={layout} />

        <tbody>
          {designations.map((designation) => (
            <DesignationBlock
              key={designation.id}
              designation={designation}
              columns={layout.columns}
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
 * No `backdrop-blur` on these, as on every other wage grid: a blurred sticky
 * header has to re-filter everything scrolling beneath it every frame. The
 * background is flat and opaque instead.
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

/**
 * One designation: a heading row, then its versions. Memoised on the record,
 * which the query keeps referentially stable, so paging renders the block once.
 */
const DesignationBlock = memo(function DesignationBlock({
  designation,
  columns,
}: {
  designation: BulkWageHistoryDesignation
  columns: WageColumn[]
}) {
  const count = designation.versions.length

  return (
    <>
      <tr>
        {/*
          The heading spans the whole width, and its content is pinned inside
          that span rather than the cell being pinned itself — a `colSpan` cell
          scrolls with the table, so the name would otherwise slide off the left
          edge exactly when you need it to say which block you're reading.
        */}
        <td
          colSpan={columns.length}
          className="border-b border-border bg-muted/60 p-0"
        >
          <div className="sticky left-0 flex w-max items-center gap-2 px-3 py-2">
            <Briefcase className="size-3.5 shrink-0 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">
              {designation.designationName}
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {count === 0
                ? 'No wage structure'
                : `${count} ${count === 1 ? 'version' : 'versions'}`}
            </span>
          </div>
        </td>
      </tr>

      {count === 0 ? (
        <tr>
          <td colSpan={columns.length} className="border-b border-border p-0">
            <div className="sticky left-0 w-max px-3 py-3 text-[11px] text-muted-foreground">
              This designation has never been given a wage structure. Set one from
              Bulk Update Wage, or from the designation’s own Wage Structure tab.
            </div>
          </td>
        </tr>
      ) : (
        designation.versions.map((version, index) => (
          <VersionRow
            key={version.id}
            version={version}
            /* Newest first, as the API orders them — so the top row of a block
               is what the designation is paid on today. */
            isCurrent={index === 0}
            columns={columns}
          />
        ))
      )}
    </>
  )
})

/** One stored version of one designation, read-only. */
const VersionRow = memo(function VersionRow({
  version,
  isCurrent,
  columns,
}: {
  version: DesignationWageStructure
  isCurrent: boolean
  columns: WageColumn[]
}) {
  return (
    <tr className="wage-row-saved">
      {columns.map((column) => (
        <td
          key={column.key}
          style={pinStyle(column)}
          /*
           * A stored value sits centred in its cell, the pinned column included —
           * there's no input to line up with, and centring is what makes a whole
           * row read as recorded rather than editable.
           */
          className={cn(CELL, 'text-center', column.pin !== undefined && STICKY)}
        >
          <VersionCell column={column} version={version} isCurrent={isCurrent} />
        </td>
      ))}
    </tr>
  )
})

/** One cell of a version row — the grid's own columns, rendered read-only. */
function VersionCell({
  column,
  version,
  isCurrent,
}: {
  column: WageColumn
  version: DesignationWageStructure
  isCurrent: boolean
}) {
  if (column.head) {
    const value = headValue(version, column.head)
    if (!value) return <ReadText value={null} />

    const amount = <ReadAmount amount={value.amount} valueType={value.valueType} />
    /*
     * An allowance also shows the acts it counted towards. Nothing to show for a
     * head this version didn't value, and a deduction carries no markers at all.
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
    /*
     * The month the version took effect from, and whether it's the one still in
     * force — the single most useful thing to know while reading down a block,
     * so it's on the pinned column rather than worked out from the row's place.
     */
    case 'effectiveFrom':
      return (
        <div className="space-y-0.5">
          <span className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
            <CalendarDays className="size-3 shrink-0 text-primary" />
            {formatMonth(version.effectiveFrom)}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-semibold',
              isCurrent
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <History className="size-2.5 shrink-0" />
            {isCurrent ? 'In force' : 'Superseded'}
          </span>
        </div>
      )

    case 'calcType':
      return <ReadText value={version.workingDayCalculationType} />
    case 'weeklyOff':
      return <ReadText value={version.weeklyOff ?? 'None'} />
    case 'workingDays':
      return <ReadText value={version.workingDays} />

    case 'salaryType':
      return <ReadChoice value={version.salaryType} tone="bg-primary/10 text-primary" />

    /* The money columns — signed and grouped. Working days above is a count, so
       it stays a plain number. */
    case 'basicPay':
      return <ReadMoney value={version.basicPay} />
    case 'wagePerDay':
      return <ReadMoney value={version.wagePerDay} />
    case 'extraDay':
      return <ReadMoney value={version.extraDayAmountPerDay} />

    case 'ot':
      return (
        <ReadBoolean
          value={version.overtimeApplicable}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
      )
    case 'otRate':
      return <ReadMoney value={version.overtimeRatePerHour} />

    case 'pf':
      return (
        <ReadBoolean
          value={version.pfActApplicable}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
      )
    case 'empWl':
      return (
        <ReadBoolean
          value={version.employeePfContributionOnWageLimit}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
      )
    case 'emprWl':
      return (
        <ReadBoolean
          value={version.employerPfContributionOnWageLimit}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-400"
        />
      )
    case 'pfAmt':
      return <ReadAmount amount={version.pfValue} valueType={version.pfValueType} />

    case 'esic':
      return (
        <ReadBoolean
          value={version.esicActApplicable}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
      )
    case 'esicDedOn':
      return <ReadText value={version.esicDeductionBasis} />

    case 'pt':
      return (
        <ReadBoolean
          value={version.ptActApplicable}
          tone="bg-violet-500/15 text-violet-700 dark:text-violet-400"
        />
      )
    case 'ptType':
      return (
        <ReadChoice
          value={actTypeLabel(version.ptActType)}
          tone="bg-violet-500/10 text-violet-700 dark:text-violet-400"
        />
      )
    case 'ptAmt':
      return <ReadMoney value={version.ptAmount} />

    case 'tds':
      return (
        <ReadBoolean
          value={version.tdsActApplicable}
          tone="bg-rose-500/15 text-rose-700 dark:text-rose-400"
        />
      )
    case 'tdsPct':
      return <ReadAmount amount={version.tdsPercentage} valueType="Percentage" />

    case 'lwf':
      return (
        <ReadBoolean
          value={version.lwfActApplicable}
          tone="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        />
      )
    case 'lwfType':
      return (
        <ReadChoice
          value={actTypeLabel(version.lwfActType)}
          tone="bg-amber-500/10 text-amber-700 dark:text-amber-400"
        />
      )
    case 'lwfAmt':
      return <ReadMoney value={version.lwfAmount} />

    /*
     * Who the version is down to. A corrected version reports the correction —
     * that's the change the row now holds; the original entry is what the
     * correction replaced, and the API keeps only the one figure.
     */
    case 'changedBy': {
      const by = version.updatedBy || version.createdBy
      const at = version.updatedAt || version.createdAt
      return (
        <div className="space-y-0.5">
          <span className="flex items-center justify-center gap-1 text-foreground">
            <UserPen className="size-2.5 shrink-0 text-muted-foreground" />
            {by || <span className="text-muted-foreground/50">Unknown</span>}
          </span>
          {at && (
            <span className="block text-[10px] text-muted-foreground">
              {formatDate(at)}
            </span>
          )}
        </div>
      )
    }

    default:
      return null
  }
}

/**
 * What one version holds for one head column. A version's entries are built from
 * the same heads list as the columns, so the head sits at the column's own index
 * — but a version read before the master last changed can be one entry short or
 * long, so the id is checked and only a mismatch pays for a lookup.
 */
function headValue(
  version: DesignationWageStructure,
  head: NonNullable<WageColumn['head']>,
): WageAllowance | WageDeduction | undefined {
  const side = head.kind === 'allowance' ? version.allowances : version.deductions
  const at = side[head.at]
  if (at?.componentId === head.id) return at
  return side.find((entry) => entry.componentId === head.id)
}

/** "As Per Act" is spelled short inside the grid's narrow act columns. */
function actTypeLabel(value: string | null): string | null {
  if (!value) return null
  return value === 'As Per Act' ? 'Act' : value
}
