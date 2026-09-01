import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { uploadFile } from '@/lib/uploads'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { EMPLOYEE_TICKET_DEFAULT_SORT } from '../constants'
import {
  SUPPORT_ATTACHMENT_CONTENT_TYPES,
  employeeTicketMessageResponseSchema,
  employeeTicketResponseSchema,
  employeeTicketSummaryResponseSchema,
  employeeTicketWorkSessionsResponseSchema,
  employeeTicketsResponseSchema,
} from '../schemas'
import {
  toEmployeeTicket,
  toEmployeeTicketMessage,
  toEmployeeTicketSummary,
  toEmployeeTicketWorkSessions,
} from '../lib/employee-ticket-mappers'
import type {
  EmployeeTicketAssigneePayload,
  EmployeeTicketMessagePayload,
  EmployeeTicketStatusPayload,
} from '../schemas'
import type {
  EmployeeTicket,
  EmployeeTicketFilters,
  EmployeeTicketMessage,
  EmployeeTicketSummary,
  EmployeeTicketWorkSessions,
} from '../types'

/**
 * The employee help desk — `/user/employee-support-tickets`. Offset-paginated
 * (`?limit=&offset=`, limit capped at 100) answering `{ items, total }`, with
 * `search` matched server-side against the ticket code, subject and description.
 *
 * ACCOUNT-scoped across every company unless `company_id` narrows it: the desk
 * is staffed by people, not by company, so an HR user covering two branches sees
 * both without switching screens.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * The narrowing filters, as the endpoint spells them. Shared by the list and the
 * summary — the summary takes the same set MINUS the status ones, since a
 * summary that honoured the tab you were already on would report four zeroes and
 * one number.
 */
function filterParams(filters?: EmployeeTicketFilters) {
  return {
    ...(filters?.companyId ? { company_id: Number(filters.companyId) } : {}),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.priority ? { priority: filters.priority } : {}),
    // "What is on one person's plate". The summary takes this one too — a count
    // per status for one desk is a meaningful thing to report.
    ...(filters?.assignedToUserId
      ? { assigned_to_user_id: Number(filters.assignedToUserId) }
      : {}),
  }
}

/**
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 *
 * `status`, `open_only` and `unassigned_only` are mutually exclusive in
 * practice: the last two each mean "any of the three unfinished statuses", so a
 * specific pick wins over both, and `unassigned_only` — which carries that
 * predicate itself — wins over `open_only`.
 *
 * `unassigned_only` is LIST-ONLY. The summary would report three zeroes by
 * construction, which is why it isn't in {@link filterParams}.
 */
function queryParams(params: PageParams, filters?: EmployeeTicketFilters) {
  const status = filters?.status?.trim()
  const unassignedOnly = Boolean(filters?.unassignedOnly)
  return {
    ...filterParams(filters),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    ...(!unassignedOnly && status ? { status } : {}),
    ...(unassignedOnly ? { unassigned_only: 'true' } : {}),
    ...(!unassignedOnly && !status && filters?.openOnly ? { open_only: 'true' } : {}),
    sort: params.sort ?? EMPLOYEE_TICKET_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (EMPLOYEE_TICKET_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/employee-support-tickets — one page of the queue.
 *
 * `ALL_ROWS` (a negative limit) means "every ticket": the API caps a request at
 * 100, so that case walks the pages until `total` is covered.
 */
export async function fetchEmployeeTickets(
  params: PageParams = ALL_ROWS,
  filters?: EmployeeTicketFilters,
): Promise<Paginated<EmployeeTicket>> {
  try {
    const query = queryParams(params, filters)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.EMPLOYEE_SUPPORT_TICKETS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = employeeTicketsResponseSchema.parse(raw)
      return { items: items.map(toEmployeeTicket), total }
    }

    const collected: EmployeeTicket[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.EMPLOYEE_SUPPORT_TICKETS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = employeeTicketsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toEmployeeTicket))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load the employee help desk.")
  }
}

/**
 * GET /user/employee-support-tickets/summary — the tab strip's counts.
 *
 * One round trip rather than five list calls, so a company with four thousand
 * tickets still renders its badges cheaply. Deliberately given the filters MINUS
 * the status ones.
 */
export async function fetchEmployeeTicketSummary(
  filters?: EmployeeTicketFilters,
): Promise<EmployeeTicketSummary> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEE_SUPPORT_TICKETS.SUMMARY, {
      params: filterParams(filters),
    })
    return toEmployeeTicketSummary(employeeTicketSummaryResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the queue counts.")
  }
}

