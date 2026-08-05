import type {
  DesignationComponentRow,
  DesignationDetailResponse,
  DesignationFormValues,
  DesignationPayload,
  DesignationResponse,
  DesignationUpdatePayload,
  SalaryComponentPayload,
  WageStructureResponse,
} from '../schemas'
import type { Designation, DesignationSalaryComponent } from '../types'
import {
  deriveDesignationOvertimeRate,
  toOptionalAmount,
} from './designation-calculations'
import {
  fromApiActAmountType,
  fromApiEsicBasis,
  fromApiSalaryType,
  fromApiWorkingDayCalculationType,
  toApiActAmountType,
  toApiEsicBasis,
  toApiSalaryType,
  toApiWeeklyOff,
  toApiWorkingDayCalculationType,
  toValueType,
} from './api-enums'

/** Audit trail off a response — absent on the shapes that don't carry one. */
function auditOf(response: {
  created_at?: string
  created_by_name?: string | null
  updated_at?: string | null
  updated_by_name?: string | null
}) {
  return {
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/** Every pay field of a designation unset — a title with no wage structure. */
const NO_WAGE_STRUCTURE = {
  wageStructureId: null,
  salaryType: null,
  basicPay: null,
  workingDayCalculationType: null,
  workingDays: null,
  weeklyOff: null,
  extraDayAmountPerDay: null,

  pfActApplicable: false,
  pfDeductionType: null,
  pfDeductionPercentage: null,
  pfDeductionAmount: null,
  employeePfContributionOnWageLimit: false,
  employerPfContributionOnWageLimit: false,

  esicActApplicable: false,
  esicDeductionBasis: null,

  ptActApplicable: false,
  ptActType: null,
  ptAmount: null,

  lwfActApplicable: false,
  lwfActType: null,
  lwfAmount: null,

  overtimeApplicable: false,
  overtimeRatePerHour: null,

  allowances: [],
  deductions: [],
} as const satisfies Partial<Designation>

/**
 * A list row → the UI designation. `GET /user/designations` answers titles only,
 * so every pay field reads unset — the list screen shows the name and the audit
 * trail for that reason, and the salary configuration comes from the detail read.
 */
export function toDesignation(response: DesignationResponse): Designation {
  return {
    id: response.id,
    companyId: response.company_id,
    designationName: response.name,
    ...NO_WAGE_STRUCTURE,
    ...auditOf(response),
  }
}

/**
 * The detail read → the UI designation: the title flattened together with the
 * wage structure **in force** and the heads that version was saved with. A
 * designation never configured comes back with no structure, which reads exactly
 * like a fresh form.
 */
export function toDesignationDetail(response: DesignationDetailResponse): Designation {
  const base: Designation = {
    id: response.id,
    companyId: response.company_id,
    designationName: response.name,
    ...NO_WAGE_STRUCTURE,
    ...auditOf(response),
  }

  const wage = response.wage_structure
  if (!wage) return base

  const { allowances, deductions } = splitHeads(response.salary_components)

  return {
    ...base,
    wageStructureId: wage.id,
    ...wageFieldsOf(wage),
    allowances,
    deductions,
  }
}

/**
 * The pay fields of one wage structure version, as the designation record holds
 * them.
 */
function wageFieldsOf(wage: WageStructureResponse) {
  const pfType = wage.pf_deduction_type ? toValueType(wage.pf_deduction_type) : null

  return {
    salaryType: fromApiSalaryType(wage.salary_type),
    basicPay: wage.basic_pay,
    workingDayCalculationType: fromApiWorkingDayCalculationType(
      wage.working_day_calculation_type,
    ),
    workingDays: wage.working_days,
    weeklyOff: wage.weekly_off,
    extraDayAmountPerDay: wage.extra_day_amount_per_day,

    pfActApplicable: wage.is_pf_act_applicable ?? false,
    pfDeductionType: pfType,
    /*
     * The API keeps one `pf_deduction_amount` and reads it per its type; the
     * record splits the two, so the stored figure lands on the side its type
     * calls for and the other stays empty.
     */
    pfDeductionPercentage: pfType === 'Percentage' ? wage.pf_deduction_amount : null,
    pfDeductionAmount: pfType === 'Fixed' ? wage.pf_deduction_amount : null,
    employeePfContributionOnWageLimit:
      wage.is_employee_pf_contribution_on_wage_limit ?? false,
    employerPfContributionOnWageLimit:
      wage.is_employer_pf_contribution_on_wage_limit ?? false,

    esicActApplicable: wage.is_esic_act_applicable ?? false,
    esicDeductionBasis: fromApiEsicBasis(wage.esic_deduction_basis),

    ptActApplicable: wage.is_pt_act_applicable ?? false,
    ptActType: fromApiActAmountType(wage.pt_act_type),
    ptAmount: wage.pt_amount,

    lwfActApplicable: wage.is_lwf_act_applicable ?? false,
    lwfActType: fromApiActAmountType(wage.lwf_act_type),
    lwfAmount: wage.lwf_amount,

    overtimeApplicable: wage.is_overtime_applicable,
    overtimeRatePerHour: wage.overtime_rate_per_hour,
  }
}

/**
 * Split the one `salary_components` array into the two sides the screens hold
 * separately. The side comes from each head's `component_type` — the request
 * never says which, and the response echoes the catalog's own answer.
 *
 * Both sides map identically: a deduction carries a value and act markers just as
 * an allowance does.
 */
function splitHeads(components: DesignationDetailResponse['salary_components']): {
  allowances: DesignationSalaryComponent[]
  deductions: DesignationSalaryComponent[]
} {
  const allowances: DesignationSalaryComponent[] = []
  const deductions: DesignationSalaryComponent[] = []

  for (const component of components) {
    const mapped: DesignationSalaryComponent = {
      componentId: component.pay_component_id,
      valueType: toValueType(component.amount_type),
      amount: component.amount,
      pfApplicable: component.pf_applicable ?? false,
      esicApplicable: component.esic_applicable ?? false,
      ptApplicable: component.pt_applicable ?? false,
    }
    if (component.component_type?.toUpperCase() === 'DEDUCTION') deductions.push(mapped)
    else allowances.push(mapped)
  }

  return { allowances, deductions }
}

/** Hydrate the edit form from a stored designation. */
export function designationToFormValues(
  designation: Designation,
): DesignationFormValues {
  const optional = (value: number | null) => (value === null ? '' : String(value))
  // A cleared dropdown round-trips as '' on the form and null on the record.
  const chosen = <T extends string>(value: T | null): T | '' => value ?? ''

  return {
    designationName: designation.designationName,

    salaryType: designation.salaryType ?? '',
    basicPay: optional(designation.basicPay),
    workingDayCalculationType: chosen(designation.workingDayCalculationType),
    workingDays: optional(designation.workingDays),
    weeklyOff: designation.weeklyOff ?? '',
    extraDayAmountPerDay: optional(designation.extraDayAmountPerDay),

    pfActApplicable: designation.pfActApplicable,
    pfDeductionType: chosen(designation.pfDeductionType),
    // One input backs both modes — seed it from whichever side the record used.
    pfDeductionValue: optional(
      designation.pfDeductionType === 'Fixed'
        ? designation.pfDeductionAmount
        : designation.pfDeductionPercentage,
    ),
    employeePfContributionOnWageLimit: designation.employeePfContributionOnWageLimit,
    employerPfContributionOnWageLimit: designation.employerPfContributionOnWageLimit,

    esicActApplicable: designation.esicActApplicable,
    esicDeductionBasis: designation.esicDeductionBasis ?? '',

    ptActApplicable: designation.ptActApplicable,
    ptActType: chosen(designation.ptActType),
    ptAmount: optional(designation.ptAmount),

    lwfActApplicable: designation.lwfActApplicable,
    lwfActType: chosen(designation.lwfActType),
    lwfAmount: optional(designation.lwfAmount),

    overtimeApplicable: designation.overtimeApplicable,
    overtimeRatePerHour: optional(designation.overtimeRatePerHour),

    allowances: designation.allowances.map(toComponentRow),
    deductions: designation.deductions.map(toComponentRow),
  }
}

/** One stored head → its form row. The same shape on either side. */
function toComponentRow(component: DesignationSalaryComponent) {
  return {
    componentId: String(component.componentId),
    valueType: component.valueType,
    amount: component.amount === null ? '' : String(component.amount),
    pfApplicable: component.pfApplicable,
    esicApplicable: component.esicApplicable,
    ptApplicable: component.ptApplicable,
  }
}

/**
 * Validated form values → the `POST /user/designations` body, which establishes
 * the title and its opening wage structure together. The create call adds
 * `company_id` on top.
 *
 * Settings behind a switched-off act are sent as `null` rather than as stale
 * values, so a designation never carries a PF percentage it doesn't use.
 */
export function designationToPayload(
  values: DesignationFormValues,
): Omit<DesignationPayload, 'company_id'> {
  // Each mode owns exactly one field; with no mode chosen, neither is sent.
  const isFixedDays = values.workingDayCalculationType === 'Fixed'
  const isCalculatedDays = values.workingDayCalculationType === 'As Per Calculation'

  return {
    name: values.designationName.trim(),

    salary_type: toApiSalaryType(values.salaryType),
    basic_pay: toOptionalAmount(values.basicPay),
    working_day_calculation_type: toApiWorkingDayCalculationType(
      values.workingDayCalculationType,
    ),
    working_days: isFixedDays ? toOptionalAmount(values.workingDays) : null,
    weekly_off: isCalculatedDays ? toApiWeeklyOff(values.weeklyOff) : null,
    extra_day_amount_per_day: toOptionalAmount(values.extraDayAmountPerDay),

    is_pf_act_applicable: values.pfActApplicable,
    pf_deduction_type: values.pfActApplicable
      ? toValueType(values.pfDeductionType)
      : null,
    pf_deduction_amount: values.pfActApplicable
      ? toOptionalAmount(values.pfDeductionValue)
      : null,
    is_employee_pf_contribution_on_wage_limit:
      values.pfActApplicable && values.employeePfContributionOnWageLimit,
    is_employer_pf_contribution_on_wage_limit:
      values.pfActApplicable && values.employerPfContributionOnWageLimit,

    is_esic_act_applicable: values.esicActApplicable,
    esic_deduction_basis: values.esicActApplicable
      ? toApiEsicBasis(values.esicDeductionBasis)
      : null,

    is_pt_act_applicable: values.ptActApplicable,
    pt_act_type: values.ptActApplicable ? toApiActAmountType(values.ptActType) : null,
    pt_amount:
      values.ptActApplicable && values.ptActType === 'Manual'
        ? toOptionalAmount(values.ptAmount)
        : null,

    is_lwf_act_applicable: values.lwfActApplicable,
    lwf_act_type: values.lwfActApplicable ? toApiActAmountType(values.lwfActType) : null,
    lwf_amount:
      values.lwfActApplicable && values.lwfActType === 'Manual'
        ? toOptionalAmount(values.lwfAmount)
        : null,

    is_overtime_applicable: values.overtimeApplicable,
    /*
     * The API takes the hourly rate alone — how it was arrived at is the form's
     * business. On "As Per Calculation" the rate is derived here, so the stored
     * structure is complete on its own.
     */
    overtime_rate_per_hour: deriveDesignationOvertimeRate(values),

    salary_components: headsToPayload(values),
  }
}

/**
 * Both sides of the form as the API's single `salary_components` array — the side
 * comes from each head's own `type` in the catalog, so the request never says
 * which and the two are mapped the same way. Every head carries its value, its
 * ₹/% type and the three act markers.
 *
 * Only the heads given a value actually apply, so the blank ones are left out
 * rather than sent as zeros. A head can only count towards an act the designation
 * is covered by.
 */
function headsToPayload(values: DesignationFormValues): SalaryComponentPayload[] {
  const toPayload = (row: DesignationComponentRow): SalaryComponentPayload => ({
    pay_component_id: Number(row.componentId),
    amount_type: row.valueType,
    amount: toOptionalAmount(row.amount) ?? 0,
    pf_applicable: values.pfActApplicable && row.pfApplicable,
    esic_applicable: values.esicActApplicable && row.esicApplicable,
    pt_applicable: values.ptActApplicable && row.ptApplicable,
  })

  const applies = (row: DesignationComponentRow) =>
    row.componentId !== '' && row.amount !== ''

  return [
    ...values.allowances.filter(applies).map(toPayload),
    ...values.deductions.filter(applies).map(toPayload),
  ]
}

/**
 * The Basic Info tab's body. `PATCH /user/designations/:id` owns the title and
 * nothing else — every pay setting is effective-dated and saved through the
 * wage-structure endpoints instead.
 */
export function designationNameToPayload(name: string): DesignationUpdatePayload {
  return { name: name.trim() }
}
