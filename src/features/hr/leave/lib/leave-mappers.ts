import type {
  LeaveDecisionFormValues,
  LeaveDecisionPayload,
  LeaveFormValues,
  LeavePayload,
  LeaveResponse,
} from '../schemas'
import type { Leave } from '../types'

/** Pure translation between the API's snake_case rows and the screen's records. */

/** How many characters of an ISO timestamp make up its date. */
const DATE_LENGTH = 10

/**
 * The date a leave endpoint takes — a plain `yyyy-MM-dd`, which is what the form
 * already holds. It rejects a full ISO instant, so a value arriving with a time
 * on it (a record read back from the API) is trimmed to its date. A blank field
 * answers `null`, which is how the API records "not set".
 */
function toApiDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, DATE_LENGTH)
}

/** An API timestamp → the `yyyy-MM-dd` a date field holds. */
function toFormDate(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, DATE_LENGTH)
}

/** A blank text field is stored as `null`, not `""`. */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** A dropdown's string value → the numeric id the API wants, or `null`. */
function idOrNull(value: string): number | null {
  const parsed = Number(value)
  return value.trim() === '' || Number.isNaN(parsed) ? null : parsed
}

function auditOf(response: {
  created_at?: string | null
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

export function toLeave(response: LeaveResponse): Leave {
  return {
    id: response.id,
    employeeId: response.employee_id,
    employeeName: response.employee_name ?? '',
    employeeCode: response.employee_code ?? '',
    companyId: response.company_id,
    fromDate: response.from_date ?? '',
    toDate: response.to_date ?? '',
    duration: response.duration ?? 'FULL_DAY',
    fromTime: response.from_time ?? '',
    toTime: response.to_time ?? '',
    payType: response.pay_type ?? 'PAID',
    leaveTypeId: response.leave_type_id ?? null,
    leaveType: response.leave_type ?? '',
    leaveTypeName: response.leave_type_name ?? '',
    leaveReason: response.leave_reason ?? '',
    attachment: response.attachment ?? '',
    status: response.status,
    statusRemark: response.status_remark ?? '',
    statusAt: response.status_at ?? '',
    ...auditOf(response),
  }
}

/**
 * A leave body. The two times travel only on a half day — the API rejects them on
 * a full one — and `employee_id` and `status` only on create, since a leave can't
 * change hands and the decision has its own endpoint.
 */
export function leaveToPayload(
  values: LeaveFormValues,
  options: { isCreate: boolean },
): LeavePayload {
  const isHalfDay = values.duration === 'HALF_DAY'

  return {
    ...(options.isCreate
      ? { employee_id: idOrNull(values.employeeId), status: values.status }
      : {}),
    from_date: toApiDate(values.fromDate),
    to_date: toApiDate(values.toDate),
    duration: values.duration,
    ...(isHalfDay ? { from_time: values.fromTime, to_time: values.toTime } : {}),
    leave_reason: orNull(values.leaveReason),
    pay_type: values.payType,
    leave_type_id: idOrNull(values.leaveTypeId),
  }
}

export function leaveToFormValues(leave: Leave, blank: LeaveFormValues): LeaveFormValues {
  return {
    ...blank,
    employeeId: String(leave.employeeId),
    leaveTypeId: leave.leaveTypeId === null ? '' : String(leave.leaveTypeId),
    fromDate: toFormDate(leave.fromDate),
    toDate: toFormDate(leave.toDate),
    duration: leave.duration,
    fromTime: leave.fromTime,
    toTime: leave.toTime,
    payType: leave.payType,
    status: leave.status,
    leaveReason: leave.leaveReason,
  }
}

export function leaveDecisionToPayload(
  values: LeaveDecisionFormValues,
): LeaveDecisionPayload {
  return { status: values.status, remark: orNull(values.remark) }
}
