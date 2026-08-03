import { WAGE_ALLOWANCE_HEADS, WAGE_DEDUCTION_HEADS } from '../constants'
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
 * The grid's columns are a fixed list of head codes (`LOC`, `BONUS`, `TDS`, …)
 * while the API identifies a head by its id in the pay-component catalog. This
 * is the catalog as the mappers need it — the short code the master stores
 * against each id.
 */
export interface WageHead {
  id: number
  /** The head's short code in the pay-component master, e.g. `LOC`. */
  shortName: string
}

/**
 * Resolve the grid's head codes against the catalog, both ways. A code the
 * company's master doesn't carry simply can't be saved — its column stays on the
 * grid (the history has to keep its shape) but the cell is dropped on the way
 * out, rather than sent as an id the API would reject.
 */
function headIndex(heads: WageHead[]) {
  const idByCode = new Map<string, number>()
  const codeById = new Map<number, string>()
  for (const head of heads) {
    const code = head.shortName.trim().toUpperCase()
    if (!code) continue
    idByCode.set(code, head.id)
    codeById.set(head.id, code)
  }
  return { idByCode, codeById }
}

/** The month half of the API's `applicable_date`, as the grid's `yyyy-MM`. */
function toEffectiveMonth(applicableDate: string): string {
  return applicableDate.slice(0, 7)
}

/**
 * One validated draft row → the body both wage-structure writes take. The
 * derived side of each pair (the wage per day, an "Auto" overtime rate) is
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
  heads: WageHead[],
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

    salary_components: headsToPayload(row, heads),
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
function headsToPayload(row: WageStructureRow, heads: WageHead[]) {
  const { idByCode } = headIndex(heads)
  const components: SalaryComponentPayload[] = []

  for (const allowance of row.allowances) {
    const amount = toOptionalAmount(allowance.amount)
    const id = idByCode.get(allowance.head.toUpperCase())
    if (amount === null || id === undefined) continue
    components.push({
      pay_component_id: id,
      amount_type: allowance.valueType,
      amount,
      pf_applicable: allowance.pfApplicable,
      esic_applicable: allowance.esicApplicable,
      pt_applicable: allowance.ptApplicable,
    })
  }

  for (const deduction of row.deductions) {
    const amount = toOptionalAmount(deduction.amount)
    const id = idByCode.get(deduction.head.toUpperCase())
    if (amount === null || id === undefined) continue
    components.push({
      pay_component_id: id,
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
 * A history row → the stored wage structure the grid renders. Every column of the
 * grid is filled in, valued or not: the columns are fixed so the history keeps
 * its shape, and a head this version didn't carry reads as blank.
 */
export function toWageStructure(
  response: WageStructureResponse,
  designationId: number,
  heads: WageHead[],
): DesignationWageStructure {
  const { codeById } = headIndex(heads)
  const byCode = new Map(
    (response.salary_components ?? []).map((component) => [
      codeById.get(component.pay_component_id) ?? '',
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

    allowances: WAGE_ALLOWANCE_HEADS.map((head) => {
      const component = byCode.get(head.code)
      return {
        head: head.code,
        valueType: component ? toValueType(component.amount_type) : 'Percentage',
        amount: component?.amount ?? null,
        pfApplicable: component?.pf_applicable ?? false,
        esicApplicable: component?.esic_applicable ?? false,
        ptApplicable: component?.pt_applicable ?? false,
      }
    }),
    deductions: WAGE_DEDUCTION_HEADS.map((head) => {
      const component = byCode.get(head.code)
      return {
        head: head.code,
        valueType: component ? toValueType(component.amount_type) : 'Fixed',
        amount: component?.amount ?? null,
      }
    }),

    overtimeApplicable: response.is_overtime_applicable,
    /*
     * The API stores the hourly rate but not how it was arrived at, so a stored
     * rate reads back as hand-entered — which is what it now is, whatever
     * derived it in the first place.
     */
    overtimeCalculationType: response.overtime_rate_per_hour === null ? null : 'Manual',
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
      head: allowance.head,
      valueType: allowance.valueType,
      amount: optional(allowance.amount),
      pfApplicable: allowance.pfApplicable,
      esicApplicable: allowance.esicApplicable,
      ptApplicable: allowance.ptApplicable,
    })),
    deductions: structure.deductions.map((deduction) => ({
      head: deduction.head,
      valueType: deduction.valueType,
      amount: optional(deduction.amount),
    })),

    overtimeApplicable: structure.overtimeApplicable,
    /*
     * A stored rate is a figure, not a formula — reopened for editing it is the
     * hand-entered one, so re-deriving it doesn't overwrite what was paid.
     */
    overtimeCalculationType: structure.overtimeApplicable ? 'Manual' : 'Auto',
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
