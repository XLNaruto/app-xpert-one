import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PtRateFormValues } from '../schemas'
import { createPtRate, deletePtRate, updatePtRate } from './pt-rate-api'

/** POST /user/pt-rates — create a rate with its slabs, then refresh the list. */
export function useCreatePtRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PtRateFormValues) => createPtRate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ptRate.all })
    },
  })
}

/**
 * PATCH /user/pt-rates/:id — update a rate and its slabs, then refresh the list
 * + detail.
 */
export function useUpdatePtRate(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PtRateFormValues) => updatePtRate(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ptRate.all })
    },
  })
}

/** DELETE /user/pt-rates/:id — remove a rate, then refresh the list. */
export function useDeletePtRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePtRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ptRate.all })
    },
  })
}
