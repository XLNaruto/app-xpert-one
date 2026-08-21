import type { AuditFields } from '@/types/audit'

/**
 * Leave Management — the UI-facing record types.
 *
 * A leave is a top-level record rather than something hanging off an employee:
 * `/user/employee-leaves` answers the company-wide register, which is what this
 * module lists, and every row names the employee it belongs to.
 */

export type LeaveDuration = 'FULL_DAY' | 'HALF_DAY'
export type LeavePayType = 'PAID' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * Who a pending leave sits with, and whether the reader may decide it.
 *
 * Read the three as ONE statement, not as three flags: `canDecide` describes YOU,
 * the other two describe the ROW. An owner sees `canDecide: true` on a row that
 * says `pendingWithRole: "HR"`, because the owner decides anything.
 *
 * All three are null/false on an already-decided row — there is no decision left
 * to own, and drawing a button there would produce a 400.
 */
export interface LeaveApproval {
  /** The chain level holding it, e.g. `"HR"`. `null` once decided. */
  pendingWithRole: string | null
  /** It fell through the whole chain to the account owner. */
  pendingWithOwner: boolean
  /**
   * May YOU press Approve / Reject on THIS row?
   *
   * Drive the buttons off this, never off the permission code: `leaves:update`
   * now only says you may work a leave desk, not that this particular application
   * is yours.
   */
  canDecide: boolean
}

export interface Leave extends AuditFields, LeaveApproval {
  id: number
  employeeId: number
  employeeName: string
  employeeCode: string
  companyId: number
  fromDate: string
  toDate: string
  duration: LeaveDuration
  /** `HH:MM` — only a half day carries the two times. */
  fromTime: string
  toTime: string
  payType: LeavePayType
  leaveTypeId: number | null
  /** Free-text type, for a leave recorded without a master row behind it. */
  leaveType: string
  leaveTypeName: string
  leaveReason: string
  /** Object key of the proof file, to be resolved with `mediaUrl()`. */
  attachment: string
  status: LeaveStatus
  /** The note the employee reads — a rejection reason, typically. */
  statusRemark: string
  statusAt: string
}
