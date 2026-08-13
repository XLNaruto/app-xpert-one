import { num, text } from '@/features/reports/common'
import type {
  GrossSalaryItemResponse,
  PaidSalaryItemResponse,
  PayRegisterItemResponse,
  PaySlipItemResponse,
  UnpaidSalaryItemResponse,
} from '../schemas'
import type {
  GrossSalaryRow,
  PaidSalaryRow,
  PayRegisterRow,
  PaySlipRow,
  UnpaidSalaryRow,
} from '../types'

/**
 * API record → the row the table prints. Pure — no React, no hooks.
 *
 * Flat, one for one: these reports are documents, so nothing is derived, summed
 * or re-expressed on the way through. The only judgement is the null handling —
 * a missing number reads as 0 and a missing string as empty, and the cells
 * decide which of those prints as a dash.
 */

export function toPaySlipRow(item: PaySlipItemResponse): PaySlipRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    designationName: text(item.designation_name),
    departmentName: text(item.department_name),
    presentDays: num(item.present_days),
    workingDays: num(item.working_days),
    basicPay: num(item.basic_pay),
    grossPay: num(item.gross_pay),
    deductions: num(item.deductions),
    netPay: num(item.net_pay),
  }
}

export function toPayRegisterRow(item: PayRegisterItemResponse): PayRegisterRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    departmentName: text(item.department_name),
    gender: text(item.gender),
    birthDate: text(item.birth_date),
    maritalStatus: text(item.marital_status),
    primaryMobile: text(item.primary_mobile),
    joiningDate: text(item.joining_date),
    aadharNumber: text(item.aadhar_number),
    uanNumber: text(item.uan_number),
    esicNumber: text(item.esic_number),
    bankName: text(item.bank_name),
    bankAccountNumber: text(item.bank_account_number),
    ifscCode: text(item.ifsc_code),
    bankBranchName: text(item.bank_branch_name),
    relativeType: text(item.relative_type),
    relativeName: text(item.relative_name),
    email: text(item.email),
    location: text(item.location),
    presentDays: num(item.present_days),
    workingDays: num(item.working_days),
    basicPay: num(item.basic_pay),
    grossPay: num(item.gross_pay),
    pfAmount: num(item.pf_amount),
    esicAmount: num(item.esic_amount),
    ptAmount: num(item.pt_amount),
    totalDeduction: num(item.total_deduction),
    netPay: num(item.net_pay),
  }
}

export function toGrossSalaryRow(item: GrossSalaryItemResponse): GrossSalaryRow {
  return {
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    departmentName: text(item.department_name),
    designationName: text(item.designation_name),
    totalGrossPay: num(item.total_gross_pay),
    primaryMobile: text(item.primary_mobile),
    aadharNumber: text(item.aadhar_number),
    joiningDate: text(item.joining_date),
    monthsProcessed: num(item.months_processed),
  }
}

export function toPaidSalaryRow(item: PaidSalaryItemResponse): PaidSalaryRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    primaryMobile: text(item.primary_mobile),
    netPay: num(item.net_pay),
    paymentDate: text(item.payment_date),
  }
}

export function toUnpaidSalaryRow(item: UnpaidSalaryItemResponse): UnpaidSalaryRow {
  return {
    salaryId: item.salary_id,
    employeeId: item.employee_id,
    employeeName: text(item.employee_name),
    employeeCode: text(item.employee_code),
    primaryMobile: text(item.primary_mobile),
    grossPay: num(item.gross_pay),
    netPay: num(item.net_pay),
    isPaid: item.is_paid ?? false,
  }
}
