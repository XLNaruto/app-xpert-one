import type {
  LeaveTypeFormValues,
  LeaveTypeResponse,
  LeaveTypeUpdatePayload,
} from '../schemas'
import type { LeavePayType, LeaveType } from '../types'

/**
 * Narrow the response's free-form `type` to the two the UI knows. Anything
 * unexpected reads as unpaid — the conservative side, since paid leave is the
 * one that costs money.
 */
function toPayType(type: string): LeavePayType {
  return type.toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID'
}

/**
 * API record → the UI leave type. The audit trail only comes back on the list
 * rows; on a single-record response it's absent and renders as a dash.
 */
export function toLeaveType(response: LeaveTypeResponse): LeaveType {
  return {
    id: response.id,
    companyId: response.company_id,
    leaveName: response.name,
    shortName: response.short_code,
    payType: toPayType(response.type),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at,
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 */
export function leaveTypeToPayload(values: LeaveTypeFormValues): LeaveTypeUpdatePayload {
  return {
    short_code: values.shortName.trim(),
    name: values.leaveName.trim(),
    type: values.payType,
  }
}

/** Hydrate the edit form from a stored leave type. */
export function leaveTypeToFormValues(leaveType: LeaveType): LeaveTypeFormValues {
  return {
    leaveName: leaveType.leaveName,
    shortName: leaveType.shortName,
    payType: leaveType.payType,
  }
}
