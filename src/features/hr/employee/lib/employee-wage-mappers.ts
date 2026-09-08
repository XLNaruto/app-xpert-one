import {
  NO_WAGE_HEADS,
  toWageStructure,
  wageRowToPayload,
} from '@/features/master/designation'
import type {
  DesignationWageStructure,
  SalaryComponentResponse,
  WageHeads,
  WageStructureResponse,
  WageStructureRow,
} from '@/features/master/designation'
import type {
  EmployeeWagePayload,
  EmployeeWageResponse,
  EmployeeWageVersionResponse,
} from '../schemas'
import type { EmployeeWage, EmployeeWageComponent, EmployeeWageVersion } from '../types'
import { toEmployeeWageComponent } from './employee-step-mappers'

/**
 * The employee's own wage, mapped onto the designation kit.
 *
 * An override is a wage structure a tier up — the same figures, the same acts,
 * priced the same way, edited on the same grid — so it maps through the same
 * functions rather than a parallel set of them. Two adjustments make it fit:
 *
 * - **Heads arrive unsplit.** Putting a head under its grid column needs the
 *   allowance / deduction master, which this read doesn't have, so the wage
 *   fields are mapped against `NO_WAGE_HEADS` and each version carries its heads
 *   as a flat `salaryComponents` list. `toWageStructureView` splits them once the
 *   screen has the master.
 * - **Four settings with no column.** PF/ESIC/PT on overtime and recovering LWF
 *   from wages are fields of this endpoint that the grid has never carried. They
 *   are read back onto the version so the screen can report them, and left out of
 *   the payload so the API's own seed-and-keep rule carries them forward.
 */

/**
 * One wage as the API sends it → the version the screen renders. Serves all
 * three shapes on the read: the employee's own version, the designation's
 * template, and whichever of the two is in force.
 *
 * `employeeServiceId` is only on the employee's own rows — the designation's
 * template is not saved against a posting, so it reads as `null` there.
 *
 * `ownHeads` says whether this version carries a head list of its **own**. It is
 * what the grid's "Heads" column renders, and it is the difference between "this
 * person no longer gets HRA" and "this person is on the designation's HRA".
 */
export function toEmployeeWageVersion(
  response: WageStructureResponse | EmployeeWageVersionResponse,
): EmployeeWageVersion {
  /* `designationId` is the designation kit's own field and means nothing on an
     employee's row, so it's mapped with a placeholder and dropped here. */
  const {
    designationId: _designationId,
    allowances: _allowances,
    deductions: _deductions,
    ...structure
  } = toWageStructure(response, 0, NO_WAGE_HEADS)

  const components = (response.salary_components ?? []).map(toEmployeeWageComponent)

  return {
    ...structure,
    ownHeads: components.length > 0,
    salaryComponents: components,
    employeeServiceId:
      'employee_service_id' in response ? response.employee_service_id : null,
    lwfDeductFromWages: response.is_lwf_deduct_from_wages ?? false,
    pfApplicableOnOvertime: response.is_pf_applicable_on_overtime ?? false,
    esicApplicableOnOvertime: response.is_esic_applicable_on_overtime ?? false,
    ptApplicableOnOvertime: response.is_pt_applicable_on_overtime ?? false,
  }
}

/**
 * A version → the shape the shared grid reads its saved rows as.
 *
 * The grid is the designation master's, so its rows are `DesignationWageStructure`.
 * An employee's version is one in all but two fields: `designationId`, which is
 * never rendered, and the split head cells — filled in here from the version's own
 * `salaryComponents` against the master's heads, so a saved row shows the heads
 * that version was actually priced on.
 *
 * A version with **no** heads of its own leaves both sides blank rather than
 * showing the designation's figures: those are not this version's, and a pencil on
 * that row would offer to edit something it doesn't hold.
 */
export function toWageStructureView(
  version: EmployeeWageVersion,
  heads: WageHeads = NO_WAGE_HEADS,
): DesignationWageStructure {
  const structure = toWageStructure(
    /* Only the head half is re-read here; every other field is already mapped, so
       a minimal response stands in for the rest. */
    versionHeadsResponse(version),
    0,
    heads,
  )

  return {
    ...version,
    designationId: 0,
    allowances: structure.allowances,
    deductions: structure.deductions,
  }
}

/**
 * The head half of a version, back in the wire shape `toWageStructure` splits.
 *
 * A round trip rather than a second splitter: the grid's saved rows have to read
 * a head exactly as the designation's own history does — same defaults, same
 * schedule repair, same "a head the master no longer lists has no column" rule —
 * and there is only one function that does all of that.
 */
