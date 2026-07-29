import type { AuditFields } from '@/types/audit'

/** Whether leave of this type is paid or deducted from salary. */
export type LeavePayType = 'PAID' | 'UNPAID'

/** A leave type master record. */
export interface LeaveType extends AuditFields {
  id: number
  leaveName: string
  shortName: string
  payType: LeavePayType
}
