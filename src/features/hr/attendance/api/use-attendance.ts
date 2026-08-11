import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import {
  fetchAttendanceGroupEmployees,
  fetchAttendanceGroups,
  fetchAttendanceMonth,
  type AttendanceEmployeeFilters,
} from './attendance-api'

/**
 * GET /user/attendance/groups — the landing screen's cards, paged and searched
 * server-side.
 *
 * `date` is part of the key even when it is `''` (meaning "whatever day the
 * server is in"): picking a day is a different read, not a refetch of this one,
 * so yesterday's cards must never sit under today's heading while the new day
 * loads.
 */
export function useAttendanceGroups(params: PageParams, date = '') {
  return useQuery({
    queryKey: queryKeys.attendance.groups(date, params),
    queryFn: () => fetchAttendanceGroups(params, date || undefined),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/attendance/groups/employees — the people behind one card.
 *
 * Disabled until there is a group to open, so a detail screen reached with a
 * missing or unreadable `?data=` token doesn't fire a request the API would
 * answer 400.
 */
export function useAttendanceGroupEmployees(
  params: PageParams,
  filters: AttendanceEmployeeFilters,
) {
  return useQuery({
    queryKey: queryKeys.attendance.groupEmployees(
      filters.groupBy,
      filters.groupId,
      filters.date ?? '',
      filters.status ?? 'all',
      params,
    ),
    queryFn: () => fetchAttendanceGroupEmployees(params, filters),
    enabled: Number.isFinite(filters.groupId) && filters.groupId > 0,
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/attendance/employee-detail — one employee's month grid.
 *
 * `placeholderData` keeps the month on screen while the next one loads, so
 * stepping through months redraws the grid rather than blanking it between
 * every click.
 */
export function useAttendanceMonth(employeeId: number, month: string) {
  return useQuery({
    queryKey: queryKeys.attendance.employeeMonth(employeeId, month),
    queryFn: () => fetchAttendanceMonth(employeeId, month),
    enabled: Number.isFinite(employeeId) && employeeId > 0 && Boolean(month),
    placeholderData: keepPreviousData,
  })
}
