import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchDesignationLeaveQuotas,
  fetchEmployeeLeaveQuotas,
  saveDesignationLeaveQuotas,
  saveEmployeeLeaveQuotas,
} from './leave-quota-api'
import type { LeaveQuotaSaveRow } from '../types'

/**
 * The two allowance grids and their saves.
 *
 * A save writes the tier the balance is computed from, so it invalidates the leave
 * key alongside its own: every employee's balance card and every overflow warning
 * on the leave form is now reading a stale allowance.
 */
function useInvalidateQuotas() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leaveQuota.all })
    // The balance and the form's overflow warning are both derived from these.
    queryClient.invalidateQueries({ queryKey: queryKeys.leave.all })
  }
}

/** GET /user/designations/:id/leave-quotas — the role's standing policy. */
export function useDesignationLeaveQuotas(designationId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.leaveQuota.designation(designationId ?? 0),
    queryFn: () => fetchDesignationLeaveQuotas(designationId as number),
    enabled: designationId !== undefined && Number.isFinite(designationId),
  })
}

/** PUT /user/designations/:id/leave-quotas — whole-list replace. */
export function useSaveDesignationLeaveQuotas(designationId: number) {
  const invalidate = useInvalidateQuotas()
  return useMutation({
    mutationFn: (rows: LeaveQuotaSaveRow[]) =>
      saveDesignationLeaveQuotas(designationId, rows),
    onSuccess: invalidate,
  })
}

/** GET /user/employees/:id/leave-quotas?year= — the per-year grant. */
export function useEmployeeLeaveQuotas(employeeId: number | undefined, year: number) {
  return useQuery({
    queryKey: queryKeys.leaveQuota.employee(employeeId ?? 0, year),
    queryFn: () => fetchEmployeeLeaveQuotas(employeeId as number, year),
    enabled: employeeId !== undefined && Number.isFinite(employeeId),
  })
}

/** PUT /user/employees/:id/leave-quotas?year= — whole-list replace, that year only. */
export function useSaveEmployeeLeaveQuotas(employeeId: number, year: number) {
  const invalidate = useInvalidateQuotas()
  return useMutation({
    mutationFn: (rows: LeaveQuotaSaveRow[]) =>
      saveEmployeeLeaveQuotas(employeeId, year, rows),
    onSuccess: invalidate,
  })
}
