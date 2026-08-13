import type { ReportPeriod } from '@/features/reports/common'

/** The establishment and the rates both ESIC types are read against. */
export interface EsicHeader {
  companyName: string
  departmentName: string
  esicCode: string
  /** False means no rate was configured and the statutory defaults were used. */
  isRateOnFile: boolean
  rateEffectiveDate: string
  wageCeilingLimit: number | null
  employeeContribution: number | null
  employerContribution: number | null
}

/** ESIC Statement — the insured employee's month, with both contributions. */
export interface EsicStatementRow {
  salaryId: number
  employeeId: number
  insuranceNo: string
  employeeName: string
  employeeCode: string
  departmentName: string
  designationName: string
  noOfDays: number
  /** The wage the act was applied to — a base, not the gross. */
  wages: number
  /** The deduction. Legitimately 0 for a wage over the ceiling under "As Per Act". */
  esiEmployee: number
  /** The company's cost. */
  esiEmployer: number
  /** Their sum — what is actually remitted for the person. */
  totalEsi: number
}

/** ESIC Challan — the portal's own columns, without the contributions. */
export interface EsicChallanRow {
  salaryId: number
  employeeId: number
  ipNo: string
  ipName: string
  employeeCode: string
  departmentName: string
  designationName: string
  noOfDays: number
  totalMonthlyWages: number
  /** Always empty — the reason is filled in on the portal, not held here. */
  reasonForZeroWages: string
  /** The posting's leaving date — empty for anyone still in service. */
  lastWorkingDay: string
}

/** One page of an ESIC report, with the header it was read against. */
export interface EsicReportPage<TRow> {
  period: ReportPeriod
  header: EsicHeader
  items: TRow[]
  total: number
}
