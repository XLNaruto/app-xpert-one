import type {
  DesignationLeaveQuotasResponse,
  EmployeeLeaveQuotasResponse,
  LeaveQuotasPayload,
} from '../schemas'
import type {
  DesignationLeaveQuotas,
  EmployeeLeaveQuotas,
  LeaveQuotaRow,
  LeaveQuotaSaveRow,
} from '../types'

/** Pure translation between the API's snake_case grids and the screen's rows. */

type RawRow = DesignationLeaveQuotasResponse['items'][number]

function toRow(raw: RawRow): LeaveQuotaRow {
  return {
    leaveTypeId: raw.leave_type_id,
    shortCode: raw.short_code ?? '',
    leaveType: raw.leave_type ?? '',
    payType: raw.pay_type ?? 'PAID',
    /*
     * `null` is kept as `null` on purpose. It means "nothing set at this tier",
     * which falls through to the tier below — defaulting it to `0` would say the
     * opposite ("no paid days of this type", stored) and silently override the
     * designation's policy the next time the grid was saved.
     */
    annualPaidLeave: raw.annual_paid_leave ?? null,
    unlimited: raw.unlimited ?? false,
    ...(raw.falls_back_to === undefined && raw.fallback_source === undefined
      ? {}
      : {
          fallsBackTo: raw.falls_back_to ?? null,
          fallbackSource: raw.fallback_source ?? 'NONE',
        }),
  }
}

export function toDesignationLeaveQuotas(
  response: DesignationLeaveQuotasResponse,
): DesignationLeaveQuotas {
  return {
    designationId: response.designation_id,
    designationName: response.designation_name ?? '',
    companyId: response.company_id ?? 0,
    items: response.items.map(toRow),
  }
}

export function toEmployeeLeaveQuotas(
  response: EmployeeLeaveQuotasResponse,
): EmployeeLeaveQuotas {
  return {
    employeeId: response.employee_id,
    employeeName: response.employee_name ?? '',
    employeeCode: response.employee_code ?? '',
    companyId: response.company_id ?? 0,
    designationId: response.designation_id ?? null,
    designationName: response.designation_name ?? '',
    year: response.year,
    items: response.items.map(toRow),
  }
}

/**
 * The save body.
 *
 * Three server-side 400s are all prevented here rather than surfaced:
 *
 * - **unknown leave type** — the rows are built from the `items` the GET returned,
 *   so every id belongs to this company;
 * - **listed more than once** — one row per leave type by construction;
 * - **unpaid type has no allowance to set** — an `unlimited` row is dropped.
 *
 * And the distinction the API cares most about is preserved: an EMPTY cell sends
 * NOTHING (fall through to the tier below), while a typed `0` sends `0` ("no paid
 * days of this type", stored at this tier). Sending `0` for a blank box would
 * quietly override the designation's policy with a zero.
 */
export function toLeaveQuotasPayload(rows: LeaveQuotaSaveRow[]): LeaveQuotasPayload {
  return {
    rows: rows.map((row) => ({
      leave_type_id: row.leaveTypeId,
      annual_paid_leave: row.annualPaidLeave,
    })),
  }
}
