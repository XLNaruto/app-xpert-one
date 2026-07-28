import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { LwfOfficeAddressFormValues } from '../schemas'
import {
  createLwfOfficeAddress,
  deleteLwfOfficeAddress,
  updateLwfOfficeAddress,
} from './lwf-office-address-api'

/** POST /lwf-office-addresses — create an office, then refresh the list. */
export function useCreateLwfOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LwfOfficeAddressFormValues) => createLwfOfficeAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lwfOfficeAddress.all })
    },
  })
}

/** PUT /lwf-office-addresses/:id — update an office, then refresh the list + detail. */
export function useUpdateLwfOfficeAddress(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LwfOfficeAddressFormValues) =>
      updateLwfOfficeAddress(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lwfOfficeAddress.all })
    },
  })
}

/** DELETE /lwf-office-addresses/:id — remove an office, then refresh the list. */
export function useDeleteLwfOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteLwfOfficeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lwfOfficeAddress.all })
    },
  })
}
