import {
  ASSIGNMENT_SOURCE_LABELS,
  EMPLOYEE_TICKET_CATEGORY_LABELS,
  EMPLOYEE_TICKET_PRIORITY_LABELS,
  EMPLOYEE_TICKET_STATUS_LABELS,
} from '../constants'
import type {
  EmployeeTicketMessageResponse,
  EmployeeTicketResponse,
  EmployeeTicketSummaryResponse,
  EmployeeTicketWorkSessionResponse,
  EmployeeTicketWorkSessionsResponse,
} from '../schemas'
import type {
  EmployeeTicket,
  EmployeeTicketMessage,
  EmployeeTicketSummary,
  EmployeeTicketWorkSession,
  EmployeeTicketWorkSessions,
} from '../types'

/** One thread message, snake_case → camelCase. */
export function toEmployeeTicketMessage(
  response: EmployeeTicketMessageResponse,
): EmployeeTicketMessage {
  return {
    id: response.id,
    authorType: response.author_type,
    authorName: response.author_name ?? null,
    body: response.body,
    attachmentUrl: response.attachment_url ?? null,
    createdAt: response.created_at,
  }
}

/**
 * One ticket. `messages` only comes back on the detail read, so it defaults to
 * an empty thread rather than being modelled as a second type — a list row
 * genuinely has no conversation attached, it just carries the count.
 */
export function toEmployeeTicket(response: EmployeeTicketResponse): EmployeeTicket {
  return {
    id: response.id,
    code: response.code,
    subject: response.subject,
    description: response.description,
    category: response.category,
    priority: response.priority,
    status: response.status,
    attachmentUrl: response.attachment_url ?? null,
    employeeId: response.employee_id,
    employeeName: response.employee_name ?? null,
    employeeCode: response.employee_code ?? null,
    companyId: response.company_id,
    companyName: response.company_name ?? null,
    firstResponseAt: response.first_response_at ?? null,
    resolvedAt: response.resolved_at ?? null,
    resolvedByUserId: response.resolved_by_user_id ?? null,
    resolvedByName: response.resolved_by_name ?? null,
    resolutionNote: response.resolution_note ?? null,
    closedAt: response.closed_at ?? null,
    messageCount: response.message_count,
    ageDays: response.age_days,

    assignedToUserId: response.assigned_to_user_id ?? null,
    assignedToName: response.assigned_to_name ?? null,
    assignedAt: response.assigned_at ?? null,
    assignmentSource: response.assignment_source ?? null,
    needsPickup: response.needs_pickup,

    workStartedAt: response.work_started_at ?? null,
    activeWorkSeconds: response.active_work_seconds,
    isBeingWorked: response.is_being_worked,
    timeToFirstResponseSeconds: response.time_to_first_response_seconds ?? null,
    timeToStartSeconds: response.time_to_start_seconds ?? null,
    timeToResolveSeconds: response.time_to_resolve_seconds ?? null,
    wallClockSeconds: response.wall_clock_seconds,

    createdAt: response.created_at,
    updatedAt: response.updated_at,
    messages: (response.messages ?? []).map(toEmployeeTicketMessage),
  }
}

/** One work stretch, snake_case → camelCase. */
export function toEmployeeTicketWorkSession(
  response: EmployeeTicketWorkSessionResponse,
): EmployeeTicketWorkSession {
  return {
    id: response.id,
    userId: response.user_id,
    userName: response.user_name ?? null,
    startedAt: response.started_at,
    endedAt: response.ended_at ?? null,
    seconds: response.seconds,
  }
}

/** The breakdown behind a ticket's hands-on effort — summary plus its stretches. */
export function toEmployeeTicketWorkSessions(
  response: EmployeeTicketWorkSessionsResponse,
): EmployeeTicketWorkSessions {
  return {
    ticketId: response.ticket_id,
    summary: {
      sessions: response.summary.sessions,
      seconds: response.summary.seconds,
      handlers: response.summary.handlers,
      openSessions: response.summary.open_sessions,
    },
    items: response.items.map(toEmployeeTicketWorkSession),
  }
}

export function toEmployeeTicketSummary(
  response: EmployeeTicketSummaryResponse,
): EmployeeTicketSummary {
  return {
    open: response.open,
    inProgress: response.in_progress,
    resolved: response.resolved,
    closed: response.closed,
    reopened: response.reopened,
  }
}

