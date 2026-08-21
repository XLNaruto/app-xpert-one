import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { ShiftDefaultScope, ShiftFormValues } from '../schemas'
import {
  clearDefaultShift,
  createShift,
  deleteShift,
  setDefaultShift,
  updateShift,
} from './shift-api'

/** POST /user/shifts — create a shift, then refresh the company's list. */
export function useCreateShift(companyId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ShiftFormValues) => createShift(values, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shift.all })
    },
  })
}

/**
 * PATCH /user/shifts/:id — update a shift, then refresh the list, detail and
 * history (all three hang off `shift.all`, and an edit can append a version).
 *
 * `withEffectiveDate` says whether this save writes a new dated version or amends
 * the one in force — see `updateShift`. The caller decides it from what the form
 * actually moved, since name and status aren't versioned.
 */
export function useUpdateShift(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      values,
      withEffectiveDate,
    }: {
      values: ShiftFormValues
      withEffectiveDate: boolean
    }) => updateShift(id, values, withEffectiveDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shift.all })
    },
  })
}

/** DELETE /user/shifts/:id — remove a shift, then refresh the list. */
export function useDeleteShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shift.all })
    },
  })
}

/**
 * POST /user/shifts/:id/set-default — pin one shift as the default for a company
 * or a department.
 *
 * The department master is invalidated alongside the shifts: a department's
 * default lives on the department, so its screen has to re-read to show it.
 */
export function useSetDefaultShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shiftId, scope }: { shiftId: number; scope: ShiftDefaultScope }) =>
      setDefaultShift(shiftId, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shift.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
    },
  })
}

/** POST /user/shifts/clear-default — drop a company's or a department's default. */
export function useClearDefaultShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (scope: ShiftDefaultScope) => clearDefaultShift(scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shift.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
    },
  })
}
