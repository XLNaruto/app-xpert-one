import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PfRateFormValues } from '../schemas'
import { createPfRate, deletePfRate, updatePfRate } from './pf-rate-api'

/** POST /user/pf-rates — create a rate slab, then refresh the list. */
export function useCreatePfRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PfRateFormValues) => createPfRate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pfRate.all })
    },
  })
}

/** PATCH /user/pf-rates/:id — update a rate slab, then refresh the list + detail. */
export function useUpdatePfRate(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PfRateFormValues) => updatePfRate(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pfRate.all })
    },
  })
}

/** DELETE /user/pf-rates/:id — remove a rate slab, then refresh the list. */
export function useDeletePfRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePfRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pfRate.all })
    },
  })
}
