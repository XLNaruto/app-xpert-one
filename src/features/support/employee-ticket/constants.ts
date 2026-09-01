import type { ComboboxOption } from '@/components/ui/combobox'
import type { EmployeeTicketFilters } from './types'

/**
 * The `sort` values `/user/employee-support-tickets` accepts. Sorting is
 * server-side, so a column is sortable only if it appears here — the queue gives
 * each of these columns the API's field name as its column id, and marks the
 * rest unsortable.
 */
export const EMPLOYEE_TICKET_SORT = {
  createdAt: 'created_at',
  priority: 'priority',
  status: 'status',
  code: 'code',
} as const

/**
 * Most severe first — the endpoint's own ranking, and the right one here.
 *
 * This is a QUEUE, not a history: it is work waiting on somebody, so what hurts
 * most sits at the top. (The platform-desk screen deliberately opens the other
 * way round, newest-first, because there we are the ones waiting.)
 */
export const EMPLOYEE_TICKET_DEFAULT_SORT = {
  id: EMPLOYEE_TICKET_SORT.priority,
  desc: true,
}

/** A facet's "no filter" value. */
export const ALL_FILTER = ''

export const EMPLOYEE_TICKET_CATEGORY_OPTIONS: ComboboxOption[] = [
  { label: 'Salary', value: 'salary' },
  { label: 'Attendance', value: 'attendance' },
  { label: 'Leave', value: 'leave' },
  { label: 'Document', value: 'document' },
  { label: 'IT', value: 'it' },
  { label: 'Other', value: 'other' },
]

export const EMPLOYEE_TICKET_PRIORITY_OPTIONS: ComboboxOption[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
]

export const EMPLOYEE_TICKET_CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salary',
  attendance: 'Attendance',
  leave: 'Leave',
  document: 'Document',
  it: 'IT',
  other: 'Other',
}

export const EMPLOYEE_TICKET_PRIORITY_LABELS: Record<string, string> = {
  normal: 'Normal',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

/**
 * How the ticket became somebody's. Two values, not the platform console's
 * three — nothing auto-assigns on a desk with no router.
 */
export const ASSIGNMENT_SOURCE_LABELS: Record<string, string> = {
  self: 'Picked up',
  user: 'Handed over',
}

export const EMPLOYEE_TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
}

/**
 * The tab strip above the queue. `''` is every ticket; the rest map straight to
 * the endpoint's `status`, and each carries its count from the summary read.
 *
 * `open_only` isn't a tab: it spans three of them, so it lives in the filter bar
 * where it can be combined rather than pretending to be a sixth position here.
 */
export const EMPLOYEE_TICKET_TABS = [
  { value: ALL_FILTER, label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'reopened', label: 'Reopened' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const

/** No filter applied — the whole queue, across every company of the account. */
export const EMPTY_EMPLOYEE_TICKET_FILTERS: EmployeeTicketFilters = {
  status: ALL_FILTER,
  openOnly: false,
  category: ALL_FILTER,
  priority: ALL_FILTER,
  companyId: ALL_FILTER,
  assignedToUserId: ALL_FILTER,
  unassignedOnly: false,
}

/**
 * The "nobody has taken this" facet.
 *
 * `unassigned_only` brings its own status predicate — the three unfinished
 * statuses — so it is not a status tab and does not pair with "unfinished only".
 * It's the queue's real starting point.
 */
export const UNASSIGNED_ONLY_OPTIONS = [
  { label: 'Anyone or nobody', value: ALL_FILTER },
  { label: 'Unassigned only', value: 'true' },
]

/** The assignee facet's "nobody in particular" row. */
export const ANY_ASSIGNEE_OPTION = { label: 'Anyone', value: ALL_FILTER }

/**
 * The wording the platform console uses for the two clocks, copied verbatim so
 * a reader cannot confuse EFFORT with CALENDAR time. This is the one thing on
 * the screen a wrong label actively misleads about.
 */
export const TIME_SPENT_HINT = 'hands-on effort, not wall clock'
export const TIME_TO_RESOLVE_HINT = 'raised until resolved, nights and weekends included'

/** What the reply's file picker advertises — the four types the presign signs for. */
export const SUPPORT_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

/** The reply attachment's size ceiling, in MB. */
export const SUPPORT_ATTACHMENT_MAX_MB = 10
