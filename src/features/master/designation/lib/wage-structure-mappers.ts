import { EMPTY_WAGE_STRUCTURE_ROW } from '../constants'
import type {
  SalaryComponentPayload,
  WageStructureResponse,
  WageStructureRow,
  WageStructureRowPayload,
} from '../schemas'
import type { DesignationWageStructure } from '../types'
import { toOptionalAmount } from './designation-calculations'
import { deriveOvertimeRate, deriveWages } from './wage-structure-calculations'
import {
  fromApiActAmountType,
  fromApiEsicBasis,
  fromApiWageSalaryType,
  fromApiWorkingDayCalculationType,
  toApiActAmountType,
  toApiEsicBasis,
  toApiWageSalaryType,
  toApiWeeklyOff,
  toApiWorkingDayCalculationType,
  toValueType,
} from './api-enums'

/**
 * One head of the grid — a record of the allowance / deduction master, which is
 * where the grid's allowance and deduction columns come from. `id` is the API's
 * own `pay_component_id`, so a cell reaches `salary_components` directly.
 */
export interface WageHead {
  id: number
  /** The head's short code, e.g. `LOC` — the column's header. */
  code: string
  /** The head's full name, e.g. "Local Conveyance" — the column's hint. */
  name: string
}

/**
 * The master's heads, split by the side each one sits on. A head's own `type` in
 * the master decides that, so the grid never asks and the API never says: one
 * `salary_components` array carries both.
 */
export interface WageHeads {
  allowances: WageHead[]
  deductions: WageHead[]
}

/** No heads at all — what the grid renders on until the master has loaded. */
export const NO_WAGE_HEADS: WageHeads = { allowances: [], deductions: [] }

/**
 * A blank draft row for the heads currently in the master — one entry per head,
 * on both sides, nothing valued. Allowances default to a percentage of basic pay
 * and deductions to a flat amount, which is how each side is usually quoted.
 *
 * The row arrays are index-aligned with `heads`, which is also the grid's column
 * order — that alignment is what lets a cell address its field by index.
 */
export function blankWageStructureRow(heads: WageHeads): WageStructureRow {
  return {
    ...EMPTY_WAGE_STRUCTURE_ROW,
    allowances: heads.allowances.map((head) => ({
      componentId: head.id,
      valueType: 'Percentage' as const,
      amount: '',
      pfApplicable: false,
      esicApplicable: false,
      ptApplicable: false,
    })),
    deductions: heads.deductions.map((head) => ({
      componentId: head.id,
      valueType: 'Fixed' as const,
      amount: '',
    })),
  }
}

/** The month half of the API's `applicable_date`, as the grid's `yyyy-MM`. */
function toEffectiveMonth(applicableDate: string): string {
  return applicableDate.slice(0, 7)
}

/**
 * One validated draft row → the body both wage-structure writes take. Anything the
 * row leaves to be derived (the wage per day, an overtime rate left blank) is
 * computed here, so the stored version is complete on its own — the API keeps the
 * figure, not the formula behind it.
 *
 * Settings behind a switched-off act are sent as `null` rather than kept as
 * stale values. Every field is sent, blank ones included: on a PATCH an omitted
 * field stays as stored, so leaving one out would silently keep the old value
 * for a cell the user just cleared.
 */
