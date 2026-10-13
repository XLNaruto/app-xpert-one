import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import {
  fetchSupportSubCategories,
  fetchSupportTicket,
  fetchSupportTickets,
} from './support-ticket-api'
import type { SupportTicketFilters } from '../types'
import type { SupportTicketTypeValue } from '../schemas'

/**
 * GET /user/support/tickets — the organization's tickets, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. The filters
 * are applied server-side, so they travel in the key: each combination is its
 * own result set rather than a slice of the unfiltered one.
 */
export function useSupportTickets(
  params: PageParams = ALL_ROWS,
  filters?: SupportTicketFilters,
) {
  // Spelled out rather than passed through, so the key holds exactly what
  // narrows the result set and nothing the hook might grow later.
  const scope = {
    status: filters?.status ?? '',
    openOnly: filters?.openOnly ?? false,
    ticketType: filters?.ticketType ?? '',
    priority: filters?.priority ?? '',
  }

  return useQuery({
    queryKey: queryKeys.supportTicket.list(params, scope),
    queryFn: () => fetchSupportTickets(params, filters),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/support/tickets/:id — one ticket, as the detail and edit screens read it. */
export function useSupportTicket(id: number) {
  return useQuery({
    queryKey: queryKeys.supportTicket.detail(id),
    queryFn: () => fetchSupportTicket(id),
    enabled: Number.isFinite(id),
  })
}

/**
 * GET /user/support-sub-categories?ticket_type= — one desk's sub-categories.
 * Call with no params for the whole list (the Raise Ticket dropdown). `enabled`
 * lets the form skip it where it can't be picked — an edit, where it's fixed.
 */
export function useSupportSubCategories(
  ticketType: SupportTicketTypeValue,
  params: PageParams = ALL_ROWS,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.supportSubCategory.list(ticketType, params),
    queryFn: () => fetchSupportSubCategories(ticketType, params),
    enabled: options.enabled ?? true,
  })
}
