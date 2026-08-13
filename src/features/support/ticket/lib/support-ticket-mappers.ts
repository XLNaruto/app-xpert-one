import {
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_TYPE_LABELS,
} from '../constants'
import type {
  SupportTicketFormValues,
  SupportTicketPayload,
  SupportTicketResponse,
  SupportTicketUpdatePayload,
} from '../schemas'
import type { SupportTicket } from '../types'

/** One ticket, snake_case → camelCase. Every deadline field is already derived. */
export function toSupportTicket(response: SupportTicketResponse): SupportTicket {
  return {
    id: response.id,
    code: response.code,
    subject: response.subject,
    description: response.description,
    ticketType: response.ticket_type,
    status: response.status,
    priority: response.priority,
    raisedPriority: response.raised_priority,
    planName: response.plan_name ?? null,
    slaValue: response.sla_value ?? null,
    slaUnit: response.sla_unit ?? null,
    dueAt: response.due_at ?? null,
    isOverdue: response.is_overdue,
    daysRemaining: response.days_remaining ?? null,
    raisedByUserId: response.raised_by_user_id,
    raisedByName: response.raised_by_name ?? null,
    firstResponseAt: response.first_response_at ?? null,
    resolvedAt: response.resolved_at ?? null,
    resolutionNote: response.resolution_note ?? null,
    closedAt: response.closed_at ?? null,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  }
}

/** Validated form values → the create body. All four fields are required. */
export function supportTicketToPayload(
  values: SupportTicketFormValues,
): SupportTicketPayload {
  return {
    subject: values.subject.trim(),
    description: values.description.trim(),
    ticket_type: values.ticketType,
    priority: values.priority,
  }
}

/**
 * Validated form values → the PATCH body, which corrects the WORDING only.
 *
 * The desk and the severity are deliberately absent: they selected the SLA cell
 * that became this ticket's deadline, and the endpoint refuses to change either
 * at any point. Raise a new ticket instead.
 */
export function supportTicketToUpdatePayload(
  values: SupportTicketFormValues,
): SupportTicketUpdatePayload {
  return {
    subject: values.subject.trim(),
    description: values.description.trim(),
  }
}

/** Hydrate the edit form from a stored ticket. */
export function supportTicketToFormValues(
  ticket: SupportTicket,
): SupportTicketFormValues {
  return {
    subject: ticket.subject,
    description: ticket.description,
    ticketType: ticket.ticketType,
    priority: ticket.priority,
  }
}

/**
 * Whether the wording can still be corrected.
 *
 * The window closes the moment the desk first touches the ticket — rewriting the
 * question under someone who has started answering it is how a resolution ends
 * up addressing something the ticket no longer says. A finished ticket is out
 * for the same reason.
 */
export function canEditWording(ticket: SupportTicket): boolean {
  if (ticket.firstResponseAt) return false
  return ticket.status === 'open' || ticket.status === 'reopened'
}

/** Only a finished ticket can be handed back — there's nothing to reopen otherwise. */
export function canReopen(ticket: SupportTicket): boolean {
  return ticket.status === 'resolved' || ticket.status === 'closed'
}

/**
 * Closing is accepting the resolution, so only a RESOLVED ticket offers it. To
 * let an unanswered query go, the desk resolves it with a note saying so.
 */
export function canClose(ticket: SupportTicket): boolean {
  return ticket.status === 'resolved'
}

export const ticketTypeLabel = (value: string) =>
  SUPPORT_TICKET_TYPE_LABELS[value] ?? value

export const priorityLabel = (value: string) => SUPPORT_PRIORITY_LABELS[value] ?? value

export const statusLabel = (value: string) => SUPPORT_STATUS_LABELS[value] ?? value

/**
 * The promise in words — "8 hours", "3 days", or nothing at all when the
 * subscription made none for this desk at this severity.
 */
export function slaLabel(ticket: Pick<SupportTicket, 'slaValue' | 'slaUnit'>): string | null {
  if (ticket.slaValue === null || ticket.slaUnit === null) return null
  const unit = ticket.slaValue === 1 ? ticket.slaUnit.replace(/s$/, '') : ticket.slaUnit
  return `${ticket.slaValue} ${unit}`
}

/**
 * How the deadline reads on a row: overdue, due in N days, or nothing when no
 * promise was made. `daysRemaining` is whole days and goes negative once
 * breached, so the two cases are the same number read differently.
 */
export function dueLabel(
  ticket: Pick<SupportTicket, 'dueAt' | 'isOverdue' | 'daysRemaining' | 'status'>,
): string | null {
  if (!ticket.dueAt) return null
  if (ticket.status === 'resolved' || ticket.status === 'closed') return null
  if (ticket.isOverdue) {
    const over = ticket.daysRemaining === null ? null : Math.abs(ticket.daysRemaining)
    return over ? `Overdue by ${over} day${over === 1 ? '' : 's'}` : 'Overdue'
  }
  if (ticket.daysRemaining === null) return null
  if (ticket.daysRemaining <= 0) return 'Due today'
  return `${ticket.daysRemaining} day${ticket.daysRemaining === 1 ? '' : 's'} left`
}
