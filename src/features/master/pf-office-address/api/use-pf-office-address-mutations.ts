import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PfOfficeAddressFormValues } from '../schemas'
import {
  createPfOfficeAddress,
  deletePfOfficeAddress,
  updatePfOfficeAddress,
} from './pf-office-address-api'

/** POST /pf-office-addresses — create an office, then refresh the list. */
export function useCreatePfOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PfOfficeAddressFormValues) => createPfOfficeAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pfOfficeAddress.all })
    },
  })
}

/** PUT /pf-office-addresses/:id — update an office, then refresh the list + detail. */
export function useUpdatePfOfficeAddress(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PfOfficeAddressFormValues) =>
      updatePfOfficeAddress(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pfOfficeAddress.all })
    },
  })
}

/** DELETE /pf-office-addresses/:id — remove an office, then refresh the list. */
export function useDeletePfOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePfOfficeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pfOfficeAddress.all })
    },
  })
}
