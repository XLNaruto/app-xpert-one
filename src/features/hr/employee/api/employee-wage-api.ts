import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { employeeWageResponseSchema } from '../schemas'
import { employeeWageToPayload, toEmployeeWage } from '../lib/employee-wage-mappers'
import type { WageStructureRow } from '@/features/master/designation'
import type { EmployeeWage } from '../types'

/**
 * Step 3's writable half — the employee's OWN wage.
 *
 * The sibling `/wage-structure` read reports the designation's template and
 * knows nothing about an override; these four calls are the override itself.
 * Every one of them answers the same whole picture back (both candidates, which
 * is in force, the version history), so a save needs no follow-up read.
 */

/** GET /user/employees/:id/wage — what the employee is paid, and by which tier. */
export async function fetchEmployeeWage(employeeId: number): Promise<EmployeeWage> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.WAGE(employeeId))
    return toEmployeeWage(employeeWageResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the employee's wage.")
  }
}

/**
 * POST /user/employees/:id/wage — put the employee on their own terms from a
 * month onward. A version already effective from that exact month IS that
 * month's row, so the API updates it rather than stacking a second one on the
 * date; any other month inserts and keeps the earlier versions as history.
 *
 * A past month is refused (400) — attendance is in and salary may already be
 * processed for it.
 */
export async function createEmployeeWage(
  employeeId: number,
  row: WageStructureRow,
): Promise<EmployeeWage> {
  try {
    const raw = await http.post<unknown>(
      endpoints.EMPLOYEES.WAGE(employeeId),
      employeeWageToPayload(row),
    )
    return toEmployeeWage(employeeWageResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the employee's wage.")
  }
}

/**
 * PATCH /user/employees/:id/wage/:wageId — correct ONE stored version in place.
 *
 * `effective_from` here corrects *this* row's own month; it does not move the pay
 * to a later one, which is what the POST is for. Both ends are closed on a past
 * month: the row being edited must itself be effective from the current month or
 * later, and a live row may not be moved backwards.
 */
export async function updateEmployeeWage(
  employeeId: number,
  wageId: number,
  row: WageStructureRow,
): Promise<EmployeeWage> {
  try {
    const raw = await http.patch<unknown>(
      endpoints.EMPLOYEES.WAGE_VERSION(employeeId, wageId),
      employeeWageToPayload(row),
    )
    return toEmployeeWage(employeeWageResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update this wage version.")
  }
}

/**
 * DELETE /user/employees/:id/wage/:wageId — take the override back.
 *
 * With the row gone payroll falls through to the designation's wage structure
 * again, so the employee returns to the standard terms without anyone copying the
 * template's numbers onto them. Deleting the only version undoes the override
 * entirely; deleting one of several leaves the previous version in force for the
 * months after its own effective date. Soft-delete server-side — a processed
 * salary still points at the figures it was produced from.
 */
export async function deleteEmployeeWage(
  employeeId: number,
  wageId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.WAGE_VERSION(employeeId, wageId))
  } catch (error) {
    throw toApiError(error, "Couldn't remove this wage version.")
  }
}
