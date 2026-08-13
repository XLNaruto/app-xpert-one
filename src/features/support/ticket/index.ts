/**
 * Help & Support — the module's public surface.
 *
 * The tickets THIS organization raises with the PLATFORM desk. Three screens:
 * the ticket history, the one raise/edit form behind it, and the detail read
 * where a finished ticket is accepted or handed back.
 *
 * Its mirror image is `features/support/employee-ticket`, where our own
 * employees ask and we answer. Cross-feature imports come through here, never
 * through a deep path.
 */
export { SupportTicketListPage } from './pages/support-ticket-list-page'
export { SupportTicketCreatePage } from './pages/support-ticket-create-page'
export { SupportTicketDetailPage } from './pages/support-ticket-detail-page'

export { useSupportTickets, useSupportTicket } from './api/use-support-tickets'
export {
  useCreateSupportTicket,
  useUpdateSupportTicket,
  useReopenSupportTicket,
  useCloseSupportTicket,
} from './api/use-support-ticket-mutations'

export {
  canClose,
  canEditWording,
  canReopen,
  dueLabel,
  priorityLabel,
  slaLabel,
  statusLabel,
  ticketTypeLabel,
} from './lib/support-ticket-mappers'
export { SUPPORT_TICKET_SORT, SUPPORT_TICKET_DEFAULT_SORT } from './constants'

export type { SupportTicket, SupportTicketFilters } from './types'
export type {
  SupportPriorityValue,
  SupportStatusValue,
  SupportTicketTypeValue,
} from './schemas'
