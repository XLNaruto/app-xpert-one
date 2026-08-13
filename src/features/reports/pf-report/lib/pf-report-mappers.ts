import { num, text, type PfBasisResponse } from '@/features/reports/common'
import type {
  PfChallanItemResponse,
  PfEcrItemResponse,
  PfNewJoiningItemResponse,
  PfStatementItemResponse,
} from '../schemas'
import type {
  PfBasis,
  PfChallanRow,
  PfEcrRow,
  PfNewJoiningRow,
  PfStatementRow,
} from '../types'

/**
 * API record → the row the sheet prints. Pure — no React, no hooks.
 *
 * One judgement call runs through all of these: a missing number reads as 0,
 * **except `pf_rate_percent`**, which stays null. A fixed contribution has no
 * rate, and 0% would say the employer contributes nothing where the rupee column
 * beside it says otherwise.
 */

export function toPfBasis(basis: PfBasisResponse): PfBasis {
  return {
    cycleEnd: text(basis.cycle_end),
    wageCeilingLimit: basis.wage_ceiling_limit,
    edliWageCeilingLimit: basis.edli_wage_ceiling_limit,
    employeePfPercentage: basis.employee_pf_percentage,
    employerPfContribution: basis.employer_pf_contribution,
    pensionRate: basis.pension_rate,
    pensionFundAgeLimit: basis.pension_fund_age_limit,
    isRateOnFile: basis.is_rate_on_file,
    rateEffectiveDate: text(basis.rate_effective_date),
  }
}

export function toPfChallanRow(item: PfChallanItemResponse): PfChallanRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    pfNumber: text(item.pf_number),
    uanNumber: text(item.uan_number),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    wages: num(item.wages),
    epfWages: num(item.epf_wages),
    ee: num(item.ee),
    ncpDays: num(item.ncp_days),
    dol: text(item.dol),
    rfl: num(item.rfl),
    wag: num(item.wag),
    eeTransfer: num(item.ee_transfer),
    er: num(item.er),
    eps: num(item.eps),
  }
}

export function toPfStatementRow(item: PfStatementItemResponse): PfStatementRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    pfNumber: text(item.pf_number),
    uanNumber: text(item.uan_number),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    /* Deliberately NOT `num()` — see the note at the top of the file. */
    pfRatePercent: item.pf_rate_percent,
    wages: num(item.wages),
    total: num(item.total),
    pfAmount: num(item.pf_amount),
    pensionAmount: num(item.pension_amount),
  }
}

export function toPfNewJoiningRow(item: PfNewJoiningItemResponse): PfNewJoiningRow {
  return {
    employeeId: item.employee_id,
    employeeServiceId: item.employee_service_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    gender: text(item.gender),
    relativeName: text(item.relative_name),
    relativeType: text(item.relative_type),
    birthDate: text(item.birth_date),
    joiningDate: text(item.joining_date),
    primaryMobile: text(item.primary_mobile),
    bankAccountNumber: text(item.bank_account_number),
    cityName: text(item.city_name),
    stateName: text(item.state_name),
    maritalStatus: text(item.marital_status),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
  }
}

export function toPfEcrRow(item: PfEcrItemResponse): PfEcrRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    uanNumber: text(item.uan_number),
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    grossWages: num(item.gross_wages),
    epfWages: num(item.epf_wages),
    epsWages: num(item.eps_wages),
    edliWages: num(item.edli_wages),
    epfContribution: num(item.epf_contribution),
    epsContribution: num(item.eps_contribution),
    epfEpsDiff: num(item.epf_eps_diff),
    ncpDays: num(item.ncp_days),
    refund: num(item.refund),
  }
}
