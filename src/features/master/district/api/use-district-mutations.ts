import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DistrictFormValues } from '../schemas'
import { createDistrict, deleteDistrict, updateDistrict } from './district-api'

/** POST /districts — create a district, then refresh the list. */
export function useCreateDistrict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DistrictFormValues) => createDistrict(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.district.all })
    },
  })
}

/** PUT /districts/:id — update a district, then refresh the list. */
export function useUpdateDistrict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: DistrictFormValues }) =>
      updateDistrict(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.district.all })
    },
  })
}

/** DELETE /districts/:id — remove a district, then refresh the list. */
export function useDeleteDistrict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDistrict(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.district.all })
    },
  })
}
