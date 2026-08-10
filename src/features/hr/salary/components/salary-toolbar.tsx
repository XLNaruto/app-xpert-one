import {
  Briefcase,
  Calculator,
  CalendarRange,
  CheckCircle2,
  Clock,
  UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'
import { cn, formatDate } from '@/lib/utils'
import type { SalaryPeriod, SalaryTotals } from '../types'

interface SalaryToolbarProps {
  /** What the picker holds — staged, not what the register was read for. */
  designationId: number | null
  designationOptions: ComboboxOption[]
  designationsLoading: boolean
  onDesignationChange: (value: number | null) => void
  /** Likewise staged. */
  month: string
  monthBounds: { minDate: Date; maxDate: Date }
  onMonthChange: (value: string) => void
  /** Run the register for what the two pickers hold. */
  onCalculate: () => void
  /** The pickers hold something the register on screen wasn't read for. */
  hasPendingFilters: boolean
  isCalculating: boolean
  /** The cycle the register was read for — `null` before the first read. */
  period: SalaryPeriod | null
  /** The whole company's month, whatever the register is filtered to. */
  companyTotals: SalaryTotals | null
}

/**
 * What register is on screen: the designation, the month, and which side of it.
 *
 * The designation comes first because it isn't a filter — the grid's allowance
 * and deduction columns are that designation's heads, so the register is read one
 * designation at a time and there is nothing to show until one is picked. Payroll
 * is set up per designation anyway: the wage structure, the heads and the acts all
 * hang off the title rather than off the person.
 *
 * **The two pickers stage; Calculate Salary reads.** Picking a designation is a
 * decision to run a payroll rather than a filter over something already on
 * screen — it re-seeds every row of the form — so it waits for the button.
 *
 * What this toolbar deliberately no longer holds is the search box and the
 * status tabs. Those are reads of the register *already chosen* — a different
 * side of it, or the same side narrowed to a name — answered as they are typed,
 * so they live on the grid's own header beside the rows they act on. See
 * `SalaryRegisterControls`.
 *
 * The company isn't asked for. The register is the active company's, the one the
 * session is already working in, and switching company is the switcher's job.
 *
 * The cycle is printed rather than derived from the month: with a cycle start day
 * set — the department's, else the company's — the period is not the calendar
 * month, and the difference is exactly what decides which attendance is paid.
 */
export function SalaryToolbar({
  designationId,
  designationOptions,
  designationsLoading,
  onDesignationChange,
  month,
  monthBounds,
  onMonthChange,
  onCalculate,
  hasPendingFilters,
  isCalculating,
  period,
  companyTotals,
}: SalaryToolbarProps) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
      {/*
        What register to run. Each control is sized to what it holds — the
        designation combobox gets room for long job titles, the month picker and
        button only what they need — rather than stretched to fill the row.
      */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Designation" className="w-lg">
          <Combobox
            value={designationId === null ? '' : String(designationId)}
            onChange={(value) => onDesignationChange(value ? Number(value) : null)}
            options={designationOptions}
            icon={Briefcase}
            placeholder={designationsLoading ? 'Loading…' : 'Select a designation'}
            searchPlaceholder="Search designations…"
            clearable
          />
        </Field>

        <Field label="Salary Month" className="w-44">
          <MonthPicker
            value={month}
            onChange={onMonthChange}
            minDate={monthBounds.minDate}
            maxDate={monthBounds.maxDate}
          />
        </Field>

        <Button
          type="button"
          onClick={onCalculate}
          disabled={designationId === null || isCalculating}
          className="gap-1.5"
        >
          <Calculator className="size-4" />
          {isCalculating ? 'Calculating…' : 'Calculate Salary'}
        </Button>
      </div>

      {/* Said once, beside the button, rather than as a badge on it. */}
      {hasPendingFilters && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          The designation or month has changed — press Calculate Salary to run it.
        </p>
      )}

      {/* The month at a glance. The status tabs used to sit here; they belong on
          the grid's own header, beside the rows they re-read. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {period && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CalendarRange className="size-3.5" />
            Cycle {formatDate(period.from)} — {formatDate(period.to)}
          </span>
        )}
        {companyTotals && (
          <>
            <Chip
              icon={UsersRound}
              tone="text-foreground"
              value={companyTotals.totalEmployees}
              label="total"
            />
            <Chip
              icon={CheckCircle2}
              tone="text-emerald-600 dark:text-emerald-400"
              value={companyTotals.salaryDone}
              label="processed"
            />
            <Chip
              icon={Clock}
              tone="text-amber-600 dark:text-amber-500"
              value={companyTotals.salaryPending}
              label="pending"
            />
          </>
        )}
      </div>
    </div>
  )
}

/** A labelled toolbar control — the same frame for each of the three. */
function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

/**
 * One of the company's month counts. Always the whole company, not the filtered
 * register — these read as progress through the payroll, and a count that moved
 * with the designation filter would say nothing about how much is left to run.
 */
function Chip({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: typeof UsersRound
  tone: string
  value: number
  label: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', tone)}>
      <Icon className="size-3.5" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}
