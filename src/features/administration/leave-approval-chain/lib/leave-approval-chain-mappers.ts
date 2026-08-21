import type { LeaveApprovalChainResponse } from '../schemas'
import type { LeaveApprovalChain } from '../types'

/** API record → the UI chain. */
export function toLeaveApprovalChain(
  response: LeaveApprovalChainResponse,
): LeaveApprovalChain {
  return {
    levels: response.levels.map((level) => ({
      level: level.level,
      roleName: level.role_name,
      userCount: level.user_count,
      companiesCovered: level.companies_covered,
    })),
    companyCount: response.company_count,
    companiesWithOwner: response.companies_with_owner.map((company) => ({
      id: company.id,
      name: company.name,
    })),
  }
}

/**
 * Move one level to a new position, returning a fresh array.
 *
 * Reordering is the whole edit: the array's order IS the order of authority, so
 * dragging a row from third to first is what "HR decides before Manager" means.
 */
export function reorderRoleNames(
  roleNames: string[],
  from: number,
  to: number,
): string[] {
  if (from === to || from < 0 || to < 0) return roleNames
  if (from >= roleNames.length || to >= roleNames.length) return roleNames
  const next = [...roleNames]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
