import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchLeave, fetchLeaveBalance, fetchLeaves, type LeaveFilters } from './leave-api'

/**
 * GET /user/employee-leaves — one page of the register, paged, searched and
 * sorted server-side. Pass `filters.employeeId` to narrow it to one employee (the
 * employee detail screen's recent-leave panel does); leave it off for the
 * company-wide list.
 *
 * The page is one row per ROW — a split application arrives as two. Group them
 * with `groupLeaves()` before rendering.
 */
export function useLeaves(params: PageParams, filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: queryKeys.leave.list(filters.employeeId, params, {
      status: filters.status ?? '',
      leaveTypeId: filters.leaveTypeId ?? 0,
      payType: filters.payType ?? '',
      duration: filters.duration ?? '',
      fromDate: filters.fromDate ?? '',
      toDate: filters.toDate ?? '',
      pendingWithMe: filters.pendingWithMe ?? false,
    }),
    queryFn: () => fetchLeaves(params, filters),
    // A panel scoped to an employee has nothing to list until there is one.
    enabled: filters.employeeId === undefined || Number.isFinite(filters.employeeId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/employee-leaves/:id — the record the edit screen seeds its form from. */
export function useLeave(id: number) {
  return useQuery({
    queryKey: queryKeys.leave.detail(id),
    queryFn: () => fetchLeave(id),
    enabled: Number.isFinite(id),
  })
}

/**
 * GET /user/employee-leaves/balance — one employee's paid allowance for a year,
 * per leave type.
 *
 * Read the PER-TYPE lines, not the headline: allowances don't pool, so
 * `paid.available` is a sum of remainders and doesn't mean any one type has room.
 */
export function useLeaveBalance(employeeId: number | undefined, year: number) {
  return useQuery({
    queryKey: queryKeys.leave.balance(employeeId ?? 0, year),
    queryFn: () => fetchLeaveBalance(employeeId as number, year),
    enabled: employeeId !== undefined && Number.isFinite(employeeId),
  })
}