export function wageRowToPayload(
  row: WageStructureRow,
): Omit<WageStructureRowPayload, 'company_id'> {
  const { basicPay, wagePerDay } = deriveWages(row)
  // Fixed days and a weekly off are alternatives, each owned by one calc type.
  const isFixedDays = row.workingDayCalculationType === 'Fixed'

  return {
    effective_from: row.effectiveFrom,

    working_day_calculation_type: toApiWorkingDayCalculationType(
      row.workingDayCalculationType,
    ),
    weekly_off: toApiWeeklyOff(row.weeklyOff),
    working_days: isFixedDays ? toOptionalAmount(row.workingDays) : null,
    salary_type: toApiWageSalaryType(row.salaryType),
    basic_pay: basicPay,
    wages_per_day: wagePerDay,
    extra_day_amount_per_day: toOptionalAmount(row.extraDayAmountPerDay),

    is_overtime_applicable: row.overtimeApplicable,
    overtime_rate_per_hour: deriveOvertimeRate(row),

    is_pf_act_applicable: row.pfActApplicable,
    is_employee_pf_contribution_on_wage_limit:
      row.pfActApplicable && row.employeePfContributionOnWageLimit,
    is_employer_pf_contribution_on_wage_limit:
      row.pfActApplicable && row.employerPfContributionOnWageLimit,
    pf_deduction_type: row.pfActApplicable ? row.pfValueType : null,
    pf_deduction_amount: row.pfActApplicable ? toOptionalAmount(row.pfValue) : null,

    is_esic_act_applicable: row.esicActApplicable,
    esic_deduction_basis: row.esicActApplicable
      ? toApiEsicBasis(row.esicDeductionBasis)
      : null,

    is_pt_act_applicable: row.ptActApplicable,
    pt_act_type: row.ptActApplicable ? toApiActAmountType(row.ptActType) : null,
    pt_amount:
      row.ptActApplicable && row.ptActType === 'Manual'
        ? toOptionalAmount(row.ptAmount)
        : null,

    is_lwf_act_applicable: row.lwfActApplicable,
    lwf_act_type: row.lwfActApplicable ? toApiActAmountType(row.lwfActType) : null,
    lwf_amount:
      row.lwfActApplicable && row.lwfActType === 'Manual'
        ? toOptionalAmount(row.lwfAmount)
        : null,

    salary_components: headsToPayload(row),
  }
}

/**
 * Both sides of the grid as the API's single `salary_components` array — the side
 * comes from each head's own `type` in the catalog, so the request never says
 * which. Only the cells given a value apply, so the blanks are left out; sent as
 * a whole the array replaces the version's heads, which is how clearing a cell
 * removes its head.
 *
 * The act markers are sent exactly as ticked. They're deliberately not gated on
 * the row's act toggles: the markers are always enabled on the grid, and silently
 * clearing one here would contradict what the user just set.
 */
function headsToPayload(row: WageStructureRow) {
  const components: SalaryComponentPayload[] = []

  for (const allowance of row.allowances) {
    const amount = toOptionalAmount(allowance.amount)
    if (amount === null) continue
    components.push({
      pay_component_id: allowance.componentId,
      amount_type: allowance.valueType,
      amount,
      pf_applicable: allowance.pfApplicable,
      esic_applicable: allowance.esicApplicable,
      pt_applicable: allowance.ptApplicable,
    })
  }

  for (const deduction of row.deductions) {
    const amount = toOptionalAmount(deduction.amount)
    if (amount === null) continue
    components.push({
      pay_component_id: deduction.componentId,
      amount_type: deduction.valueType,
      amount,
      /*
       * Both sides send the same shape. The grid carries no act markers on a
       * deduction column, so they go as `false` rather than omitted: a PATCH
       * replaces the row's heads wholesale, and "not marked" is what the cell
       * means — not "leave whatever was there".
       */
      pf_applicable: false,
      esic_applicable: false,
      pt_applicable: false,
    })
  }

  return components
}

/**
 * A history row → the stored wage structure the grid renders. Every head in the
 * master gets an entry, valued or not: the entries are index-aligned with the
 * grid's columns, and a head this version didn't carry reads as blank.
 *
 * A head the version was saved with but the master no longer lists has no column
 * to sit under, so it's dropped here rather than shifting the ones that do.
 */
