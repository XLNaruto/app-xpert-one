import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { SUPPORT_TICKET_DEFAULT_SORT } from '../constants'
import { supportTicketResponseSchema, supportTicketsResponseSchema } from '../schemas'
import {
  supportTicketToPayload,
  supportTicketToUpdatePayload,
  toSupportTicket,
} from '../lib/support-ticket-mappers'
import type {
  SupportReopenPayload,
  SupportTicketFormValues,
  SupportTicketPayload,
  SupportTicketUpdatePayload,
} from '../schemas'
import type { SupportTicket, SupportTicketFilters } from '../types'

/**
 * Help & Support — `/user/support/tickets`. Offset-paginated (`?limit=&offset=`,
 * limit capped at 100) answering `{ items, total }`, with `search` matched
 * server-side against the ticket code, subject and description.
 *
 * ACCOUNT-scoped: nothing here takes a `company_id`, because a ticket names no
 * company. Every user of the account sees every ticket the account raised — a
 * support query belongs to the organization, so a colleague can follow one up
 * while its author is away.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * `search` / `sort` / `sort_by` as the endpoint spells them, plus the screen's
 * facets. Order is always sent — left off, the server's own default decides it,
 * and a list whose order isn't pinned can repeat or skip rows as the user pages.
 *
 * `open_only` and `status` are mutually exclusive in practice: the first is
 * "any of the three unfinished statuses", so a specific pick wins over it.
 */
function queryParams(params: PageParams, filters?: SupportTicketFilters) {
  const status = filters?.status?.trim()
  return {
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(!status && filters?.openOnly ? { open_only: 'true' } : {}),
    ...(filters?.ticketType ? { ticket_type: filters.ticketType } : {}),
    ...(filters?.priority ? { priority: filters.priority } : {}),
    sort: params.sort ?? SUPPORT_TICKET_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (SUPPORT_TICKET_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/support/tickets — one page of the organization's tickets.
 *
 * `ALL_ROWS` (a negative limit) means "every ticket": the API caps a request at
 * 100, so that case walks the pages until `total` is covered.
 */
export async function fetchSupportTickets(
  params: PageParams = ALL_ROWS,
  filters?: SupportTicketFilters,
): Promise<Paginated<SupportTicket>> {
  try {
    const query = queryParams(params, filters)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.SUPPORT_TICKETS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = supportTicketsResponseSchema.parse(raw)
      return { items: items.map(toSupportTicket), total }
    }

    const collected: SupportTicket[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.SUPPORT_TICKETS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = supportTicketsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toSupportTicket))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load your support tickets.")
  }
}

/**
 * GET /user/support/tickets/:id — one ticket, with the raiser and the plan that
 * priced its deadline already resolved to names.
 *
 * A ticket belonging to another organization answers 404, not 403: it isn't
 * visible here at all.
 */
export async function fetchSupportTicket(id: number): Promise<SupportTicket> {
  try {
    const raw = await http.get<unknown>(endpoints.SUPPORT_TICKETS.GET(id))
    return toSupportTicket(supportTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Ticket not found')
  }
}

/**
 * POST /user/support/tickets — raise a query with the platform desk.
 *
 * The desk and the severity together select one cell of the subscription's
 * support promise, and the response comes back with that deadline already
 * resolved. A subscription promising nothing for the combination still raises
 * the ticket, with `sla_value` and `due_at` null.
 */
export async function createSupportTicket(
  values: SupportTicketFormValues,
): Promise<SupportTicket> {
  try {
    const raw = await http.post<unknown, SupportTicketPayload>(
      endpoints.SUPPORT_TICKETS.POST,
      supportTicketToPayload(values),
    )
    return toSupportTicket(supportTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't raise the ticket.")
  }
}

/**
 * PATCH /user/support/tickets/:id — correct the wording.
 *
 * Subject and description only. The window closes the moment an admin first
 * touches the ticket (409 after that), which the list and detail screens
 * anticipate by withdrawing the Edit action — see `canEditWording`.
 */
export async function updateSupportTicket(
  id: number,
  values: SupportTicketFormValues,
): Promise<SupportTicket> {
  try {
    const raw = await http.patch<unknown, SupportTicketUpdatePayload>(
      endpoints.SUPPORT_TICKETS.PATCH(id),
      supportTicketToUpdatePayload(values),
    )
    return toSupportTicket(supportTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the ticket.")
  }
}

/**
 * POST /user/support/tickets/:id/reopen — hand a finished ticket back.
 *
 * Only from `resolved` or `closed` (409 otherwise). The reason is appended to
 * the description because the resolution is CLEARED — a ticket that is open
 * again has none. The deadline does not move: reopening doesn't re-buy it.
 */
export async function reopenSupportTicket(
  id: number,
  reason: string,
): Promise<SupportTicket> {
  try {
    const raw = await http.post<unknown, SupportReopenPayload>(
      endpoints.SUPPORT_TICKETS.REOPEN(id),
      { reason: reason.trim() },
    )
    return toSupportTicket(supportTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't reopen the ticket.")
  }
}

/**
 * POST /user/support/tickets/:id/close — accept the resolution and file it away.
 *
 * Only from `resolved` (409 otherwise), and idempotent, so a double-click can't
 * re-stamp `closed_at`. There is no delete on this resource: the platform's SLA
 * and severity reports are counted over these rows.
 */
export async function closeSupportTicket(id: number): Promise<SupportTicket> {
  try {
    const raw = await http.post<unknown>(endpoints.SUPPORT_TICKETS.CLOSE(id))
    return toSupportTicket(supportTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't close the ticket.")
  }
}
