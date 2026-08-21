/**
 * Hierarchy Management → Leave — the module's public surface.
 *
 * One screen: the account's ordered chain of role names, saved whole. The reads
 * are exported because the leave register explains its own routing in the chain's
 * terms. Cross-feature imports come through here, never through a deep path.
 */
export { LeaveApprovalChainListPage } from './pages/leave-approval-chain-list-page'

export {
  useLeaveApprovalChain,
  useLeaveApprovalRoleNames,
} from './api/use-leave-approval-chain'
export { useSaveLeaveApprovalChain } from './api/use-leave-approval-chain-mutations'

export type {
  LeaveApprovalChain,
  LeaveApprovalLevel,
  LeaveApprovalCompanyRef,
} from './types'
