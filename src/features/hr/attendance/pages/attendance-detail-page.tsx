import { ArrowLeft, Building2, Users } from 'lucide-react'
import { parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { Forbidden, NotFound } from '@/features/error'
import { cn, formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  ATTENDANCE_EMPLOYEE_PAGE_SIZE_OPTIONS,
  ATTENDANCE_STATUS_TABS,
} from '../constants'
import { useAttendanceDetail } from '../hooks/use-attendance-detail'
import { AttendanceEmployeeRow } from '../components/attendance-employee-row'
import { AttendancePager } from '../components/attendance-pager'
import { AttendanceRateBar } from '../components/attendance-rate-bar'
import { AttendanceSearchBox } from '../components/attendance-search-box'
import { AttendanceStatTiles } from '../components/attendance-stat-tiles'

/**
 * One card opened — the people behind a department (or designation) for the day.
 *
 * The group rides in on the encrypted `?data=` token the card wrote, day
 * included: a screen opened from yesterday's list keeps reporting on yesterday
 * rather than quietly switching to today.
 *
 * The pills are a server-side `?status=`, so each is its own read. The tiles
 * above them stay on the whole group's day whichever pill is active — standing
 * on the Absent side and still being told how many turned up is the point.
 */
export function AttendanceDetailPage({ data }: { data?: string }) {
  const detail = useAttendanceDetail(data)

  if (!detail.hasGroup) {
    return (
      <NotFound
        title="Group not found"
        description="That attendance link is missing or no longer readable. Open the group again from Attendance Management."
      />
    )
  }
  if (detail.isForbidden) return <Forbidden description={detail.forbiddenMessage} />

  const counts = detail.totals
  const levelLabel = detail.groupBy === 'department' ? 'Department' : 'Designation'

  return (
    <div className="space-y-5">
      {/* Header — the group's identity, and the two controls that re-aim the
          screen: another group of the same day, or the same group on another
          day. Both are a fresh server read, not a filter over what's loaded. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
            <Building2 className="size-5 shrink-0 text-primary" />
            <span className="truncate">
              {detail.group?.name ?? <Skeleton className="inline-block h-5 w-48" />}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {levelLabel}
            {detail.group?.code ? ` · ${detail.group.code}` : ''}
            {detail.date ? ` · ${formatDate(detail.date)}` : ''}
          </p>
        </div>

        <Combobox
          value={detail.selectedGroupId ? String(detail.selectedGroupId) : ''}
          onChange={(value) => detail.changeGroup(Number(value))}
          options={detail.groupOptions.map((group) => ({
            value: String(group.id),
            label: group.code ? `${group.name} · ${group.code}` : group.name,
          }))}
          loading={detail.groupsLoading}
          placeholder={`Select ${levelLabel.toLowerCase()}`}
          searchPlaceholder={`Search ${levelLabel.toLowerCase()}…`}
          className="w-56"
          align="end"
        />

        {/* Capped at the server's own today: the business day is bucketed in the
            attendance timezone, so tomorrow has nothing to report. `parseISO`
            keeps a date-only string off UTC midnight. */}
        <DatePicker
          value={detail.selectedDate || detail.date}
          onChange={detail.changeDate}
          maxDate={detail.today ? parseISO(detail.today) : undefined}
          className="w-44"
        />

        <Button variant="outline" onClick={detail.goBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <AttendanceStatTiles totals={counts} />

      <Card className="p-4">
        <AttendanceRateBar rate={counts?.attendanceRate ?? 0} />
      </Card>

      {/* The pills and the employee search. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
          {ATTENDANCE_STATUS_TABS.map((tab) => {
            const active = detail.status === tab.value
            const count =
              tab.value === 'present'
                ? counts?.present
                : tab.value === 'absent'
                  ? counts?.absent
                  : counts?.total
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => detail.changeStatus(tab.value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? tab.value === 'present'
                      ? 'bg-success/12 text-success'
                      : tab.value === 'absent'
                        ? 'bg-destructive/12 text-destructive'
                        : 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                {tab.label}
                <span className="rounded-full bg-background/70 px-1.5 text-xs tabular-nums">
                  {(count ?? 0).toLocaleString('en-IN')}
                </span>
              </button>
            )
          })}
        </div>

        <AttendanceSearchBox
          value={detail.search}
          onChange={detail.setSearch}
          placeholder="Search name or code…"
        />
      </div>

      {detail.isError ? (
        <Card className="p-6">
          <EmptyState
            title="Couldn't load the group"
            description={getApiErrorMessage(detail.error)}
          />
        </Card>
      ) : detail.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : detail.employees.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Users}
            title="Nobody to show"
            description={
              detail.search.trim()
                ? 'No employee in this group matches that search.'
                : `No ${detail.status === 'all' ? '' : detail.status} employee on this day.`
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {detail.employees.map((employee) => (
              <AttendanceEmployeeRow
                key={employee.employeeId}
                employee={employee}
                onOpen={() => detail.openEmployee(employee)}
              />
            ))}
          </div>

          <AttendancePager
            limit={detail.limit}
            offset={detail.offset}
            total={detail.total}
            onPaginationChange={detail.onPaginationChange}
            itemName="employees"
            pageSizeOptions={ATTENDANCE_EMPLOYEE_PAGE_SIZE_OPTIONS}
          />
        </div>
      )}
    </div>
  )
}
