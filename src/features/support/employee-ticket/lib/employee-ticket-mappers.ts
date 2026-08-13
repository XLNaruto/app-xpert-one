import {
  EMPLOYEE_TICKET_CATEGORY_LABELS,
  EMPLOYEE_TICKET_PRIORITY_LABELS,
  EMPLOYEE_TICKET_STATUS_LABELS,
} from '../constants'
import type {
  EmployeeTicketMessageResponse,
  EmployeeTicketResponse,
  EmployeeTicketSummaryResponse,
} from '../schemas'
import type {
  EmployeeTicket,
  EmployeeTicketMessage,
  EmployeeTicketSummary,
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
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    messages: (response.messages ?? []).map(toEmployeeTicketMessage),
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
