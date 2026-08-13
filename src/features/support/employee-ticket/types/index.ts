import type {
  EmployeeTicketCategoryValue,
  EmployeeTicketPriorityValue,
  EmployeeTicketStatusValue,
  MessageAuthorTypeValue,
} from '../schemas'

/** One message in a ticket's shared thread. */
export interface EmployeeTicketMessage {
  id: number
  /** `employee` — the raiser; `user` — somebody from our back office. */
  authorType: MessageAuthorTypeValue
  authorName: string | null
  body: string
  /**
   * A storage KEY, not a URL. Resolve it through `useMediaUrl()` before showing
   * it — the base comes from `GET /config`.
   */
  attachmentUrl: string | null
  createdAt: string
}

/**
 * One query an employee raised with THIS office from the mobile app.
 *
 * The mirror image of `SupportTicket`: there we ask the platform, here our own
 * people ask us. Two differences follow from that and shape the whole screen:
 *
 * - **No deadline.** Priority ranks this queue and nothing else — there is no
 *   `dueAt`, no SLA, and nothing to police. `ageDays` is what "how long has this
 *   waited" is read from instead.
 * - **No assignee.** A ticket is worked by whoever picks it up; who that was is
 *   recorded on the resolution and on each message, not on the ticket.
 */
export interface EmployeeTicket {
  id: number
  /** Sequential within the company, e.g. `HLP-000001`. */
  code: string
  subject: string
  description: string
  category: EmployeeTicketCategoryValue
  /** The EMPLOYEE's statement of how much it hurts. Not re-gradable from here. */
  priority: EmployeeTicketPriorityValue
  status: EmployeeTicketStatusValue
  /** The file the query was raised with — a payslip, a screenshot. A storage key. */
  attachmentUrl: string | null
  employeeId: number
  employeeName: string | null
  employeeCode: string | null
  /** The queue spans every company of the account unless it's narrowed. */
  companyId: number
  companyName: string | null
  /** When the back office first replied. Stamped once and never moved. */
  firstResponseAt: string | null
  resolvedAt: string | null
  resolvedByUserId: number | null
  resolvedByName: string | null
  resolutionNote: string | null
  closedAt: string | null
  messageCount: number
  /** Whole days since it was raised. */
  ageDays: number
  createdAt: string
  updatedAt: string
  /**
   * The whole conversation, oldest first — present on the detail read only. It's
   * loaded WHOLE rather than paged: a help ticket holds a handful of messages,
   * and a conversation split across pages reads backwards.
   */
  messages: EmployeeTicketMessage[]
}

/** The tab strip's counts — one per status, in a single round trip. */
export interface EmployeeTicketSummary {
  open: number
  inProgress: number
  resolved: number
  closed: number
  reopened: number
}

/** The queue's server-side filters, as the hook holds them. */
export interface EmployeeTicketFilters {
  /** One status, or `''` for every status. Driven by the tab strip. */
  status: string
  /** `'true'` narrows to the three unfinished statuses at once. */
  openOnly: boolean
  category: string
  priority: string
  /** `''` is every company of the account — the desk is staffed by people, not companies. */
  companyId: string
}
