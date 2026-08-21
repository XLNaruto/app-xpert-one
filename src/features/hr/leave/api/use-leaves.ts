import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchLeave, fetchLeaves, type LeaveFilters } from './leave-api'

/**
 * GET /user/employee-leaves — one page of the register, paged, searched and
 * sorted server-side. Pass `filters.employeeId` to narrow it to one employee (the
 * employee detail screen's recent-leave panel does); leave it off for the
 * company-wide list.
 */
export function useLeaves(params: PageParams, filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: queryKeys.leave.list(filters.employeeId, params, {
      status: filters.status ?? '',
      leaveTypeId: filters.leaveTypeId ?? 0,
      payType: filters.payType ?? '',
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
