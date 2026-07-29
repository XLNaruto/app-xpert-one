import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { AllowanceDeductionFormValues } from '../schemas'
import {
  createAllowanceDeduction,
  deleteAllowanceDeduction,
  updateAllowanceDeduction,
} from './allowance-deduction-api'

/** POST /allowance-deductions — create a record, then refresh the list. */
export function useCreateAllowanceDeduction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AllowanceDeductionFormValues) =>
      createAllowanceDeduction(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allowanceDeduction.all })
    },
  })
}

/** PUT /allowance-deductions/:id — update a record, then refresh list + detail. */
export function useUpdateAllowanceDeduction(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AllowanceDeductionFormValues) =>
      updateAllowanceDeduction(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allowanceDeduction.all })
    },
  })
}

/** DELETE /allowance-deductions/:id — remove a record, then refresh the list. */
export function useDeleteAllowanceDeduction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAllowanceDeduction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allowanceDeduction.all })
    },
  })
}
