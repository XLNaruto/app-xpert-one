import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { EsicOfficeAddressFormValues } from '../schemas'
import {
  createEsicOfficeAddress,
  deleteEsicOfficeAddress,
  updateEsicOfficeAddress,
} from './esic-office-address-api'

/** POST /esic-office-addresses — create an office, then refresh the list. */
export function useCreateEsicOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EsicOfficeAddressFormValues) => createEsicOfficeAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esicOfficeAddress.all })
    },
  })
}

/** PUT /esic-office-addresses/:id — update an office, then refresh the list + detail. */
export function useUpdateEsicOfficeAddress(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EsicOfficeAddressFormValues) =>
      updateEsicOfficeAddress(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esicOfficeAddress.all })
    },
  })
}

/** DELETE /esic-office-addresses/:id — remove an office, then refresh the list. */
export function useDeleteEsicOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEsicOfficeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.esicOfficeAddress.all })
    },
  })
}
