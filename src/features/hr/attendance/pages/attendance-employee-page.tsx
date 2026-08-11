import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { Forbidden, NotFound } from '@/features/error'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { DAY_STATUS_LABEL, DAY_STATUS_LEGEND, DAY_STATUS_TONE } from '../constants'
import { useAttendanceEmployee } from '../hooks/use-attendance-employee'
import { AttendanceDayDialog } from '../components/attendance-day-dialog'
import { AttendanceMonthCalendar } from '../components/attendance-month-calendar'

/**
 * One employee's month, as a calendar.
 *
 * This is the screen that answers "why". The group screens count a day as absent
 * on one test — did this person punch — and consult no leave, holiday or
 * weekly-off register; here every day arrives already resolved against all
 * three, which is why a cell can say Off Day or On Leave where the list could
 * only say Absent.
 *
 * The month is stepped from the page's own controls rather than the calendar's,
 * so the control that moves the view is the one that moves the query.
 */
export function AttendanceEmployeePage({ data }: { data?: string }) {
  const employee = useAttendanceEmployee(data)

  if (!employee.hasEmployee) {
    return (
      <NotFound
        title="Employee not found"
        description="That attendance link is missing or no longer readable. Open the employee again from Attendance Management."
      />
    )
  }
  if (employee.isForbidden) {
    return <Forbidden description={employee.forbiddenMessage} />
  }

  const counts = employee.counts

  return (
    <div className="space-y-5">
      {/* Header — who, and the way back to the group they were opened from. */}
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={employee.employeeName || '—'} className="size-10" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
            {employee.employeeName || 'Employee'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employee.employeeCode ? `Code: ${employee.employeeCode}` : 'Attendance'}
            {employee.weeklyOff ? ` · Weekly off: ${employee.weeklyOff}` : ''}
          </p>
        </div>
        {/* Switch to anyone else in the group this person was opened from,
            without going back for them. The options are the endpoint's own
            search, so a group larger than the API's 100-row page still finds
            the name being typed. */}
        {employee.canSwitchEmployee && (
          <Combobox
            value={
              employee.selectedEmployeeId ? String(employee.selectedEmployeeId) : ''
            }
            onChange={(value) => employee.changeEmployee(Number(value))}
            options={employee.employeeOptions.map((person) => {
              const name = person.fullName || person.name
              return {
                value: String(person.employeeId),
                label: person.code ? `${name} · ${person.code}` : name,
              }
            })}
            onSearchChange={employee.setRosterSearch}
            loading={employee.employeesLoading}
            placeholder={employee.employeeName || 'Select employee'}
            searchPlaceholder="Search name or code…"
            className="w-60"
            align="end"
          />
        )}

        <Button variant="outline" onClick={employee.goBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Month controls — Previous, the month itself, Next, spread across the
          board's width so the step buttons sit at the edges they step towards
          and the month reads as the board's heading.

          The picker names the month in words here rather than in digits: this is
          the title of what is on screen, not a field being filled in. Next is
          capped at the server's own today, since a future month has nothing on
          record to draw. */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => employee.stepMonth(-1)}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <MonthPicker
          value={employee.month}
          onChange={(value) => value && employee.setMonth(value)}
          maxDate={employee.today ? parseISO(employee.today) : undefined}
          display="long"
          className="w-48"
        />

        <Button
          variant="outline"
          onClick={() => employee.stepMonth(1)}
          disabled={
            Boolean(employee.today) &&
            employee.month >= format(parseISO(employee.today), 'yyyy-MM')
          }
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* How the month counted. */}
      {counts && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Count label="Present" value={counts.present} tone="text-emerald-600" />
          <Count label="Half Day" value={counts.halfDay} tone="text-amber-600" />
          <Count label="Absent" value={counts.absent} tone="text-rose-600" />
          <Count label="On Leave" value={counts.leave} tone="text-sky-600" />
          <Count label="Holiday" value={counts.holiday} tone="text-violet-600" />
          <Count label="Off Days" value={counts.weeklyOff} tone="text-slate-500" />
        </div>
      )}

      {/* Legend — above the board, because a colour nobody can name is decoration
          rather than information and the naming should come before the reading. */}
      <div className="flex flex-wrap items-center gap-2">
        {DAY_STATUS_LEGEND.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <span
              className={cn('size-2 rounded-full', DAY_STATUS_TONE[status].dot)}
              aria-hidden
            />
            {DAY_STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      {employee.isError ? (
        <Card className="p-6">
          <EmptyState
            title="Couldn't load the month"
            description={getApiErrorMessage(employee.error)}
          />
        </Card>
      ) : employee.isLoading ? (
        <Skeleton className="h-[34rem] rounded-xl" />
      ) : (
        <Card className="overflow-hidden p-1.5">
          <AttendanceMonthCalendar
            month={employee.month}
            dayByDate={employee.dayByDate}
            onSelectDay={employee.setOpenDay}
          />
        </Card>
      )}

      <AttendanceDayDialog
        day={employee.openDay}
        onClose={() => employee.setOpenDay(null)}
      />
    </div>
  )
}

/** One figure in the month's summary strip. */
function Count({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 font-heading text-xl font-semibold tabular-nums', tone)}>
        {value}
      </p>
    </div>
  )
}