/**
 * GET /user/employee-support-tickets/:id — the ticket AND its whole thread.
 *
 * One call, and the conversation comes back whole rather than paged. A ticket
 * belonging to another organization answers 404, not 403: it isn't visible here
 * at all.
 */
export async function fetchEmployeeTicket(id: number): Promise<EmployeeTicket> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEE_SUPPORT_TICKETS.GET(id))
    return toEmployeeTicket(employeeTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Ticket not found')
  }
}

/**
 * POST /user/employee-support-tickets/:id/messages — reply on a ticket.
 *
 * The file, when there is one, goes straight to storage on a presigned PUT first
 * and only its `key` travels here — nothing ever passes through the API. Two
 * first-time-only side effects follow on the server: the first office reply
 * stamps `first_response_at`, and an `open` or `reopened` ticket moves to
 * `in_progress`, because answering is picking it up.
 */
export async function postEmployeeTicketMessage(
  id: number,
  body: string,
  attachment?: File | null,
): Promise<EmployeeTicketMessage> {
  const attachmentKey = attachment
    ? await uploadFile(
        endpoints.UPLOADS.SUPPORT_ATTACHMENT,
        attachment,
        SUPPORT_ATTACHMENT_CONTENT_TYPES,
      )
    : undefined

  try {
    const raw = await http.post<unknown, EmployeeTicketMessagePayload>(
      endpoints.EMPLOYEE_SUPPORT_TICKETS.MESSAGES(id),
      {
        body: body.trim(),
        ...(attachmentKey ? { attachment_url: attachmentKey } : {}),
      },
    )
    return toEmployeeTicketMessage(employeeTicketMessageResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't send the reply.")
  }
}

/**
 * PATCH /user/employee-support-tickets/:id/status — move the ticket along.
 *
 * One route for all three transitions, picked by `status`, with a UNION body:
 * `resolved` demands its note (which is PUSHED to the employee's device), and
 * the other two take nothing at all. The office cannot re-grade priority here —
 * it's the raiser's statement, and nothing is promised behind it.
 */
export async function updateEmployeeTicketStatus(
  id: number,
  payload: EmployeeTicketStatusPayload,
): Promise<EmployeeTicket> {
  try {
    const raw = await http.patch<unknown, EmployeeTicketStatusPayload>(
      endpoints.EMPLOYEE_SUPPORT_TICKETS.STATUS(id),
      payload,
    )
    return toEmployeeTicket(employeeTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the ticket.")
  }
}

/**
 * PATCH /user/employee-support-tickets/:id/assignee — hand it over, or let it go.
 *
 * `null` is a real value, not an omission: it releases the ticket back to the
 * unassigned queue. Everything else is the server's — when, by whom, and the
 * source, which is always `user` from here even when somebody assigns a ticket
 * to themselves. That's a decision, not a pick-up.
 *
 * The STATUS is untouched: a reassigned `in_progress` ticket is still in
 * progress, just with somebody else. An open work stretch closes on hand-over,
 * so the outgoing handler keeps the minutes they actually spent, and
 * `is_being_worked` correctly goes false until the new handler picks it up.
 *
 * Idempotent, the null-to-null case included.
 *
 * - 404 — the target is not a user of your account, or does not exist
 * - 409 — the target is inactive, or the ticket is CLOSED (a resolved one can
 *   be reassigned on purpose: a fix that may not hold is exactly when the
 *   follow-up goes to somebody else)
 */
export async function updateEmployeeTicketAssignee(
  id: number,
  assignedToUserId: number | null,
): Promise<EmployeeTicket> {
  try {
    const raw = await http.patch<unknown, EmployeeTicketAssigneePayload>(
      endpoints.EMPLOYEE_SUPPORT_TICKETS.ASSIGNEE(id),
      { assigned_to_user_id: assignedToUserId },
    )
    return toEmployeeTicket(employeeTicketResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't change who is handling this ticket.")
  }
}

/**
 * GET /user/employee-support-tickets/:id/work-sessions — the "who spent what"
 * behind the ticket's hands-on effort.
 *
 * Oldest first and deliberately NOT paged: a help ticket accumulates a handful
 * of stretches, not a feed.
 */
export async function fetchEmployeeTicketWorkSessions(
  id: number,
): Promise<EmployeeTicketWorkSessions> {
  try {
    const raw = await http.get<unknown>(
      endpoints.EMPLOYEE_SUPPORT_TICKETS.WORK_SESSIONS(id),
    )
    return toEmployeeTicketWorkSessions(
      employeeTicketWorkSessionsResponseSchema.parse(raw),
    )
  } catch (error) {
    throw toApiError(error, "Couldn't load the work sessions.")
  }
}
