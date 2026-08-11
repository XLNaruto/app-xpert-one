import { Building2 } from 'lucide-react'
import { parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { ATTENDANCE_GROUP_PAGE_SIZE_OPTIONS } from '../constants'
import { useAttendanceList } from '../hooks/use-attendance-list'
import { AttendanceGroupCard } from '../components/attendance-group-card'
import { AttendancePager } from '../components/attendance-pager'
import { AttendanceSearchBox } from '../components/attendance-search-box'
import { AttendanceStatTiles } from '../components/attendance-stat-tiles'

/**
 * Attendance Management — the company's day as cards.
 *
 * One read backs the whole screen: the three tiles at the top and one page of
 * cards under them. Which level the cards sit at is the server's answer, not a
 * control on the page — a company with departments is carded by department, one
 * with none by designation — so the headings follow `groupBy` rather than
 * hard-coding "Department".
 *
 * The search box narrows the *cards* (it matches a group's name and code, never
 * an employee), which is why the tiles above don't move while somebody types:
 * they are the company's day, not the visible page's.
 */
export function AttendanceListPage() {
  const attendance = useAttendanceList()

  if (attendance.isForbidden) {
    return <Forbidden description={attendance.forbiddenMessage} />
  }

  const levelLabel = attendance.groupBy === 'department' ? 'departments' : 'designations'

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        description={
          attendance.date
            ? `${formatDate(attendance.date)} · by ${attendance.groupBy}`
            : undefined
        }
        actions={
          /* The day is capped at the server's own today — the business day is
             bucketed in its attendance timezone, so tomorrow has nothing to
             report even where the browser has already turned over.

             `parseISO`, not `new Date(…)`: the bare constructor reads a
             date-only string as UTC midnight, which is the previous day in any
             western timezone and would bar today from being picked. */
          <DatePicker
            value={attendance.selectedDate || attendance.date}
            onChange={attendance.changeDate}
            maxDate={attendance.today ? parseISO(attendance.today) : undefined}
            className="w-44"
          />
        }
      />

      <div className="space-y-5">
        <AttendanceSearchBox
          value={attendance.search}
          onChange={attendance.setSearch}
          placeholder={`Search ${levelLabel}…`}
        />

        <AttendanceStatTiles totals={attendance.totals} />

        {attendance.isError ? (
          <Card className="p-6">
            <EmptyState
              title="Couldn't load attendance"
              description={getApiErrorMessage(attendance.error)}
            />
          </Card>
        ) : attendance.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : attendance.groups.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Building2}
              title={`No ${levelLabel} to show`}
              description={
                attendance.search.trim()
                  ? 'Nothing matches that search for this day.'
                  : 'Nobody is posted to a group for this day yet.'
              }
            />
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {attendance.groups.map((group) => (
                <AttendanceGroupCard
                  key={group.id}
                  group={group}
                  onOpen={() => attendance.openGroup(group)}
                />
              ))}
            </div>

            <AttendancePager
              limit={attendance.limit}
              offset={attendance.offset}
              total={attendance.total}
              onPaginationChange={attendance.onPaginationChange}
              itemName={levelLabel}
              pageSizeOptions={ATTENDANCE_GROUP_PAGE_SIZE_OPTIONS}
            />
          </>
        )}
      </div>
    </div>
  )
}
