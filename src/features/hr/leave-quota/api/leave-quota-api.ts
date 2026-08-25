import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  designationLeaveQuotasResponseSchema,
  employeeLeaveQuotasResponseSchema,
  type LeaveQuotasPayload,
} from '../schemas'
import {
  toDesignationLeaveQuotas,
  toEmployeeLeaveQuotas,
  toLeaveQuotasPayload,
} from '../lib/leave-quota-mappers'
import type {
  DesignationLeaveQuotas,
  EmployeeLeaveQuotas,
  LeaveQuotaSaveRow,
} from '../types'

/**
 * The paid-allowance grids — one per tier.
 *
 * Both `PUT`s are a **WHOLE-LIST REPLACE**: `rows` is the complete grid, and a
 * leave type left out has its allowance at that tier cleared. Never send a partial
 * patch; `{ rows: [] }` clears the tier entirely.
 *
 * Both answer the freshly rendered grid, so a screen re-binds from the response
 * rather than assuming what it sent is what was stored.
 */

/** GET /user/designations/:id/leave-quotas — the role's standing policy. */
export async function fetchDesignationLeaveQuotas(
  designationId: number,
): Promise<DesignationLeaveQuotas> {
  try {
    const raw = await http.get<unknown>(endpoints.DESIGNATIONS.LEAVE_QUOTAS(designationId))
    return toDesignationLeaveQuotas(designationLeaveQuotasResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the leave allowances.")
  }
}

/** PUT /user/designations/:id/leave-quotas — replaces the whole policy. */
export async function saveDesignationLeaveQuotas(
  designationId: number,
  rows: LeaveQuotaSaveRow[],
): Promise<DesignationLeaveQuotas> {
  try {
    const raw = await http.put<unknown, LeaveQuotasPayload>(
      endpoints.DESIGNATIONS.LEAVE_QUOTAS(designationId),
      toLeaveQuotasPayload(rows),
    )
    return toDesignationLeaveQuotas(designationLeaveQuotasResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the leave allowances.")
  }
}

/**
 * GET /user/employees/:id/leave-quotas?year= — the employee's own grant for that
 * year, with the designation number behind each empty cell.
 */
export async function fetchEmployeeLeaveQuotas(
  employeeId: number,
  year: number,
): Promise<EmployeeLeaveQuotas> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.LEAVE_QUOTAS(employeeId), {
      params: { year },
    })
    return toEmployeeLeaveQuotas(employeeLeaveQuotasResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the leave allowances.")
  }
}

/**
 * PUT /user/employees/:id/leave-quotas?year= — replaces that YEAR's grant only;
 * other years are untouched. A type left out falls back to the designation.
 */
export async function saveEmployeeLeaveQuotas(
  employeeId: number,
  year: number,
  rows: LeaveQuotaSaveRow[],
): Promise<EmployeeLeaveQuotas> {
  try {
    const raw = await http.put<unknown, LeaveQuotasPayload>(
      endpoints.EMPLOYEES.LEAVE_QUOTAS(employeeId),
      toLeaveQuotasPayload(rows),
      // `http.put`'s third argument is the form-encode flag, not the config.
      undefined,
      { params: { year } },
    )
    return toEmployeeLeaveQuotas(employeeLeaveQuotasResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the leave allowances.")
  }
}
