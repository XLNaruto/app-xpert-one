import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { WageStructureRow } from '@/features/master/designation'
import {
  createEmployeeWage,
  deleteEmployeeWage,
  fetchEmployeeWage,
  updateEmployeeWage,
} from './employee-wage-api'

/**
 * Step 3's read and writes — the employee's own wage.
 *
 * Like every other step's mutation, each write invalidates `queryKeys.employee.all`
 * rather than only this resource: `completed_steps` rides on the employee record,
 * so a save here can flip a flag the wizard's progress ring reads.
 */

/** GET /user/employees/:id/wage. Gated on a saved employee, like the other steps. */
export function useEmployeeWage(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.wage(employeeId),
    queryFn: () => fetchEmployeeWage(employeeId),
    enabled: Number.isFinite(employeeId) && employeeId > 0,
  })
}

/** Refresh everything hung off one employee, the record itself included. */
function useInvalidateEmployee() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
}

/** POST — a new version, effective from the month the form picked. */
export function useCreateEmployeeWage(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (row: WageStructureRow) => createEmployeeWage(employeeId, row),
    onSuccess: invalidate,
  })
}

/** PATCH — a correction to one stored version, in place. */
export function useUpdateEmployeeWage(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({ wageId, row }: { wageId: number; row: WageStructureRow }) =>
      updateEmployeeWage(employeeId, wageId, row),
    onSuccess: invalidate,
  })
}

/** DELETE — withdraw one version; the designation prices those months again. */
export function useDeleteEmployeeWage(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (wageId: number) => deleteEmployeeWage(employeeId, wageId),
    onSuccess: invalidate,
  })
}
