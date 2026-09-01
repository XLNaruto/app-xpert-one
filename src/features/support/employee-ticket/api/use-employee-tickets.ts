import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import {
  fetchEmployeeTicket,
  fetchEmployeeTicketSummary,
  fetchEmployeeTicketWorkSessions,
  fetchEmployeeTickets,
} from './employee-ticket-api'
import type { EmployeeTicketFilters } from '../types'

/**
 * GET /user/employee-support-tickets — the queue, most severe then oldest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Every filter
 * is applied server-side, so they travel in the key: each combination is its own
 * result set rather than a slice of the unfiltered one.
 */
export function useEmployeeTickets(
  params: PageParams = ALL_ROWS,
  filters?: EmployeeTicketFilters,
) {
  // Spelled out rather than passed through, so the key holds exactly what
  // narrows the result set and nothing the hook might grow later.
  const scope = {
    status: filters?.status ?? '',
    openOnly: filters?.openOnly ?? false,
    category: filters?.category ?? '',
    priority: filters?.priority ?? '',
    companyId: filters?.companyId ?? '',
    assignedToUserId: filters?.assignedToUserId ?? '',
    unassignedOnly: filters?.unassignedOnly ?? false,
  }

  return useQuery({
    queryKey: queryKeys.employeeSupportTicket.list(params, scope),
    queryFn: () => fetchEmployeeTickets(params, filters),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/employee-support-tickets/summary — the tab strip's counts.
 *
 * Keyed on the NON-status filters only, which is exactly what the endpoint
 * takes: the counts must not move when the user switches tabs, or every tab
 * would report its own number and four zeroes.
 *
 * `assignedToUserId` IS one of them — "how much is on Priya's plate, per status"
 * is a real question. `unassignedOnly` is not: it carries its own status
 * predicate, so a summary honouring it would report three zeroes by
 * construction, and the endpoint refuses it for that reason.
 */
export function useEmployeeTicketSummary(filters?: EmployeeTicketFilters) {
  const scope = {
    companyId: filters?.companyId ?? '',
    category: filters?.category ?? '',
    priority: filters?.priority ?? '',
    assignedToUserId: filters?.assignedToUserId ?? '',
  }

  return useQuery({
    queryKey: queryKeys.employeeSupportTicket.summary(scope),
    queryFn: () => fetchEmployeeTicketSummary(filters),
    placeholderData: keepPreviousData,
  })
}

/**
 * GET /user/employee-support-tickets/:id — the ticket and its whole thread.
 *
 * One key for both, because the API answers them in one call: posting a reply
 * invalidates this and the conversation comes back with it.
 */
export function useEmployeeTicket(id: number) {
  return useQuery({
    queryKey: queryKeys.employeeSupportTicket.detail(id),
    queryFn: () => fetchEmployeeTicket(id),
    enabled: Number.isFinite(id),
  })
}

/**
 * GET /user/employee-support-tickets/:id/work-sessions — the breakdown behind
 * the ticket's hands-on effort.
 *
 * Its own key rather than part of the detail read, because it's a panel the
 * reader opens: a ticket screen shouldn't pay for a second round trip nobody
 * looked at. A stretch that's still running counts up to now, so this is left
 * to refetch normally rather than being held.
 */
export function useEmployeeTicketWorkSessions(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.employeeSupportTicket.workSessions(id),
    queryFn: () => fetchEmployeeTicketWorkSessions(id),
    enabled: enabled && Number.isFinite(id),
  })
}
