/**
 * Paid-leave allowances — the grids the balance card is computed from.
 *
 * ## Two tiers, looked up in order
 *
 * ```
 * employee_leave_quota    (this employee, this type, THIS YEAR)   ← a GRANT
 *   ↓ no row
 * designation_leave_quota (their designation, this type)          ← a standing POLICY
 *   ↓ no row
 * NONE → no paid days of that type — every day of it is unpaid
 * ```
 *
 * The **designation** grid is the normal home of an allowance: set once, applies
 * to everyone in the role, no year attached. The **employee** grid is the per-year
 * exception that overrides it.
 *
 * `NONE` is not "unlimited". It means no paid days of that type at all — and it
 * still doesn't stop the employee applying for it.
 */

export type LeaveQuotaPayType = 'PAID' | 'UNPAID'

/** Which tier an inherited number came from. */
export type LeaveQuotaFallbackSource = 'EMPLOYEE' | 'DESIGNATION' | 'NONE'

/** One leave type's row in a grid. */
export interface LeaveQuotaRow {
  leaveTypeId: number
  shortCode: string
  leaveType: string
  payType: LeaveQuotaPayType
  /**
   * The allowance set AT THIS TIER. `null` means nothing is set here — which is
   * NOT the same as `0`: zero is a stored "no paid days of this type", null falls
   * through to the tier below.
   */
  annualPaidLeave: number | null
  /**
   * An UNPAID leave type. Unpaid from day one, so there is no allowance to set —
   * the cell is read-only and the row must never appear in a save payload (the API
   * answers a 400 naming it).
   */
  unlimited: boolean
  /**
   * EMPLOYEE GRID ONLY — the number that applies when this row's own cell is
   * empty, and where it comes from. `NONE` with `null` means nothing is configured
   * anywhere, so every day of the type is unpaid.
   */
  fallsBackTo?: number | null
  fallbackSource?: LeaveQuotaFallbackSource
}

/** `GET /user/designations/:id/leave-quotas` — the standing policy for a role. */
export interface DesignationLeaveQuotas {
  designationId: number
  designationName: string
  companyId: number
  items: LeaveQuotaRow[]
}

/** `GET /user/employees/:id/leave-quotas?year=` — one employee's per-year grant. */
export interface EmployeeLeaveQuotas {
  employeeId: number
  employeeName: string
  employeeCode: string
  companyId: number
  /**
   * The designation the fallbacks come from. `null` when the employee has no open
   * posting, or one with no designation — in which case every row falls back to
   * `NONE` and every unfilled type is entirely unpaid.
   */
  designationId: number | null
  designationName: string
  year: number
  items: LeaveQuotaRow[]
}

/** One row of a save. Only PAID types with a filled cell ever appear. */
export interface LeaveQuotaSaveRow {
  leaveTypeId: number
  annualPaidLeave: number
}
