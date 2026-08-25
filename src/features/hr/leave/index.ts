/**
 * Leave Management — the module's public surface.
 *
 * Two screens: the company-wide register and the one create/edit form behind it.
 * Cross-feature imports come through here, never through a deep path.
 *
 * The balance card is exported too: the employee screens read one employee's paid
 * allowance from it, and the allowance itself is authored by
 * `features/hr/leave-quota`.
 */
export { LeaveListPage } from './pages/leave-list-page'
export { LeaveCreatePage } from './pages/leave-create-page'

export { LeaveBalanceCard } from './components/leave-balance-card'

export { useLeaves, useLeave, useLeaveBalance } from './api/use-leaves'
export type { LeaveFilters } from './api/leave-api'

export { groupLeaves } from './lib/leave-mappers'
export { formatDays, formatSplit } from './lib/leave-summary'

export type {
  Leave,
  LeaveApplication,
  LeaveGroup,
  LeaveBalance,
  LeaveBalanceItem,
  LeaveDuration,
  LeavePayType,
  LeaveStatus,
  LeaveQuotaSource,
} from './types'
