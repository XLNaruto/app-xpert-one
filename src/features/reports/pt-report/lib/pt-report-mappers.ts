import { num, text, type PtHeaderResponse } from '@/features/reports/common'
import type { PtItemResponse } from '../schemas'
import type { PtHeader, PtReportRow } from '../types'

/** API record → the row the statement prints. Pure — no React, no hooks. */

export function toPtHeader(header: PtHeaderResponse): PtHeader {
  return {
    companyName: text(header.company_name),
    departmentName: text(header.department_name),
    ptEcNumber: text(header.pt_ec_number),
    ptRcNumber: text(header.pt_rc_number),
    ptCorporationName: text(header.pt_corporation_name),
  }
}

export function toPtReportRow(item: PtItemResponse): PtReportRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    grossWages: num(item.gross_wages),
    /* The stored deduction, never re-derived: the slab depends on the employee's
       age at PRICING time, so re-walking it today would disagree with the
       payslip for anyone who has since had a birthday. */
    ptAmount: num(item.pt_amount),
  }
}
