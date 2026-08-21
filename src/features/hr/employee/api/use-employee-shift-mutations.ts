import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type {
  EmployeeRosterFormValues,
  EmployeeShiftAssignmentFormValues,
} from '../schemas'
import {
  createEmployeeRosterEntry,
  createEmployeeShiftAssignment,
  deleteEmployeeRosterEntry,
  deleteEmployeeShiftAssignment,
} from './employee-shift-api'

/**
 * Step 9's writes. Every one of them invalidates the whole employee key rather
 * than a single list: a new assignment, a dropped roster row and a deleted timeline
 * entry all change the answer to "which shift is this employee on today", so the
 * resolved-shift card has to re-read alongside the table that was written to.
 */

/** POST /user/employees/:id/shifts — assign a shift, or end an assignment. */
export function useCreateEmployeeShiftAssignment(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmployeeShiftAssignmentFormValues) =>
      createEmployeeShiftAssignment(employeeId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/** DELETE /user/employees/:id/shifts/:entryId — remove an entry typed by mistake. */
export function useDeleteEmployeeShiftAssignment(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) =>
      deleteEmployeeShiftAssignment(employeeId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/** POST /user/employees/:id/roster — override one date (replacing any entry on it). */
export function useCreateEmployeeRosterEntry(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmployeeRosterFormValues) =>
      createEmployeeRosterEntry(employeeId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/** DELETE /user/employees/:id/roster/:entryId — hand the date back to the chain. */
export function useDeleteEmployeeRosterEntry(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => deleteEmployeeRosterEntry(employeeId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}
