import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { IpAccessMode, IpAddressFormValues } from '../schemas'
import {
  createIpAddress,
  deleteIpAddress,
  updateIpAccessMode,
  updateIpAddress,
} from './ip-address-api'

/**
 * Every write here invalidates `ipAddress.all`, which covers the mode read as
 * well as the list pages: adding, retyping or removing an entry moves the
 * allowed/blocked counts the header states.
 */

/** POST /user/ip-addresses — add an entry, then refresh the list + header. */
export function useCreateIpAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: IpAddressFormValues) => createIpAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ipAddress.all })
    },
  })
}

/**
 * PATCH /user/ip-addresses/:id — edit an entry, then refresh the list + header.
 *
 * The id rides with the values rather than being bound at hook time: the form
 * lives in a dialog that switches rows without remounting.
 */
export function useUpdateIpAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: IpAddressFormValues }) =>
      updateIpAddress(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ipAddress.all })
    },
  })
}

/** DELETE /user/ip-addresses/:id — remove an entry, then refresh the list. */
export function useDeleteIpAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteIpAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ipAddress.all })
    },
  })
}

/**
 * PUT /user/ip-addresses/mode — switch the company's access mode.
 *
 * Only the header changes, but the whole family is invalidated anyway: the mode
 * decides which of the two lists is actually enforcing anything, so the rows are
 * read differently after the switch.
 *
 * The endpoint re-checks the caller's password, so it rides along with the mode
 * rather than being read from anywhere — nothing keeps it after the request.
 */
export function useUpdateIpAccessMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mode, password }: { mode: IpAccessMode; password: string }) =>
      updateIpAccessMode(mode, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ipAddress.all })
    },
  })
}