export function toWageStructure(
  response: WageStructureResponse,
  designationId: number,
  heads: WageHeads,
): DesignationWageStructure {
  const byId = new Map(
    (response.salary_components ?? []).map((component) => [
      component.pay_component_id,
      component,
    ]),
  )
  const pfType = response.pf_deduction_type
    ? toValueType(response.pf_deduction_type)
    : 'Percentage'

  return {
    id: response.id,
    designationId,
    effectiveFrom: toEffectiveMonth(response.applicable_date),

    workingDayCalculationType: fromApiWorkingDayCalculationType(
      response.working_day_calculation_type,
    ),
    weeklyOff: response.weekly_off === 'None' ? null : response.weekly_off,
    workingDays: response.working_days,
    salaryType: fromApiWageSalaryType(response.salary_type),
    basicPay: response.basic_pay,
    wagePerDay: response.wages_per_day,
    extraDayAmountPerDay: response.extra_day_amount_per_day,

    allowances: heads.allowances.map((head) => {
      const component = byId.get(head.id)
      return {
        componentId: head.id,
        valueType: component ? toValueType(component.amount_type) : 'Percentage',
        amount: component?.amount ?? null,
        pfApplicable: component?.pf_applicable ?? false,
        esicApplicable: component?.esic_applicable ?? false,
        ptApplicable: component?.pt_applicable ?? false,
      }
    }),
    deductions: heads.deductions.map((head) => {
      const component = byId.get(head.id)
      return {
        componentId: head.id,
        valueType: component ? toValueType(component.amount_type) : 'Fixed',
        amount: component?.amount ?? null,
      }
    }),

    overtimeApplicable: response.is_overtime_applicable,
    overtimeRatePerHour: response.overtime_rate_per_hour,

    pfActApplicable: response.is_pf_act_applicable ?? false,
    employeePfContributionOnWageLimit:
      response.is_employee_pf_contribution_on_wage_limit ?? false,
    employerPfContributionOnWageLimit:
      response.is_employer_pf_contribution_on_wage_limit ?? false,
    pfValueType: pfType,
    pfValue: response.pf_deduction_amount,

    esicActApplicable: response.is_esic_act_applicable ?? false,
    esicDeductionBasis: fromApiEsicBasis(response.esic_deduction_basis),

    ptActApplicable: response.is_pt_act_applicable ?? false,
    ptActType: fromApiActAmountType(response.pt_act_type),
    ptAmount: response.pt_amount,

    lwfActApplicable: response.is_lwf_act_applicable ?? false,
    lwfActType: fromApiActAmountType(response.lwf_act_type),
    lwfAmount: response.lwf_amount,

    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * A stored version → an editable draft row, for correcting one in place. It
 * carries the version's `id`, which is what turns the save into a PATCH of that
 * row rather than a new version on top of it.
 */
export function wageStructureToRow(
  structure: DesignationWageStructure,
): WageStructureRow {
  const optional = (value: number | null) => (value === null ? '' : String(value))
  const chosen = <T extends string>(value: T | null): T | '' => value ?? ''

  return {
    wageStructureId: structure.id,
    effectiveFrom: structure.effectiveFrom,

    workingDayCalculationType: chosen(structure.workingDayCalculationType),
    // A stored "no weekly off" is the grid's explicit "None".
    weeklyOff: structure.weeklyOff ?? 'None',
    workingDays: optional(structure.workingDays),
    salaryType: structure.salaryType,
    basicPay: optional(structure.basicPay),
    wagePerDay: optional(structure.wagePerDay),
    extraDayAmountPerDay: optional(structure.extraDayAmountPerDay),

    allowances: structure.allowances.map((allowance) => ({
      componentId: allowance.componentId,
      valueType: allowance.valueType,
      amount: optional(allowance.amount),
      pfApplicable: allowance.pfApplicable,
      esicApplicable: allowance.esicApplicable,
      ptApplicable: allowance.ptApplicable,
    })),
    deductions: structure.deductions.map((deduction) => ({
      componentId: deduction.componentId,
      valueType: deduction.valueType,
      amount: optional(deduction.amount),
    })),

    overtimeApplicable: structure.overtimeApplicable,
    /*
     * A stored rate is a figure, not a formula. It comes back onto the row as
     * entered, so correcting the row can't silently re-derive what was paid.
     */
    overtimeRatePerHour: optional(structure.overtimeRatePerHour),

    pfActApplicable: structure.pfActApplicable,
    employeePfContributionOnWageLimit: structure.employeePfContributionOnWageLimit,
    employerPfContributionOnWageLimit: structure.employerPfContributionOnWageLimit,
    pfValueType: structure.pfValueType,
    pfValue: optional(structure.pfValue),

    esicActApplicable: structure.esicActApplicable,
    esicDeductionBasis: structure.esicDeductionBasis ?? '',

    ptActApplicable: structure.ptActApplicable,
    ptActType: chosen(structure.ptActType),
    ptAmount: optional(structure.ptAmount),

    lwfActApplicable: structure.lwfActApplicable,
    lwfActType: chosen(structure.lwfActType),
    lwfAmount: optional(structure.lwfAmount),
  }
}
