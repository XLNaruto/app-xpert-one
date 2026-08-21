import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  leaveApprovalChainResponseSchema,
  leaveApprovalRolesResponseSchema,
  type LeaveApprovalChainPayload,
} from '../schemas'
import { toLeaveApprovalChain } from '../lib/leave-approval-chain-mappers'
import type { LeaveApprovalChain } from '../types'

/**
 * `/user/leave-approval-chain` — the account's leave approval chain.
 *
 * ACCOUNT-scoped, not tenant-scoped: one chain answers for every company, so no
 * `company_id` travels on any of these calls.
 *
 * For a given employee's leave the approver is the FIRST level in the chain that
 * has a live user who can REACH that employee's company — "reach" rather than
 * "belongs to", so one GLOBAL "HR" user covers all ten companies without a role
 * being authored in each. If no level has one, the leave falls to the ACCOUNT
 * OWNER, the chain's implicit last link.
 */

/** GET /user/leave-approval-chain — the chain and what it covers. */
export async function fetchLeaveApprovalChain(): Promise<LeaveApprovalChain> {
  try {
    const raw = await http.get<unknown>(endpoints.LEAVE_APPROVAL_CHAIN.GET)
    return toLeaveApprovalChain(leaveApprovalChainResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the leave approval chain.")
  }
}

/**
 * GET /user/leave-approval-chain/roles — the distinct role names across the whole
 * account, which are the picker's options.
 */
export async function fetchLeaveApprovalRoleNames(): Promise<string[]> {
  try {
    const raw = await http.get<unknown>(endpoints.LEAVE_APPROVAL_CHAIN.ROLES)
    return leaveApprovalRolesResponseSchema.parse(raw).role_names
  } catch (error) {
    throw toApiError(error, "Couldn't load the account's role names.")
  }
}

/**
 * PUT /user/leave-approval-chain — replace the whole chain.
 *
 * The whole list every time: there is no per-level endpoint, because inserting a
 * level renumbers everything below it. Sending `[]` clears the chain and switches
 * routing off.
 */
export async function saveLeaveApprovalChain(
  roleNames: string[],
): Promise<LeaveApprovalChain> {
  try {
    const raw = await http.put<unknown, LeaveApprovalChainPayload>(
      endpoints.LEAVE_APPROVAL_CHAIN.PUT,
      { role_names: roleNames },
    )
    return toLeaveApprovalChain(leaveApprovalChainResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the leave approval chain.")
  }
}
