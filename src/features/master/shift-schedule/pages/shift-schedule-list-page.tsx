import { useMemo, useRef } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, CalendarCog } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { cn } from '@/lib/utils'
import { SCHEDULE_PAGE_SIZE_OPTIONS } from '../constants'
import { dateHeading } from '../lib/shift-schedule-mappers'
import { useShiftScheduleList } from '../hooks/use-shift-schedule-list'
import { TODAY_COLUMN_ATTR, useScrollToToday } from '../hooks/use-scroll-to-today'
import { ShiftScheduleCell } from '../components/shift-schedule-cell'
import { ShiftScheduleDayDialog } from '../components/shift-schedule-day-dialog'
import { ShiftScheduleFilters } from '../components/shift-schedule-filters'
import { ShiftScheduleGenerateDialog } from '../components/shift-schedule-generate-dialog'
import { ShiftScheduleSkippedNotice } from '../components/shift-schedule-skipped-notice'
import type { ScheduleEmployeeRow } from '../types'

/**
 * Off-Day Schedule — which days each employee is OFF and which they WORK, date by
 * date.
 *
 * Rows are employees, columns are the window's dates. Where a date has an entry
 * it outranks the week-off policy everywhere (attendance, salary); a "—" is a
 * date with none, which the policy still decides. Generate fills the window from
 * the policies; a click on a cell changes one date.
 */
export function ShiftScheduleListPage() {
  const list = useShiftScheduleList()
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.shiftSchedules)

  const { dates, today, day } = list
  const openCell = day.open

  // Land on today's column when a window containing it first shows rows.
  const gridRef = useRef<HTMLDivElement>(null)
  useScrollToToday(
    gridRef,
    `${list.filters.from}|${list.filters.to}`,
    !list.isLoading && list.rows.length > 0 && dates.includes(today),
  )

  const columns = useMemo<ColumnDef<ScheduleEmployeeRow>[]>(
    () => [
      {
        id: 'employee',
        header: 'Employee',
        enableSorting: false,
        meta: {
          className:
            // Fixed width, so the date columns take up the slack — with rows or
            // without (an empty search mustn't squash the dates into a corner).
            'sticky left-0 z-10 w-56 min-w-56 max-w-56 bg-card shadow-[1px_0_0_var(--color-border)]',
        },
        cell: ({ row }) => (
          <div className="truncate leading-tight">
            <span className="block truncate font-medium text-foreground">
              {row.original.employeeName || `#${row.original.employeeId}`}
            </span>
            {row.original.employeeCode && (
              <span className="text-xs text-muted-foreground">{row.original.employeeCode}</span>
            )}
          </div>
        ),
      },
      ...dates.map<ColumnDef<ScheduleEmployeeRow>>((date) => {
        const heading = dateHeading(date)
        return {
          id: date,
          enableSorting: false,
          meta: { className: 'min-w-14 px-1 text-center' },
          header: () => (
            <span
              {...(date === today ? { [TODAY_COLUMN_ATTR]: '' } : {})}
              className={cn(
                'flex flex-col items-center leading-tight',
                heading.weekend && 'text-primary',
                date === today && 'font-bold text-foreground',
              )}
            >
              <span>{heading.day}</span>
              <span className="text-[10px] font-normal normal-case">{heading.weekday}</span>
            </span>
          ),
          cell: ({ row }) => (
            <ShiftScheduleCell
              date={date}
              day={row.original.days.find((d) => d.workDate === date)}
              isToday={date === today}
              isPast={date < today}
              // A past date is read-only — attendance and salary already stand on it.
              onOpen={canUpdate && date >= today ? () => openCell(row.original, date) : undefined}
            />
          ),
        }
      }),
    ],
    [dates, today, canUpdate, openCell],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Off-Day Schedule"
        description="Which days each employee is off and which they work. A scheduled date outranks the week-off policy in attendance and salary."
        actions={
          canCreate &&
          list.companyId !== null && (
            <Button onClick={list.generate.open} disabled={list.generate.isRunning}>
              <CalendarCog className="size-4" />
              {list.generate.isRunning ? 'Generating…' : 'Generate'}
            </Button>
          )
        }
      />

      {list.companyId === null ? (
        <CompanyRequired what="the off-day schedule" />
      ) : (
        <>
          <ShiftScheduleFilters
            filters={list.filters}
            month={list.month}
            onMonthChange={list.setMonth}
            onFromChange={list.setFrom}
            onToChange={list.setTo}
            minTo={list.minTo}
            maxTo={list.maxTo}
            onBranchChange={list.setBranchId}
            onDepartmentChange={list.setDepartmentId}
            branches={list.branches}
            departments={list.departments}
          />

          {list.generate.result && (
            <ShiftScheduleSkippedNotice
              result={list.generate.result}
              onDismiss={list.generate.dismissResult}
            />
          )}

          <Legend />

          {list.isError ? (
            <ScopedDataError
              error={list.error}
              fallback="Couldn't load the off-day schedule."
              what="the off-day schedule"
            />
          ) : (
            <div ref={gridRef}>
              <DataTable
                columns={columns}
                data={list.rows}
                isLoading={list.isLoading}
                searchPlaceholder="Search by name or code…"
                itemName="employees"
                pageSize={list.limit}
                pageSizeOptions={SCHEDULE_PAGE_SIZE_OPTIONS}
                serverPagination
                limit={list.limit}
                offset={list.offset}
                total={list.total}
                onPaginationChange={list.onPaginationChange}
                searchValue={list.search}
                onSearchChange={list.setSearch}
                emptyState={
                  <EmptyState
                    icon={CalendarCheck}
                    title={list.search ? 'No matching employees' : 'No employees to schedule'}
                    description={
                      list.search
                        ? 'Try a different name or code.'
                        : 'Nobody matches these filters for this window.'
                    }
                  />
                }
              />
            </div>
          )}
        </>
      )}

      <ShiftScheduleDayDialog state={day} canDelete={canDelete} />
      <ShiftScheduleGenerateDialog state={list.generate} />
    </div>
  )
}

/** What the cells mean — the grid is dense enough that nobody should have to guess. */
function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded bg-success/15 px-1.5 py-0.5 font-semibold text-success">OFF</span>
        Scheduled off
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">W</span>
        Scheduled working
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="px-1.5">—</span>
        Not scheduled — the week-off policy decides
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-foreground">✎</span>
        Set by hand — Generate keeps it
      </span>
    </div>
  )
}
