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

/**
 * One head configured on a designation — an allowance or a deduction. Both sides
 * take the same shape: the API carries them in one `salary_components` array, and
 * a head's own `type` in the pay-component master decides which side it's on.
 */
export interface DesignationSalaryComponent {
  /** Id of the head's record in the allowance / deduction master. */
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
 * company level — they are not tied to a department.
 *
 * The API splits the record in two: the title, and an effective-dated wage
 * structure behind it. This shape is the title flattened together with the
 * version **in force**, which is what the detail read answers. A list row
 * carries the title alone, so every pay field on it reads `null` — the list
 * screen shows no pay for that reason.
 */
export interface Designation extends AuditFields {
  id: number
  /** The tenant the record belongs to — the company the session has active. */
  companyId: number

  // Designation detail
  designationName: string

  /**
   * Id of the wage structure version the pay fields below came from — the one in
   * force. `null` on a list row, and on a designation never configured.
   */
  wageStructureId: number | null

  // Salary configuration
  salaryType: string | null
  basicPay: number | null
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
  allowances: DesignationSalaryComponent[]
  deductions: DesignationSalaryComponent[]
}

/* ── Wage structure history ─────────────────────────────────────────────── */

/** Whether the wage is quoted per day or per month. */
export type WageSalaryType = 'Daily' | 'Monthly'

/** Whether the overtime rate is derived from the wage or entered by hand. */
export type WageOvertimeCalculationType = 'Auto' | 'Manual'

/** What the ESIC contribution is worked out on — the API's own three answers. */
export type WageEsicDeductionBasis = 'Wage Ceiling' | 'Gross Salary' | 'As Per Act'

/** One allowance head as valued in a wage structure row. */
export interface WageAllowance {
  /** Short code of the head — one of `WAGE_ALLOWANCE_HEADS`. */
  head: string
  valueType: AllowanceValueType
  /** Percent of basic pay, or a flat amount — read per `valueType`. */
  amount: number | null
  pfApplicable: boolean
  esicApplicable: boolean
  ptApplicable: boolean
}

/** One deduction head as valued in a wage structure row. */
export interface WageDeduction {
  /** Short code of the head — one of `WAGE_DEDUCTION_HEADS`. */
  head: string
  valueType: AllowanceValueType
  amount: number | null
}

/**
 * One effective-dated wage structure for a designation. History is append-only:
 * a row applies from its effective month onward until a later row supersedes it,
 * so existing rows are never edited — a change means a new row.
 */
export interface DesignationWageStructure extends AuditFields {
  id: number
  designationId: number
  /**
   * Month the structure takes effect from, as `yyyy-MM` — the month half of the
   * API's `applicable_date`.
   */
  effectiveFrom: string

  // Working days & salary
  workingDayCalculationType: WorkingDayCalculationType | null
  /** `null` reads as "no weekly off". */
  weeklyOff: string | null
  /** Set only when `workingDayCalculationType` is "Fixed". */
  workingDays: number | null
  salaryType: WageSalaryType
  /** Captured for a monthly wage, derived from the daily wage otherwise. */
  basicPay: number | null
  /** Captured for a daily wage, derived from the monthly basic otherwise. */
  wagePerDay: number | null
  extraDayAmountPerDay: number | null

  allowances: WageAllowance[]
  deductions: WageDeduction[]

  // Overtime
  overtimeApplicable: boolean
  overtimeCalculationType: WageOvertimeCalculationType | null
  /** Set only when `overtimeCalculationType` is "Manual". */
  overtimeRatePerHour: number | null

  // PF act
  pfActApplicable: boolean
  employeePfContributionOnWageLimit: boolean
  employerPfContributionOnWageLimit: boolean
  pfValueType: AllowanceValueType
  pfValue: number | null

  // ESIC act
  esicActApplicable: boolean
  esicDeductionBasis: WageEsicDeductionBasis | null

  // Professional tax act
  ptActApplicable: boolean
  ptActType: ActAmountType | null
  /** Set only when `ptActType` is "Manual". */
  ptAmount: number | null

  // Labour welfare fund act
  lwfActApplicable: boolean
  lwfActType: ActAmountType | null
  /** Set only when `lwfActType` is "Manual". */
  lwfAmount: number | null
}
