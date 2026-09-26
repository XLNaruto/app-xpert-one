import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { isValidWindow } from '../lib/shift-schedule-mappers'
import { fetchEmployeeSchedule, fetchShiftSchedules } from './shift-schedule-api'
import type { ScheduleFilters } from '../types'

/**
 * GET /user/shift-schedules — one page of employees over the window.
 *
 * `companyId` is the session's active company: it's what the api fn sends, and
 * it rides in the key so a company switch is a different result set. Nothing is
 * asked without one, nor for a window the API would refuse.
 */
export function useShiftSchedules(
  filters: ScheduleFilters,
  params: PageParams,
  companyId: number | null,
) {
  return useQuery({
    queryKey: queryKeys.shiftSchedule.list({ companyId, ...filters }, params),
    queryFn: () => fetchShiftSchedules(filters, params),
    enabled: companyId !== null && isValidWindow(filters.from, filters.to),
    // Keep the previous page (or month) on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/shift-schedules/employees/:id — one employee's window. */
export function useEmployeeSchedule(employeeId: number, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.shiftSchedule.employee(employeeId, from, to),
    queryFn: () => fetchEmployeeSchedule(employeeId, from, to),
    enabled: Number.isFinite(employeeId) && isValidWindow(from, to),
  })
}
