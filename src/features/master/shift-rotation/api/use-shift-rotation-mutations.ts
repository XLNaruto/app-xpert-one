import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { ShiftRotationFormValues } from '../schemas'
import {
  createShiftRotation,
  deleteShiftRotation,
  updateShiftRotation,
} from './shift-rotation-api'

/** POST /user/shift-rotations — create a rotation, then refresh the master. */
export function useCreateShiftRotation(companyId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ShiftRotationFormValues) =>
      createShiftRotation(values, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftRotation.all })
    },
  })
}

/**
 * PATCH /user/shift-rotations/:id — update a rotation, then refresh list + detail.
 *
 * The employee reads go too: editing the cycle changes which shift every assigned
 * employee is on from now on, so a resolved-shift answer on screen is stale.
 */
export function useUpdateShiftRotation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ShiftRotationFormValues) => updateShiftRotation(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftRotation.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/** DELETE /user/shift-rotations/:id — remove a rotation, then refresh the master. */
export function useDeleteShiftRotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteShiftRotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftRotation.all })
    },
  })
}
