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

export interface Leave extends AuditFields {
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
