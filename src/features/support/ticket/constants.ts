import type { ComboboxOption } from '@/components/ui/combobox'
import type { SupportTicketFilters } from './types'
import type { SupportTicketFormValues } from './schemas'

/**
 * The `sort` values `/user/support/tickets` accepts. Sorting is server-side, so
 * a column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const SUPPORT_TICKET_SORT = {
  createdAt: 'created_at',
  dueAt: 'due_at',
  priority: 'priority',
  status: 'status',
} as const

/**
 * Newest first — deliberately NOT the desk's severity-then-deadline ranking.
 * This screen is a history of what we asked, not a queue of work; the employee
 * desk is the one that ranks. An order is always sent anyway: an unpinned one
 * can repeat or skip rows as the user pages.
 */
export const SUPPORT_TICKET_DEFAULT_SORT = {
  id: SUPPORT_TICKET_SORT.createdAt,
  desc: true,
}

/** A facet's "no filter" value. */
export const ALL_FILTER = ''

/** The two desks, as the form and the filter spell them. */
export const SUPPORT_TICKET_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Technical', value: 'technical' },
  { label: 'Billing', value: 'billing' },
]

/** Severity, mildest first — the order it's read in, not the queue's order. */
export const SUPPORT_PRIORITY_OPTIONS: ComboboxOption[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
]

export const SUPPORT_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
  { label: 'Reopened', value: 'reopened' },
]

/** Human labels for the raw API values, for a cell or a detail row. */
export const SUPPORT_TICKET_TYPE_LABELS: Record<string, string> = {
  technical: 'Technical',
  billing: 'Billing',
}

export const SUPPORT_PRIORITY_LABELS: Record<string, string> = {
  normal: 'Normal',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
}

/** No filter applied — every ticket the organization has ever raised. */
export const EMPTY_SUPPORT_TICKET_FILTERS: SupportTicketFilters = {
  status: ALL_FILTER,
  openOnly: false,
  ticketType: ALL_FILTER,
  priority: ALL_FILTER,
}

/**
 * A fresh ticket: the technical desk at normal severity.
 *
 * Normal is the deliberate default. Severity is taken at face value and kept
 * forever as `raised_priority` — marking everything critical buys a shorter
 * deadline and a poor record, so the form makes the mild answer the easy one.
 */
export const EMPTY_SUPPORT_TICKET_FORM: SupportTicketFormValues = {
  subject: '',
  description: '',
  ticketType: 'technical',
  priority: 'normal',
}
