import type { AuditFields } from '@/types/audit'

/** How the paid working days for the month are arrived at. */
export type WorkingDayCalculationType = 'Fixed' | 'As Per Calculation'

/** Whether a statutory amount follows the act's slab or is entered by hand. */
export type ActAmountType = 'As Per Act' | 'Manual'

/** Whether the PF share is a flat amount or a share of the EPF wages. */
export type PfDeductionType = 'Fixed' | 'Percentage'

/** Whether the overtime rate is entered by hand or derived from the wage. */
export type OvertimeCalculationType = 'Manual' | 'As Per Calculation'

/** Whether an allowance is a share of basic pay or a flat rupee amount. */
export type AllowanceValueType = 'Percentage' | 'Fixed'

/** One allowance head configured on a designation. */
export interface DesignationAllowance {
  /** Id of the allowance record in the allowance / deduction master. */
  componentId: number
  valueType: AllowanceValueType
  /** Percent of basic pay, or a flat amount — read per `valueType`. */
  amount: number | null
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/**
 * A designation master record as consumed by the UI. Designations are held at
 * company level — they are not tied to a department. Only the designation name
 * and basic pay are mandatory; every other setting is `null` when not recorded,
 * or ignored while its act toggle is off.
 */
export interface Designation extends AuditFields {
  id: number

  // Designation detail
  designationName: string

  // Salary configuration
  salaryType: string | null
  basicPay: number
  workingDayCalculationType: WorkingDayCalculationType | null
  /** Set only when `workingDayCalculationType` is "Fixed". */
  workingDays: number | null
  /** Set only when `workingDayCalculationType` is "As Per Calculation". */
  weeklyOff: string | null
  extraDayAmountPerDay: number | null

  // PF act
  pfActApplicable: boolean
  pfDeductionType: PfDeductionType | null
  /** Set only when `pfDeductionType` is "Percentage". */
  pfDeductionPercentage: number | null
  /** Set only when `pfDeductionType` is "Fixed". */
  pfDeductionAmount: number | null
  employeePfContributionOnWageLimit: boolean
  employerPfContributionOnWageLimit: boolean

  // ESIC act
  esicActApplicable: boolean
  esicDeductionBasis: string | null

  // Professional tax act
  ptActApplicable: boolean
  ptActType: ActAmountType | null
  ptAmount: number | null

  // Labour welfare fund act
  lwfActApplicable: boolean
  lwfActType: ActAmountType | null
  lwfAmount: number | null

  // Overtime
  overtimeApplicable: boolean
  overtimeCalculationType: OvertimeCalculationType | null
  overtimeRatePerHour: number | null

  // Allowance / deduction heads
  allowances: DesignationAllowance[]
  /** Ids of the deduction records in the allowance / deduction master. */
  deductions: number[]
}
