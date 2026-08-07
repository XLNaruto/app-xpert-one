import { Briefcase, CalendarRange, CheckCircle2, Clock, Search, UsersRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'
import { cn, formatDate } from '@/lib/utils'
import { SALARY_STATUS_TABS } from '../constants'
import type { SalaryStatus } from '../schemas'
import type { SalaryPeriod, SalaryTotals } from '../types'

interface SalaryToolbarProps {
  designationId: number | null
  designationOptions: ComboboxOption[]
  designationsLoading: boolean
  onDesignationChange: (value: number | null) => void
  month: string
  monthBounds: { minDate: Date; maxDate: Date }
  onMonthChange: (value: string) => void
  status: SalaryStatus
  onStatusChange: (value: SalaryStatus) => void
  search: string
  onSearchChange: (value: string) => void
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
  status,
  onStatusChange,
  search,
  onSearchChange,
  period,
  companyTotals,
}: SalaryToolbarProps) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Designation" className="min-w-56 flex-1">
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

        <Field label="Salary Month" className="w-48">
          <MonthPicker
            value={month}
            onChange={onMonthChange}
            minDate={monthBounds.minDate}
            maxDate={monthBounds.maxDate}
          />
        </Field>

        <Field label="Search Employee" className="min-w-52 flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name or employee code…"
              className="pl-8"
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The two sides of the register — a different read, not a client filter. */}
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {SALARY_STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
                status === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
