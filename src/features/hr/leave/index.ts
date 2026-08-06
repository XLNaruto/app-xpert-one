/**
 * Leave Management — the module's public surface.
 *
 * Two screens: the company-wide register and the one create/edit form behind it.
 * Cross-feature imports come through here, never through a deep path.
 */
export { LeaveListPage } from './pages/leave-list-page'
export { LeaveCreatePage } from './pages/leave-create-page'

export { useLeaves, useLeave } from './api/use-leaves'
export type { LeaveFilters } from './api/leave-api'

export type { Leave, LeaveDuration, LeavePayType, LeaveStatus } from './types'
