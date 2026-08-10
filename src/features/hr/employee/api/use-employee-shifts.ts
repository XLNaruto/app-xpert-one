import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import {
  fetchEmployeeRoster,
  fetchEmployeeShiftAssignments,
  fetchEmployeeShiftOnDay,
} from './employee-shift-api'

/**
 * GET /user/employees/:id/shift — which shift the employee is on for one date, and
 * which link of the precedence chain answered.
 *
 * The date is part of the key: asking about another day is a different question,
 * not a refetch of this one. Any date works, past or future, so the tab can walk a
 * rotation forward without anything being materialised.
 */
export function useEmployeeShiftOnDay(employeeId: number, date: string) {
  return useQuery({
    queryKey: queryKeys.employee.shiftOnDay(employeeId, date),
    queryFn: () => fetchEmployeeShiftOnDay(employeeId, date || undefined),
    enabled: Number.isFinite(employeeId),
    // Keep the previous day's answer on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/employees/:id/shifts — the assignment timeline, newest first.
 *
 * Unpaginated by design, and an empty list is the healthy default state: it means
 * the employee follows their department's or company's shift.
 */
export function useEmployeeShiftAssignments(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.shiftTimeline(employeeId),
    queryFn: () => fetchEmployeeShiftAssignments(employeeId),
    enabled: Number.isFinite(employeeId),
  })
}

/**
 * GET /user/employees/:id/roster — the per-date overrides inside a window.
 *
 * The window is required by the endpoint and belongs in the key: a different month
 * is a different result set. Only the dates somebody overrode are rows.
 */
export function useEmployeeRoster(
  employeeId: number,
  from: string,
  to: string,
  params?: PageParams,
) {
  return useQuery({
    queryKey: queryKeys.employee.roster(employeeId, from, to, params),
    queryFn: () => fetchEmployeeRoster(employeeId, from, to, params),
    enabled: Number.isFinite(employeeId) && Boolean(from) && Boolean(to),
    placeholderData: keepPreviousData,
  })
}