/**
 * Picking a ticket up. Idempotent on one already in progress, so the action is
 * offered while it's unclaimed and withdrawn once it's finished — resolving
 * straight from `open` is allowed too, which is why this isn't a required step.
 *
 * On a desk with no router this is also how a ticket becomes YOURS: the same
 * call opens a work stretch, stamps `workStartedAt` the first time ever, and
 * self-claims the ticket when nobody holds it — no assign-then-start round trip.
 * One that somebody ELSE holds is left with them; taking it off them is the
 * assignee route.
 */
export function canPickUp(ticket: EmployeeTicket): boolean {
  return ticket.status === 'open' || ticket.status === 'reopened'
}

/**
 * Answering it. Reachable from `open`, `in_progress` and `reopened` alike — an
 * office that already knows the answer shouldn't have to pick a ticket up just
 * to put it down. Already resolved is a 409 rather than a silent overwrite.
 */
export function canResolve(ticket: EmployeeTicket): boolean {
  return (
    ticket.status === 'open' ||
    ticket.status === 'in_progress' ||
    ticket.status === 'reopened'
  )
}

/**
 * Filing it away — only from `resolved`. To let an unanswered query go, resolve
 * it with a note saying so; the table refuses a closed row carrying no
 * resolution.
 */
export function canCloseTicket(ticket: EmployeeTicket): boolean {
  return ticket.status === 'resolved'
}

/**
 * Whether a reply can still be posted. Only a CLOSED thread refuses (409) —
 * that conversation is over on both sides, so a message nobody will be told
 * about is a message into a void.
 */
export function canReply(ticket: EmployeeTicket): boolean {
  return ticket.status !== 'closed'
}

/**
 * Whether the ticket can be handed to somebody else.
 *
 * Only CLOSED refuses (409) — reassigning a filed ticket changes the record,
 * not the work. A **resolved** ticket can be reassigned on purpose: a fix that
 * may not hold is exactly when the follow-up goes to somebody else.
 */
export function canReassign(ticket: EmployeeTicket): boolean {
  return ticket.status !== 'closed'
}

/**
 * Whether releasing it back to the unassigned queue is on offer — only when
 * somebody actually holds it. Null-to-null is idempotent on the server, but an
 * action that visibly does nothing is worth not rendering.
 */
export function canRelease(ticket: EmployeeTicket): boolean {
  return canReassign(ticket) && ticket.assignedToUserId !== null
}

export const assignmentSourceLabel = (value: string | null) =>
  value ? (ASSIGNMENT_SOURCE_LABELS[value] ?? value) : null

/** Who is carrying it, or the fact that nobody is. */
export const assigneeLabel = (ticket: Pick<EmployeeTicket, 'assignedToName'>) =>
  ticket.assignedToName ?? 'Unassigned'

/**
 * Seconds as a compact duration — "3d 4h", "42m", "18s".
 *
 * Two units at most: on this screen the reader is comparing magnitudes (was
 * this minutes or days?), and a third unit only makes that harder. `null` in
 * means the thing being measured hasn't happened, so `null` out — the caller
 * says what "hasn't happened" means in its own words rather than showing a zero
 * that would read as "instant".
 */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null
  const total = Math.max(0, Math.floor(seconds))
  if (total < 60) return `${total}s`

  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
}

export const categoryLabel = (value: string) =>
  EMPLOYEE_TICKET_CATEGORY_LABELS[value] ?? value

export const priorityLabel = (value: string) =>
  EMPLOYEE_TICKET_PRIORITY_LABELS[value] ?? value

export const statusLabel = (value: string) =>
  EMPLOYEE_TICKET_STATUS_LABELS[value] ?? value

/** How the raiser is named on a row — the code disambiguates two same-named people. */
export function employeeLabel(
  ticket: Pick<EmployeeTicket, 'employeeName' | 'employeeCode'>,
): string {
  if (!ticket.employeeName) return ticket.employeeCode ?? '—'
  return ticket.employeeCode
    ? `${ticket.employeeName} (${ticket.employeeCode})`
    : ticket.employeeName
}

/** "Raised today" / "3 days ago" — this queue's substitute for a deadline. */
export function ageLabel(ageDays: number): string {
  if (ageDays <= 0) return 'Today'
  return `${ageDays} day${ageDays === 1 ? '' : 's'} ago`
}

/**
 * Whether an attachment key points at something the browser can show inline. A
 * PDF is offered as a link instead; the presign signs for nothing else.
 */
export function isImageAttachment(key: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(key)
}
