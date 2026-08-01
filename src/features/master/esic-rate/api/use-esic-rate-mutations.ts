import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { EsicRateFormValues } from '../schemas'
import { createEsicRate, deleteEsicRate, updateEsicRate } from './esic-rate-api'

/** POST /esic-rates — create a rate slab, then refresh the list. */
export function useCreateEsicRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EsicRateFormValues) => createEsicRate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esicRate.all })
    },
  })
}

/** PATCH /esic-rates/:id — update a rate slab, then refresh the list + detail. */
export function useUpdateEsicRate(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EsicRateFormValues) => updateEsicRate(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esicRate.all })
    },
  })
}

/** DELETE /esic-rates/:id — remove a rate slab, then refresh the list. */
export function useDeleteEsicRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEsicRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esicRate.all })
    },
  })
}
