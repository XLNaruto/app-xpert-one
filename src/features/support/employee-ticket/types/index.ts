import type {
  AssignmentSourceValue,
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
 *   waited" is read from instead. The platform sells the tenant an SLA; a tenant
 *   does not sell one to its own staff.
 * - **No severity review.** One `priority`, and it is the raiser's — there is no
 *   raised-vs-graded pair and no downgrade verdict to render.
 * - **No routing.** Nothing auto-assigns. A ticket arrives belonging to nobody
 *   and stays there until somebody takes it or is given it, so there are no
 *   desks to distinguish beyond {@link needsPickup}.
 *
 * What the handling block below IS, then, is a record of what happened — a
 * different thing from a promise about what will happen.
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

  /* ── Who is handling it ─────────────────────────────────────────────────── */

  /**
   * The four assignment fields move together: all null, or all set. There is no
   * state where a ticket has an assignee but no timestamp.
   */
  assignedToUserId: number | null
  /** Null while nobody has taken it — nothing auto-assigns on this desk. */
  assignedToName: string | null
  assignedAt: string | null
  /** `self` — picked up; `user` — handed over by a colleague. */
  assignmentSource: AssignmentSourceValue | null
  /**
   * Outstanding AND unassigned, derived server-side. The badge for "waiting on
   * somebody to take this" — a resolved ticket nobody was assigned is history,
   * not a gap in the queue, so it reads false.
   */
  needsPickup: boolean

  /* ── How long it took ───────────────────────────────────────────────────── */

  /**
   * The first move to `in_progress` — when somebody STARTED. Not the same as
   * {@link firstResponseAt}, which is when the office first WROTE; neither
   * derives the other. Stamped once and never moved, a reopen included.
   */
  workStartedAt: string | null
  /**
   * EFFORT — hands-on time, not wall clock. The sum of every stretch somebody
   * was genuinely on the ticket, an open one counting up to now. This is the
   * only number here that isn't calendar time: a ticket picked up on Friday and
   * finished on Monday has three days of {@link wallClockSeconds} and perhaps
   * forty minutes of this.
   */
  activeWorkSeconds: number
  /**
   * Whether a stretch is open right now. `in_progress` with this false is a
   * normal, correct state — replying does NOT start the clock, so a thread
   * answered and waiting on the employee overnight isn't sixteen hours of work.
   */
  isBeingWorked: boolean
  /** ELAPSED, raised until first replied. Null until the office has answered. */
  timeToFirstResponseSeconds: number | null
  /** ELAPSED, raised until picked up. Null until work has begun. */
  timeToStartSeconds: number | null
  /** ELAPSED, raised until resolved. Null until it's resolved. */
  timeToResolveSeconds: number | null
  /**
   * ELAPSED and ALWAYS present — nights and weekends included, counting up to
   * now while the ticket is outstanding. What an untouched row is aged with.
   */
  wallClockSeconds: number

  createdAt: string
  updatedAt: string
  /**
   * The whole conversation, oldest first — present on the detail read only. It's
   * loaded WHOLE rather than paged: a help ticket holds a handful of messages,
   * and a conversation split across pages reads backwards.
   */
  messages: EmployeeTicketMessage[]
}

/** One stretch somebody spent on a ticket. */
export interface EmployeeTicketWorkSession {
  id: number
  userId: number
  userName: string | null
  startedAt: string
  /** Null means somebody has it RIGHT NOW, and `seconds` counts up to the present. */
  endedAt: string | null
  seconds: number
}

/**
 * The work-session breakdown — "who spent what" behind one ticket's hands-on
 * effort. `summary.seconds` always equals the ticket's `activeWorkSeconds`;
 * both are measured by the database, so they cannot drift apart.
 */
export interface EmployeeTicketWorkSessions {
  ticketId: number
  summary: {
    sessions: number
    seconds: number
    /** Distinct people who have been on it. */
    handlers: number
    /** Stretches still running — non-zero means somebody has it right now. */
    openSessions: number
  }
  /** Oldest first, and never paged. */
  items: EmployeeTicketWorkSession[]
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
  /**
   * One person's own desk — "what is on my plate". `''` is everybody's.
   * Accepted by the summary read too.
   */
  assignedToUserId: string
  /**
   * Outstanding work NOBODY has taken — the queue's real starting point.
   *
   * It carries its OWN status predicate (the three unfinished statuses), so it
   * neither needs nor combines with {@link openOnly} or a status tab. The
   * summary read deliberately does not accept it: a summary narrowed to
   * outstanding work would report three zeroes by construction.
   */
  unassignedOnly: boolean
}
