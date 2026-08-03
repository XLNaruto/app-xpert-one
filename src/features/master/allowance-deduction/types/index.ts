import type { AuditFields } from '@/types/audit'

/** Whether the component adds to (allowance) or subtracts from (deduction) pay. */
export type AllowanceDeductionType = 'ALLOWANCE' | 'DEDUCTION'

/** An allowance / deduction master record. */
export interface AllowanceDeduction extends AuditFields {
  id: number
  /** The tenant the record belongs to — set by the API from the active company. */
  companyId: number
  type: AllowanceDeductionType
  name: string
  shortName: string
}
