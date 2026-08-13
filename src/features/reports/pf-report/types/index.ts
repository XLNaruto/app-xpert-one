import type { ReportPeriod } from '@/features/reports/common'

/**
 * The four PF sheets as the screen renders them.
 *
 * Every figure is the one the register stored. Nothing is re-derived from the
 * rates in `basis` — those are printed so the sheet can be reconciled against
 * the portal's own computation, not so the client can repeat it.
 */

/** The rate row the month was priced against, carried by all four types. */
export interface PfBasis {
  cycleEnd: string
  wageCeilingLimit: number | null
  edliWageCeilingLimit: number | null
  employeePfPercentage: number | null
  employerPfContribution: number | null
  pensionRate: number | null
  pensionFundAgeLimit: number | null
  /** False means no rate was configured and the statutory defaults were used. */
  isRateOnFile: boolean
  rateEffectiveDate: string
}

/** PF Challan — the Form 3A line. */
export interface PfChallanRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  pfNumber: string
  uanNumber: string
  departmentName: string
  designationName: string
  /** A count of contributing DAYS — the form's own "Wages" column, not money. */
  wages: number
  /** The money base: prorated basic plus every PF-applicable head. */
  epfWages: number
  /** The employee's own contribution. */
  ee: number
  ncpDays: number
  /** Date of leaving, empty for anyone still in service. */
  dol: string
  /** Always 0 — the form carries it, this system has no source for it. */
  rfl: number
  wag: number
  eeTransfer: number
  /** The employer's PF share; `er + eps` is the employer's whole PF for the month. */
  er: number
  /** Its pension slice. */
  eps: number
}

/** PF Statement — the employer's contribution against the agreed wage. */
export interface PfStatementRow {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  pfNumber: string
  uanNumber: string
  departmentName: string
  designationName: string
  /** NULL for a fixed contribution — there is no rate to print, so the cell dashes. */
  pfRatePercent: number | null
  /** The AGREED basic capped at the ceiling, not the challan's prorated base. */
  wages: number
  total: number
  pfAmount: number
  /** 0 past the pension age limit, when the whole employer share goes to PF. */
  pensionAmount: number
}

/** New Joining PF — the EPFO registration sheet, read off postings. */
export interface PfNewJoiningRow {
  employeeId: number
  /** The POSTING. A re-join is a second line with its own id. */
  employeeServiceId: number
  employeeName: string
  employeeCode: string
  gender: string
  relativeName: string
  relativeType: string
  birthDate: string
  joiningDate: string
  primaryMobile: string
  bankAccountNumber: string
  cityName: string
  stateName: string
  maritalStatus: string
  departmentName: string
  designationName: string
}

/** ECR — the eleven fields of the EPFO return, keyed by UAN. */
export interface PfEcrRow {
  salaryId: number
  employeeId: number
  uanNumber: string
  employeeName: string
  employeeCode: string
  departmentName: string
  designationName: string
  grossWages: number
  epfWages: number
  epsWages: number
  edliWages: number
  epfContribution: number
  epsContribution: number
  /** The part of the contribution that stays in EPF. */
  epfEpsDiff: number
  ncpDays: number
  /** Always 0 — an EPFO-side adjustment with no source here. */
  refund: number
}

/** One page of a PF report, with the basis it was built on. */
export interface PfReportPage<TRow> {
  period: ReportPeriod
  basis: PfBasis
  items: TRow[]
  total: number
}
