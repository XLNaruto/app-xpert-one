import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { EmploymentExchangeOfficeAddressFormValues } from '../schemas'
import {
  createEmploymentExchangeOfficeAddress,
  deleteEmploymentExchangeOfficeAddress,
  updateEmploymentExchangeOfficeAddress,
} from './employment-exchange-office-address-api'

/** POST /employment-exchange-office-addresses — create an office, then refresh the list. */
export function useCreateEmploymentExchangeOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmploymentExchangeOfficeAddressFormValues) => createEmploymentExchangeOfficeAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employmentExchangeOfficeAddress.all })
    },
  })
}

/** PUT /employment-exchange-office-addresses/:id — update an office, then refresh the list + detail. */
export function useUpdateEmploymentExchangeOfficeAddress(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmploymentExchangeOfficeAddressFormValues) =>
      updateEmploymentExchangeOfficeAddress(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employmentExchangeOfficeAddress.all })
    },
  })
}

/** DELETE /employment-exchange-office-addresses/:id — remove an office, then refresh the list. */
export function useDeleteEmploymentExchangeOfficeAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEmploymentExchangeOfficeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employmentExchangeOfficeAddress.all })
    },
  })
}
