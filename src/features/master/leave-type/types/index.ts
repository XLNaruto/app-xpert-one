import type { AuditFields } from '@/types/audit'

/** Whether leave of this type is paid or deducted from salary. */
export type LeavePayType = 'PAID' | 'UNPAID'

/** A leave type master record. */
export interface LeaveType extends AuditFields {
  id: number
  /** The tenant the record belongs to — set by the API from the active company. */
  companyId: number
  leaveName: string
  shortName: string
  payType: LeavePayType
}
