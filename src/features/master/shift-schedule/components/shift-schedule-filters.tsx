import { Building2, GitBranch } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { MonthPicker } from '@/components/ui/month-picker'
import { Field } from '@/components/common/form-field'
import type { PagedSelect } from '@/hooks/use-paged-select'
import { SCHEDULE_MAX_DAYS } from '../constants'
import type { ScheduleFilters } from '../types'

interface ShiftScheduleFiltersProps {
  filters: ScheduleFilters
  month: string
  onMonthChange: (value: string) => void
  /** The current month (`yyyy-MM`) — the month picker's × resets to it. */
  thisMonth: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  minTo: Date
  maxTo: Date
  onBranchChange: (value: number | null) => void
  onDepartmentChange: (value: number | null) => void
  branches: PagedSelect
  departments: PagedSelect
}

/**
 * Who and when the grid shows. Filters read straight through — the window is a
 * month at most, and each change is one page of employees.
 *
 * The month is a shortcut for the common case; From / To shape any window up to
 * 31 days, and the To picker can't reach past that, so the API's 422 is never met.
 */
export function ShiftScheduleFilters({
  filters,
  month,
  onMonthChange,
  thisMonth,
  onFromChange,
  onToChange,
  minTo,
  maxTo,
  onBranchChange,
  onDepartmentChange,
  branches,
  departments,
}: ShiftScheduleFiltersProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Branch">
            <Combobox
              value={filters.branchId === null ? '' : String(filters.branchId)}
              onChange={(value) => onBranchChange(value ? Number(value) : null)}
              {...branches}
              icon={GitBranch}
              placeholder="All Branches"
              searchPlaceholder="Search Branches…"
              clearable
            />
          </Field>

          <Field
            label="Department"
            hint={
              filters.branchId !== null ? "Only the picked branch's departments are listed." : undefined
            }
          >
            <Combobox
              value={filters.departmentId === null ? '' : String(filters.departmentId)}
              onChange={(value) => onDepartmentChange(value ? Number(value) : null)}
              {...departments}
              icon={Building2}
              placeholder="All Departments"
              searchPlaceholder="Search Departments…"
              clearable
            />
          </Field>

          <Field label="Month" required>
            <MonthPicker value={month} onChange={onMonthChange} resetTo={thisMonth} />
          </Field>

          <Field label="From" required>
            <DatePicker value={filters.from} onChange={onFromChange} clearable={false} />
          </Field>

          <Field label="To" required hint={`At most ${SCHEDULE_MAX_DAYS} days from “From”.`}>
            <DatePicker
              value={filters.to}
              onChange={onToChange}
              clearable={false}
              minDate={minTo}
              maxDate={maxTo}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  )
}
