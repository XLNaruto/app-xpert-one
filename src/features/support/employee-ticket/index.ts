/**
 * Employee Support — the module's public surface.
 *
 * The help desk our own employees raise queries with from the app, and the back
 * office answers. Two screens: the queue, and one ticket's thread behind it.
 *
 * Its mirror image is `features/support/ticket`, where WE ask the platform.
 * Cross-feature imports come through here, never through a deep path.
 */
export { EmployeeTicketListPage } from './pages/employee-ticket-list-page'
export { EmployeeTicketDetailPage } from './pages/employee-ticket-detail-page'

export {
  useEmployeeTickets,
  useEmployeeTicket,
  useEmployeeTicketSummary,
  useEmployeeTicketWorkSessions,
} from './api/use-employee-tickets'
export {
  useAssignEmployeeTicket,
  useReplyToEmployeeTicket,
  useUpdateEmployeeTicketStatus,
} from './api/use-employee-ticket-mutations'

export {
  ageLabel,
  assigneeLabel,
  assignmentSourceLabel,
  canCloseTicket,
  canPickUp,
  canReassign,
  canRelease,
  canReply,
  canResolve,
  categoryLabel,
  employeeLabel,
  formatDuration,
  priorityLabel,
  statusLabel,
} from './lib/employee-ticket-mappers'
export { EMPLOYEE_TICKET_SORT, EMPLOYEE_TICKET_DEFAULT_SORT } from './constants'

export type {
  EmployeeTicket,
  EmployeeTicketFilters,
  EmployeeTicketMessage,
  EmployeeTicketSummary,
  EmployeeTicketWorkSession,
  EmployeeTicketWorkSessions,
} from './types'
export type {
  AssignmentSourceValue,
  EmployeeTicketCategoryValue,
  EmployeeTicketPriorityValue,
  EmployeeTicketStatusValue,
} from './schemas'
