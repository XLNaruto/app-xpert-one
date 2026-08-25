import {
  NO_WAGE_HEADS,
  toWageStructure,
  wageRowToPayload,
} from '@/features/master/designation'
import type {
  DesignationWageStructure,
  WageStructureResponse,
  WageStructureRow,
} from '@/features/master/designation'
import type {
  EmployeeWagePayload,
  EmployeeWageResponse,
  EmployeeWageVersionResponse,
} from '../schemas'
import type { EmployeeWage, EmployeeWageVersion } from '../types'
import { toEmployeeWageComponent } from './employee-step-mappers'

/**
 * The employee's own wage, mapped onto the designation kit.
 *
 * An override is a wage structure a tier up — the same figures, the same acts,
 * priced the same way, edited on the same grid — so it maps through the same
 * functions rather than a parallel set of them. Two adjustments make it fit:
 *
 * - **No heads.** The allowance / deduction catalog is always the designation's
 *   (the API has no per-employee head table), so every conversion runs against
 *   `NO_WAGE_HEADS` and the grid simply shows no head columns.
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

  return {
    ...structure,
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
 * An employee's version is one in all but the two fields it has no use for, which
 * are filled in here rather than forked into a second grid: `designationId` is
 * never rendered, and the empty head arrays are what "no head columns" means.
 */
export function toWageStructureView(
  version: EmployeeWageVersion,
): DesignationWageStructure {
  return { ...version, designationId: 0, allowances: [], deductions: [] }
}

/** `GET /user/employees/:id/wage` → the whole of what step 3 renders. */
export function toEmployeeWage(response: EmployeeWageResponse): EmployeeWage {
  const version = (raw: WageStructureResponse | null | undefined) =>
    raw ? toEmployeeWageVersion(raw) : null

  return {
    employeeId: response.employee_id,
    employeeServiceId: response.employee_service_id,
    designationId: response.designation_id ?? null,
    source: response.source ?? null,
    effectiveWage: version(response.effective_wage),
    ownWage: version(response.own_wage),
    designationWage: version(response.designation_wage_structure),
    salaryComponents: (response.salary_components ?? []).map(toEmployeeWageComponent),
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
 * `salary_components` is stripped: the heads are the designation's, and sending
 * an empty array would read as "this employee has no allowances".
 */
export function employeeWageToPayload(row: WageStructureRow): EmployeeWagePayload {
  const { salary_components: _components, ...payload } = wageRowToPayload(row)
  return payload
}
