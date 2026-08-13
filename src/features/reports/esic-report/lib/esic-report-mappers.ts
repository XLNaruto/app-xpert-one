import { num, text, type EsicHeaderResponse } from '@/features/reports/common'
import type { EsicChallanItemResponse, EsicStatementItemResponse } from '../schemas'
import type { EsicChallanRow, EsicHeader, EsicStatementRow } from '../types'

/** API record → the row the sheet prints. Pure — no React, no hooks. */

export function toEsicHeader(header: EsicHeaderResponse): EsicHeader {
  return {
    companyName: text(header.company_name),
    departmentName: text(header.department_name),
    esicCode: text(header.esic_code),
    isRateOnFile: header.is_rate_on_file,
    rateEffectiveDate: text(header.rate_effective_date),
    wageCeilingLimit: header.wage_ceiling_limit,
    employeeContribution: header.employee_esic_contribution,
    employerContribution: header.employer_esic_contribution,
  }
}

export function toEsicStatementRow(item: EsicStatementItemResponse): EsicStatementRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    insuranceNo: text(item.insurance_no),
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    noOfDays: num(item.no_of_days),
    /* Read off the salary row as the register computed them, never re-derived
       from the rates in `header` — a wage over the ceiling under "As Per Act"
       legitimately deducted nothing, and recomputing would invent a figure. */
    wages: num(item.wages),
    esiEmployee: num(item.esi_employee),
    esiEmployer: num(item.esi_employer),
    totalEsi: num(item.total_esi),
  }
}

export function toEsicChallanRow(item: EsicChallanItemResponse): EsicChallanRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    ipNo: text(item.ip_no),
    ipName: text(item.ip_name),
    employeeCode: text(item.employee_code),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    noOfDays: num(item.no_of_days),
    totalMonthlyWages: num(item.total_monthly_wages),
    reasonForZeroWages: text(item.reason_for_zero_wages),
    lastWorkingDay: text(item.last_working_day),
  }
}
