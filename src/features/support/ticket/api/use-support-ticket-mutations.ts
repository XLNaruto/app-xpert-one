import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { SupportTicketFormValues } from '../schemas'
import {
  closeSupportTicket,
  createSupportTicket,
  reopenSupportTicket,
  updateSupportTicket,
} from './support-ticket-api'

/**
 * Every mutation on this resource invalidates `supportTicket.all` — one prefix
 * that covers the list under any filter combination plus the detail read. A
 * transition changes the status a filtered list is selecting on, so refreshing
 * only the current page would leave the other tabs stale.
 */

/** POST /user/support/tickets — raise a ticket, then refresh the list. */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: SupportTicketFormValues) => createSupportTicket(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTicket.all })
    },
  })
}

/** PATCH /user/support/tickets/:id — correct the wording, then refresh. */
export function useUpdateSupportTicket(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: SupportTicketFormValues) => updateSupportTicket(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTicket.all })
    },
  })
}

/** POST /user/support/tickets/:id/reopen — hand it back with a reason. */
export function useReopenSupportTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      reopenSupportTicket(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTicket.all })
    },
  })
}

/** POST /user/support/tickets/:id/close — accept the resolution and file it away. */
export function useCloseSupportTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => closeSupportTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTicket.all })
    },
  })
}
