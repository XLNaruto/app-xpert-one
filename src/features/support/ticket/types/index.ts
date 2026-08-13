import type {
  SupportPriorityValue,
  SupportSlaUnitValue,
  SupportStatusValue,
  SupportTicketTypeValue,
} from '../schemas'

/**
 * One query this organization raised with the PLATFORM help desk.
 *
 * The same shape serves the list and the detail screen — the API derives the
 * deadline fields on both, so nothing here is computed on the client.
 *
 * **The deadline was bought once and never moves.** `ticketType` and
 * `raisedPriority` together selected one cell of the subscription's support
 * promise; that cell is `slaValue`/`slaUnit`, and `createdAt + slaValue slaUnit`
 * is `dueAt`. Re-negotiating the plan doesn't re-price a ticket already raised,
 * and neither does reopening one.
 */
export interface SupportTicket {
  id: number
  /** Sequential within the organization, e.g. `TKT-000001`. Server-generated. */
  code: string
  subject: string
  description: string
  /** Which desk answers — also half of what priced the deadline. */
  ticketType: SupportTicketTypeValue
  status: SupportStatusValue
  /**
   * The severity in force. Normally what it was raised with; the desk may
   * re-grade it, which moves its queue position and never its deadline.
   */
  priority: SupportPriorityValue
  /** The severity WE chose. Never overwritten — it bought the deadline. */
  raisedPriority: SupportPriorityValue
  /** The plan whose promise priced the deadline. */
  planName: string | null
  /** Null when the subscription promises nothing for this desk + severity. */
  slaValue: number | null
  /** Null exactly when `slaValue` is. */
  slaUnit: SupportSlaUnitValue | null
  dueAt: string | null
  /** Past `dueAt` and still unfinished. Always false without a promise. */
  isOverdue: boolean
  /** Whole days left; negative once breached, null without a promise. */
  daysRemaining: number | null
  raisedByUserId: number
  /** A ticket belongs to the organization, so this may be a colleague. */
  raisedByName: string | null
  /**
   * When the desk first picked it up. Also what CLOSES the edit window: the
   * wording can't be corrected under someone who has started answering it.
   */
  firstResponseAt: string | null
  resolvedAt: string | null
  /** What the desk did. Cleared when the ticket is reopened. */
  resolutionNote: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

/** The list screen's server-side filters, as the hook holds them. */
export interface SupportTicketFilters {
  /** One status, or `''` for every status. */
  status: string
  /** `'true'` narrows to the three unfinished statuses at once. */
  openOnly: boolean
  ticketType: string
  priority: string
}
