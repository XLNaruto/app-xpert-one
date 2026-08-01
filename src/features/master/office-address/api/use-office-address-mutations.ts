import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { OfficeAddressFormValues } from '../schemas'
import type { OfficeFor } from '../types'
import {
  createOfficeAddress,
  deleteOfficeAddress,
  updateOfficeAddress,
} from './office-address-api'

/**
 * Every mutation invalidates `officeAddress.all` rather than one screen's list:
 * all five screens read the same endpoint, so a write anywhere can change what
 * any of them shows.
 */

/** POST /user/office-addresses — create an address, then refresh the lists. */
export function useCreateOfficeAddress(officeFor: OfficeFor) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: OfficeAddressFormValues) =>
      createOfficeAddress(officeFor, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.officeAddress.all })
    },
  })
}

/** PATCH /user/office-addresses/:id — update an address, then refresh. */
export function useUpdateOfficeAddress(id: number, officeFor: OfficeFor) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: OfficeAddressFormValues) =>
      updateOfficeAddress(id, officeFor, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.officeAddress.all })
    },
  })
}

/** DELETE /user/office-addresses/:id — remove an address, then refresh. */
export function useDeleteOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteOfficeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.officeAddress.all })
    },
  })
}
