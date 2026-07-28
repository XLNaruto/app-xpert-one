import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { LwfRateFormValues } from '../schemas'
import { createLwfRate, deleteLwfRate, updateLwfRate } from './lwf-rate-api'

/** POST /lwf-rates — create a rate, then refresh the list. */
export function useCreateLwfRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LwfRateFormValues) => createLwfRate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lwfRate.all })
    },
  })
}

/** PUT /lwf-rates/:id — update a rate, then refresh the list + detail. */
export function useUpdateLwfRate(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LwfRateFormValues) => updateLwfRate(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lwfRate.all })
    },
  })
}

/** DELETE /lwf-rates/:id — remove a rate, then refresh the list. */
export function useDeleteLwfRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteLwfRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lwfRate.all })
    },
  })
}