function versionHeadsResponse(version: EmployeeWageVersion): WageStructureResponse {
  return {
    id: version.id,
    applicable_date: `${version.effectiveFrom}-01`,
    salary_type: version.salaryType,
    basic_pay: version.basicPay,
    wages_per_day: version.wagePerDay,
    working_day_calculation_type: version.workingDayCalculationType ?? '',
    working_days: version.workingDays,
    weekly_off: version.weeklyOff,
    extra_day_amount_per_day: version.extraDayAmountPerDay,
    is_pf_act_applicable: version.pfActApplicable,
    pf_deduction_type: version.pfValueType,
    pf_deduction_amount: version.pfValue,
    is_employee_pf_contribution_on_wage_limit: version.employeePfContributionOnWageLimit,
    is_employer_pf_contribution_on_wage_limit: version.employerPfContributionOnWageLimit,
    is_esic_act_applicable: version.esicActApplicable,
    esic_deduction_basis: version.esicDeductionBasis,
    is_pt_act_applicable: version.ptActApplicable,
    pt_act_type: version.ptActType,
    pt_amount: version.ptAmount,
    is_lwf_act_applicable: version.lwfActApplicable,
    lwf_act_type: version.lwfActType,
    lwf_amount: version.lwfAmount,
    is_lwf_deduct_from_wages: version.lwfDeductFromWages,
    is_overtime_applicable: version.overtimeApplicable,
    overtime_rate_per_hour: version.overtimeRatePerHour,
    is_pf_applicable_on_overtime: version.pfApplicableOnOvertime,
    is_esic_applicable_on_overtime: version.esicApplicableOnOvertime,
    is_pt_applicable_on_overtime: version.ptApplicableOnOvertime,
    is_tds_act_applicable: version.tdsActApplicable,
    tds_percentage: version.tdsPercentage,
    salary_components: version.salaryComponents.map(toComponentResponse),
  }
}

/** One mapped head, back in the wire shape. */
function toComponentResponse(
  component: EmployeeWageComponent,
): SalaryComponentResponse {
  return {
    pay_component_id: component.payComponentId,
    component_type: component.componentType || null,
    sort_order: component.sortOrder,
    amount: component.amount,
    amount_type: component.amountType,
    pf_applicable: component.pfApplicable,
    esic_applicable: component.esicApplicable,
    pt_applicable: component.ptApplicable,
    payout_frequency: component.payoutFrequency,
    start_month: component.startMonth === '' ? null : Number(component.startMonth),
    amount_mode: component.amountMode,
    payroll_calculation: component.payrollCalculation,
    calculation_base: component.calculationBase,
  }
}

/** `GET /user/employees/:id/wage` → the whole of what step 3 renders. */
export function toEmployeeWage(response: EmployeeWageResponse): EmployeeWage {
  const version = (raw: WageStructureResponse | null | undefined) =>
    raw ? toEmployeeWageVersion(raw) : null

  const heads = (raw: EmployeeWageResponse['salary_components']) =>
    (raw ?? []).map(toEmployeeWageComponent)

  return {
    employeeId: response.employee_id,
    employeeServiceId: response.employee_service_id,
    designationId: response.designation_id ?? null,
    source: response.source ?? null,
    effectiveWage: version(response.effective_wage),
    ownWage: version(response.own_wage),
    designationWage: version(response.designation_wage_structure),
    salaryComponents: heads(response.salary_components),
    /*
     * Which tier priced the HEADS — a separate question from `source`, which is
     * about the WAGE. Own basic pay with the designation's allowances is a real
     * state, so neither one may be derived from the other.
     */
    componentSource: response.component_source ?? null,
    ownSalaryComponents: heads(response.own_salary_components),
    designationSalaryComponents: heads(response.designation_salary_components),
    versions: (response.versions ?? []).map(toEmployeeWageVersion),
  }
}

/**
 * One validated grid row → the body both writes take.
 *
 * Everything the row leaves to be derived (the wage per day, an overtime rate
 * left blank) is computed by the shared mapper, and settings behind a switched-off
 * act go as `null` rather than as stale values.
 *
 * `salary_components` is the one field this screen decides rather than simply
 * forwards, because the endpoint reads three states differently:
 *
 * - **`ownHeads` is off** → the key is sent as **`[]`**, which CLEARS the
 *   version's own heads and hands the employee back to the designation's catalog.
 *   That is the only way to un-override a head list.
 * - **`ownHeads` is on** → the row's own head cells are sent, and from then on
 *   THAT list prices the person; the designation's catalog stops applying to them
 *   entirely. The override is wholesale by design — merging would make "this
 *   person no longer gets HRA" inexpressible.
 *
 * The third state, omitting the key, is what `keepHeads` asks for: on a POST it
 * seeds the new version from whatever priced the person before it, and on a PATCH
 * it leaves the stored heads untouched. It is what a save that isn't about the
 * heads should send, so a form editing only basic pay can't strip someone's
 * allowances.
 */
export function employeeWageToPayload(
  row: WageStructureRow,
  { keepHeads = false }: { keepHeads?: boolean } = {},
): EmployeeWagePayload {
  const { salary_components: components, ...payload } = wageRowToPayload(row)

  if (keepHeads) return payload
  return { ...payload, salary_components: row.ownHeads ? components : [] }
}
