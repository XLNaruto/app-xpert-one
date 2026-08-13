import { Building2, CalendarDays, Filter, FileText, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'
import { Field } from '@/components/common/form-field'
import { formatIsoMonth, REPORT_MONTH_OPTIONS, reportMonthName } from '../constants'
import type { ReportTypeOption } from '../types'

interface ReportFilterCardProps<TType extends string> {
  /** "Salary Report Filters", "PF Report Filters", … */
  title: string
  types: readonly ReportTypeOption<TType>[]
  type: TType
  onTypeChange: (value: TType) => void
  /** The draft period — used when the selected type reads one month. */
  month: number
  onMonthChange: (value: number) => void
  year: number
  onYearChange: (value: number) => void
  yearOptions: ComboboxOption[]
  /** The draft range — used when the selected type reads `from`…`to`. */
  from: string
  onFromChange: (value: string) => void
  to: string
  onToChange: (value: string) => void
  monthBounds: { minDate: Date; maxDate: Date }
  isRangeInvalid: boolean
  departmentId: number | null
  onDepartmentChange: (value: number | null) => void
  departmentOptions: ComboboxOption[]
  departmentsLoading: boolean
  employeeIds: number[]
  onEmployeesChange: (value: number[]) => void
  employeeOptions: ComboboxOption[]
  employeesLoading: boolean
  onApply: () => void
  canApply: boolean
  isFetching: boolean
  /** Whether anything has been read yet — the helper line changes once it has. */
  hasApplied: boolean
}

/**
 * What report to read, for whom, and when — the one control every report screen
 * opens with.
 *
 * The filters are a DRAFT: nothing is read until "Filter Data" is pressed, and
 * the chips beside the heading describe what is on screen rather than what is
 * being typed. A report is a wide aggregation over a whole month, so a
 * half-changed filter set firing a request on its own would be a read nobody
 * asked for — unlike the app's ordinary lists, which read straight through.
 *
 * Type comes first because it decides the rest: the Gross Salary type spans a
 * range of periods rather than one, so it swaps Month + Year for two month
 * pickers. Department and Employee are both optional — omitted means the whole
 * company, which is the read most statutory questions start from.
 */
export function ReportFilterCard<TType extends string>({
  title,
  types,
  type,
  onTypeChange,
  month,
  onMonthChange,
  year,
  onYearChange,
  yearOptions,
  from,
  onFromChange,
  to,
  onToChange,
  monthBounds,
  isRangeInvalid,
  departmentId,
  onDepartmentChange,
  departmentOptions,
  departmentsLoading,
  employeeIds,
  onEmployeesChange,
  employeeOptions,
  employeesLoading,
  onApply,
  canApply,
  isFetching,
  hasApplied,
}: ReportFilterCardProps<TType>) {
  const selected = types.find((option) => option.value === type) ?? types[0]
  const typeOptions: ComboboxOption[] = types.map((option) => ({
    label: option.label,
    value: option.value,
  }))

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row flex-wrap items-center gap-2 border-b border-border/60">
        <span className="inline-flex items-center gap-2 font-heading text-sm font-semibold">
          <Filter className="size-4 text-primary" />
          {title}
        </span>
        {/* What the table below is showing — deliberately the applied values, so
            the chips don't advertise a filter that hasn't been read yet. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{selected.label}</Badge>
          <Badge variant="secondary">
            {selected.isRange
              ? `${formatIsoMonth(from)} — ${formatIsoMonth(to)}`
              : `${reportMonthName(month)} ${year}`}
          </Badge>
          <Badge variant="outline">
            {departmentId
              ? (departmentOptions.find((o) => o.value === String(departmentId))?.label ??
                'Department')
              : 'All departments'}
          </Badge>
          {employeeIds.length > 0 && (
            <Badge variant="outline">
              {employeeIds.length} {employeeIds.length === 1 ? 'employee' : 'employees'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Five controls, always: Type, the period (one field or two), Department
            and Employee. They share one row at full width and fold to three then
            two as it narrows — none of them is wider than the others, because
            none is a more important choice than the others. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Type" required hint={selected.description}>
            <Combobox
              value={type}
              onChange={(value) => onTypeChange(value as TType)}
              options={typeOptions}
              icon={FileText}
              placeholder="Select a report"
              searchPlaceholder="Search report types…"
            />
          </Field>

          {selected.isRange ? (
            <>
              {/* One control per end of the range, not four dropdowns: `from` and
                  `to` are periods, and picking August 2026 shouldn't be two
                  decisions that can be left half-made. */}
              <Field label="From Month" required>
                <MonthPicker
                  value={from}
                  onChange={onFromChange}
                  minDate={monthBounds.minDate}
                  maxDate={monthBounds.maxDate}
                  invalid={isRangeInvalid}
                />
              </Field>
              <Field
                label="To Month"
                required
                error={isRangeInvalid ? 'The range starts after it ends.' : undefined}
              >
                <MonthPicker
                  value={to}
                  onChange={onToChange}
                  minDate={monthBounds.minDate}
                  maxDate={monthBounds.maxDate}
                  invalid={isRangeInvalid}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Month" required>
                <Combobox
                  value={String(month)}
                  onChange={(value) => onMonthChange(Number(value))}
                  options={REPORT_MONTH_OPTIONS}
                  icon={CalendarDays}
                  placeholder="Select a month"
                  searchable={false}
                />
              </Field>
              <Field label="Year" required>
                <Combobox
                  value={String(year)}
                  onChange={(value) => onYearChange(Number(value))}
                  options={yearOptions}
                  icon={CalendarDays}
                  placeholder="Select a year"
                  searchable={false}
                />
              </Field>
            </>
          )}

          <Field
            label="Department"
            hint="Leave it clear to report on the whole company. The PT and ESIC establishment details are only filled in once a department is chosen."
          >
            <Combobox
              value={departmentId === null ? '' : String(departmentId)}
              onChange={(value) => onDepartmentChange(value ? Number(value) : null)}
              options={departmentOptions}
              icon={Building2}
              placeholder={departmentsLoading ? 'Loading…' : 'All departments'}
              searchPlaceholder="Search departments…"
              clearable
            />
          </Field>

          <Field
            label="Employee"
            hint="Narrow the report to specific people. Leave it clear for everyone."
          >
            <Combobox
              multiple
              value={employeeIds.map(String)}
              onChange={(value) => onEmployeesChange(value.map(Number))}
              options={employeeOptions}
              icon={UsersRound}
              placeholder={employeesLoading ? 'Loading…' : 'All employees'}
              searchPlaceholder="Search employees…"
            />
          </Field>
        </div>

        {/* The action sits below the fields on its own line rather than in a grid
            cell of its own: a button stretched to a column's width reads as a
            sixth field, and this is the one thing on the card that isn't one.
            The line explaining it goes on the left, where reading starts. */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-border/60 pt-3">
          <p className="mr-auto text-xs text-muted-foreground">
            {hasApplied
              ? 'Change a filter and press “Filter Data” to read the report again.'
              : 'Press “Filter Data” to load the report into the table below.'}
          </p>
          <Button
            type="button"
            onClick={onApply}
            disabled={!canApply || isFetching}
            className="min-w-36"
          >
            <Filter className="size-4" />
            {isFetching ? 'Loading…' : 'Filter Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
