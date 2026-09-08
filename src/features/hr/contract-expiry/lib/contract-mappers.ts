import type {
  ContractCompleteFormValues,
  ContractCompletePayload,
  ContractPostingResponse,
  ContractRenewFormValues,
  ContractRenewPayload,
  ExpiringContractResponse,
} from '../schemas'
import type { ContractPosting, ExpiringContract } from '../types'

/**
 * Wire ↔ UI. Snake case becomes camel case and NOTHING ELSE happens.
 *
 * No date is parsed, no `days_to_end` is clamped at zero (it is negative on an
 * expired row, and that negative number is the whole point), and no missing
 * name is replaced with a placeholder — the hierarchy is optional in this
 * product, so a null branch is a fact, not a gap.
 */

/** `undefined` (a key the API omitted) and `null` are the same thing here. */
function orNull<T>(value: T | null | undefined): T | null {
  return value ?? null
}

export function toExpiringContract(raw: ExpiringContractResponse): ExpiringContract {
  return {
    employeeId: raw.employee_id,
    employeeName: orNull(raw.employee_name),
    employeeCode: orNull(raw.employee_code),
    employeeMobile: orNull(raw.employee_mobile),
    serviceId: raw.service_id,
    companyId: orNull(raw.company_id),
    companyName: orNull(raw.company_name),
    branchName: orNull(raw.branch_name),
    departmentName: orNull(raw.department_name),
    designationName: orNull(raw.designation_name),
    grade: orNull(raw.grade),
    joiningDate: orNull(raw.joining_date),
    contractPeriod: orNull(raw.contract_period),
    contractPeriodType: orNull(raw.contract_period_type),
    contractEndsOn: orNull(raw.contract_ends_on),
    renewalDueOn: orNull(raw.renewal_due_on),
    daysToEnd: orNull(raw.days_to_end),
    status: raw.status,
  }
}

export function toContractPosting(raw: ContractPostingResponse): ContractPosting {
  return {
    employeeId: raw.employee_id,
    serviceId: raw.service_id,
    companyId: orNull(raw.company_id),
    employmentType: orNull(raw.employment_type),
    contractPeriod: orNull(raw.contract_period),
    contractPeriodType: orNull(raw.contract_period_type),
    joiningDate: orNull(raw.joining_date),
    contractEndsOn: orNull(raw.contract_ends_on),
    renewalDueOn: orNull(raw.renewal_due_on),
    daysToEnd: orNull(raw.days_to_end),
    leavingDate: orNull(raw.leaving_date),
    leavingReason: orNull(raw.leaving_reason),
    isCurrent: raw.is_current,
    status: raw.status,
  }
}

/**
 * The renew body. The two optional overrides are sent ONLY when the user filled
 * them: an empty `effective_from` would otherwise re-date the term from a blank,
 * and an empty `renewal_date` would override the lead the API is about to apply
 * with nothing.
 */
export function renewToPayload(values: ContractRenewFormValues): ContractRenewPayload {
  const effectiveFrom = values.effectiveFrom?.trim()
  const renewalDate = values.renewalDate?.trim()
  return {
    contract_period: Number(values.contractPeriod),
    contract_period_type: values.contractPeriodType,
    ...(effectiveFrom ? { effective_from: effectiveFrom } : {}),
    ...(renewalDate ? { renewal_date: renewalDate } : {}),
  }
}

/**
 * The complete body. Both fields are optional to the API and `{}` is a valid
 * one-click call, so a blank field is LEFT OUT rather than sent empty — that is
 * what hands the decision back to the API's own defaults (the end of the term,
 * and "Contract completed — not renewed").
 */
export function completeToPayload(
  values: ContractCompleteFormValues,
): ContractCompletePayload {
  const leavingDate = values.leavingDate?.trim()
  const leavingReason = values.leavingReason?.trim()
  return {
    ...(leavingDate ? { leaving_date: leavingDate } : {}),
    ...(leavingReason ? { leaving_reason: leavingReason } : {}),
  }
}
