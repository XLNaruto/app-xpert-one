import type {
  SalaryReportComponentResponse,
  SalaryReportItemResponse,
  SalaryReportResponse,
} from '../schemas'
import type {
  SalaryView,
  SalaryViewHead,
  SalaryViewPeriod,
  SalaryViewRow,
  SalaryViewTotals,
} from '../types'

/**
 * API record → the UI report. Pure — no React, no hooks.
 *
 * Two things happen here that the endpoint leaves to the client:
 *
 * - **A row's heads are indexed by name.** The long view's columns are the
 *   report's `allowance_heads` / `deduction_heads`, and a row carries no line for
 *   a head it doesn't have. Building the lookup once per row keeps the grid's
 *   cells a map read rather than a scan of the row's components.
 * - **LWP is derived.** The API stores working days and present days but not the
 *   gap, and that gap is the column payroll reads a short month by.
 */

/** A nullable number as the screen counts it — absent means nothing, not blank. */
function amount(value: number | null | undefined): number {
  return value ?? 0
}

/** A nullable string as the screen prints it — absent renders as a dash. */
function text(value: string | null | undefined): string {
  return value ?? ''
}

export function toSalaryViewPeriod(
  period: SalaryReportResponse['period'],
): SalaryViewPeriod {
  return {
    month: period.month,
    year: period.year,
    from: period.from,
    to: period.to,
    cycleStartDay: period.cycle_start_day,
    totalDaysInMonth: period.total_days_in_month,
  }
}

/** One stored allowance / deduction line. */
function toHead(component: SalaryReportComponentResponse): SalaryViewHead {
  const name = text(component.pay_component_name)
  return {
    id: component.id,
    payComponentId: component.pay_component_id,
    name,
    /* The short code is what a narrow matrix column prints; a head configured
       without one falls back to its name rather than to an empty heading. */
    code: component.pay_component_short_code || name,
    amount: component.amount,
    pfApplicable: component.pf_applicable,
    esicApplicable: component.esic_applicable,
    ptApplicable: component.pt_applicable,
  }
}

/** Head name → amount, for the matrix cells. */
function byHeadName(heads: SalaryViewHead[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const head of heads) map[head.name] = head.amount
  return map
}

export function toSalaryViewRow(item: SalaryReportItemResponse): SalaryViewRow {
  const { salary } = item
  const allowances = item.allowances.map(toHead)
  const deductions = item.deductions.map(toHead)

  const workingDays = amount(salary.working_days)
  const presentDays = amount(salary.present_days)

  return {
    salaryId: salary.id,
    employeeId: salary.employee_id,
    employeeServiceId: salary.employee_service_id,
    month: salary.month,
    year: salary.year,

    basicPay: amount(salary.basic_pay),
    wagesPerDay: amount(salary.wages_per_day),
    workingDays,
    weeklyOff: text(salary.weekly_off),
    workingHour: amount(salary.working_hour),
    presentDays,
    earnedBasic: amount(salary.basic_pay_for_present_days),
    /* Leave without pay is the shortfall, never a negative: extra days worked
       push present days past the working days, and that's an overtime story
       told by its own column rather than a negative LWP. */
    lwpDays: Math.max(0, workingDays - presentDays),
    extraDays: amount(salary.extra_days),
    extraDaysAmount: amount(salary.extra_days_amount),
    otHours: amount(salary.ot_hours),
    otAmount: amount(salary.ot_amount),

    allowances,
    deductions,
    allowanceByHead: byHeadName(allowances),
    deductionByHead: byHeadName(deductions),
    totalAllowance: amount(salary.total_allowance),
    totalDeduction: amount(salary.total_deduction),
    grossPay: amount(salary.gross_pay),
    netPay: amount(salary.net_pay),
    employeePf: amount(salary.employee_pf),
    employerPf: amount(salary.employer_pf),
    employeeEsic: amount(salary.employee_esic),
    employerEsic: amount(salary.employer_esic),
    employeePt: amount(salary.employee_pt),
    employeeLwf: amount(salary.employee_lwf),
    employeeTds: amount(salary.employee_tds),

    acts: {
      isPfActApplicable: salary.is_pf_act_applicable,
      pfDeductionType: salary.pf_deduction_type,
      pfDeductionAmount: salary.pf_deduction_amount,
      isEsicActApplicable: salary.is_esic_act_applicable,
      esicDeductionBasis: salary.esic_deduction_basis,
      employeeEsicPercentage: salary.employee_esic_deduction_percentage,
      employerEsicPercentage: salary.employer_esic_deduction_percentage,
      isPtActApplicable: salary.is_pt_act_applicable,
      ptActType: salary.pt_act_type,
      isLwfActApplicable: salary.is_lwf_act_applicable,
      isTdsActApplicable: salary.is_tds_act_applicable,
      tdsPercentage: salary.tds_percentage,
      isOvertimeApplicable: salary.is_overtime_applicable,
      overtimeRatePerHour: salary.overtime_rate_per_hour,
    },

    isPaid: salary.is_paid,
    paymentDate: text(salary.payment_date),
    isImported: salary.is_import_from_sheet,

    employeeCode: text(item.employee_code),
    employeeName: text(item.employee_name),
    mobileNumber: text(item.primary_mobile_number),
    gender: text(item.gender),
    birthDate: text(item.birth_date),
    maritalStatus: text(item.marital_status),
    email: text(item.email),
    relation: text(item.relation),
    relativeName: text(item.relative_name),
    joiningDate: text(item.joining_date),
    departmentId: item.department_id,
    departmentName: text(item.department_name),
    departmentCode: text(item.department_code),
    designationId: item.designation_id,
    designationName: text(item.designation_name),

    pfNumber: text(item.pf_number),
    uanNumber: text(item.uan_number),
    esicNumber: text(item.esic_number),
    aadharNumber: text(item.aadhar_number),
    bankName: text(item.bank_name),
    bankAccountNumber: text(item.bank_account_number),
    bankBranchName: text(item.bank_branch_name),
    ifscCode: text(item.ifsc_code),
  }
}

function toTotals(totals: SalaryReportResponse['totals']): SalaryViewTotals {
  return {
    grossPay: totals.gross_pay,
    netPay: totals.net_pay,
    totalAllowance: totals.total_allowance,
    totalDeduction: totals.total_deduction,
    employeePf: totals.employee_pf,
    employeeEsic: totals.employee_esic,
    employeePt: totals.employee_pt,
    employeeLwf: totals.employee_lwf,
    employeeTds: totals.employee_tds,
    employerPf: totals.employer_pf,
    employerEsic: totals.employer_esic,
  }
}

export function toSalaryView(response: SalaryReportResponse): SalaryView {
  return {
    period: toSalaryViewPeriod(response.period),
    items: response.items.map(toSalaryViewRow),
    total: response.total,
    allowanceHeads: response.allowance_heads,
    deductionHeads: response.deduction_heads,
    totals: toTotals(response.totals),
  }
}

/** The first letter of the first two words — "Vora Hitesh" → "VH". */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
  return letters.toUpperCase() || '—'
}
