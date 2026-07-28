import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { FactoryOfficeAddressFormValues } from '../schemas'
import {
  createFactoryOfficeAddress,
  deleteFactoryOfficeAddress,
  updateFactoryOfficeAddress,
} from './factory-office-address-api'

/** POST /factory-office-addresses — create an office, then refresh the list. */
export function useCreateFactoryOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: FactoryOfficeAddressFormValues) => createFactoryOfficeAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factoryOfficeAddress.all })
    },
  })
}

/** PUT /factory-office-addresses/:id — update an office, then refresh the list + detail. */
export function useUpdateFactoryOfficeAddress(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: FactoryOfficeAddressFormValues) =>
      updateFactoryOfficeAddress(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factoryOfficeAddress.all })
    },
  })
}

/** DELETE /factory-office-addresses/:id — remove an office, then refresh the list. */
export function useDeleteFactoryOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteFactoryOfficeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factoryOfficeAddress.all })
    },
  })
}
