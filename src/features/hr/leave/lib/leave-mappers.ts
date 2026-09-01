import { DATE_LENGTH, leaveDayCount } from './leave-dates'
import type {
  LeaveApplicationResponse,
  LeaveBalanceResponse,
  LeaveDecisionFormValues,
  LeaveDecisionPayload,
  LeaveFormValues,
  LeavePayload,
  LeaveResponse,
} from '../schemas'
import type { Leave, LeaveApplication, LeaveBalance, LeaveGroup } from '../types'

/** Pure translation between the API's snake_case rows and the screen's records. */

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
    /*
     * Every row of one application shares this, and it survives an edit that
     * rewrites the rows — which `id` does not. A row answered without one is its
     * own application, so it falls back to the id to keep grouping total.
     */
    applicationRef: response.application_ref ?? `row-${response.id}`,
    employeeId: response.employee_id,
    employeeName: response.employee_name ?? '',
    employeeCode: response.employee_code ?? '',
    companyId: response.company_id ?? 0,
    fromDate: response.from_date ?? '',
    toDate: response.to_date ?? '',
    duration: response.duration ?? 'FULL_DAY',
    fromTime: response.from_time ?? '',
    toTime: response.to_time ?? '',
    // Read-only: set by the server from what was left of the type's allowance.
    payType: response.pay_type ?? 'PAID',
    leaveTypeId: response.leave_type_id ?? null,
    leaveType: response.leave_type ?? '',
    leaveTypeName: response.leave_type_name ?? '',
    leaveReason: response.leave_reason ?? '',
    attachment: response.attachment ?? '',
    status: response.status,
    statusRemark: response.status_remark ?? '',
    statusAt: response.status_at ?? '',
    pendingWithRole: response.pending_with_role ?? null,
    pendingWithOwner: response.pending_with_owner ?? false,
    pendingWithNobody: response.pending_with_nobody ?? false,
    /*
     * Absent means "the API didn't say", and the safe reading of that is the old
     * behaviour: a pending row the caller holds `leaves:update` on is decidable.
     * The screen still gates the buttons on the permission alongside this, so a
     * false here is respected and a missing one doesn't blank the desk.
     */
    canDecide: response.can_decide ?? response.status === 'PENDING',
    ...auditOf(response),
  }
}

/**
 * The application a write answers. Its `rows` repeat only what changed, so each
 * one is filled out from the first row for the fields it left off — the type, the
 * employee and the reason are properties of the application, not of a half of it.
 */
export function toLeaveApplication(response: LeaveApplicationResponse): LeaveApplication {
  const rows = response.rows.map(toLeave)
  const first = rows[0]

  return {
    applicationRef: response.application_ref ?? first?.applicationRef ?? '',
    fromDate: toFormDate(response.from_date) || (first?.fromDate ?? ''),
    toDate: toFormDate(response.to_date) || (rows[rows.length - 1]?.toDate ?? ''),
    status: response.status,
    paidDays: response.paid_days ?? 0,
    unpaidDays: response.unpaid_days ?? 0,
    // `split` is derivable from the row count, so a response that omits it is
    // still read correctly.
    split: response.split ?? rows.length > 1,
    rows: rows.map((row) =>
      first === row
        ? row
        : {
            ...row,
            employeeId: row.employeeId || first.employeeId,
            employeeName: row.employeeName || first.employeeName,
            employeeCode: row.employeeCode || first.employeeCode,
            leaveType: row.leaveType || first.leaveType,
            leaveTypeName: row.leaveTypeName || first.leaveTypeName,
            leaveTypeId: row.leaveTypeId ?? first.leaveTypeId,
            leaveReason: row.leaveReason || first.leaveReason,
            attachment: row.attachment || first.attachment,
            duration: row.duration || first.duration,
          },
    ),
  }
}

/**
 * Fold the register's rows back into the applications they were filed as.
 *
 * The list endpoint answers **one row per row**, so a split request arrives as
 * two entries that a reader would read as two leaves. Grouping on
 * `applicationRef` puts them back together, in the order the endpoint returned
 * them — the sort is server-side and re-sorting here would fight it.
 *
 * The day counts are the SPAN of each row's own dates, not the server's
 * `paid_days`/`unpaid_days`: the list carries no day counts, and the span is what
 * the two dates on screen already say. It is an honest read of the row and the
 * right thing to show beside those dates; the authoritative figures come back on
 * the write response and on the balance card.
 *
 * ⚠ Grouping happens WITHIN a page. The endpoint pages by row, so both halves of
 * a split normally arrive together but can straddle a page boundary — in which
 * case each page shows the half it has. The pager's `total` stays the row count
 * the server reported, because that is what it is paging.
 */
export function groupLeaves(rows: Leave[]): LeaveGroup[] {
  const groups: LeaveGroup[] = []
  const byRef = new Map<string, LeaveGroup>()

  for (const row of rows) {
    const days = leaveDayCount(row.fromDate, row.toDate, row.duration)
    const existing = byRef.get(row.applicationRef)

    if (existing) {
      existing.rows.push(row)
      existing.split = true
      // The application spans every row it was split into.
      if (row.fromDate && (!existing.fromDate || row.fromDate < existing.fromDate)) {
        existing.fromDate = row.fromDate
      }
      if (row.toDate > existing.toDate) existing.toDate = row.toDate
      if (row.payType === 'PAID') existing.paidDays += days
      else existing.unpaidDays += days
      continue
    }

    const group: LeaveGroup = {
      applicationRef: row.applicationRef,
      // Any row of the group moves the whole application, so the first will do.
      id: row.id,
      rows: [row],
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      fromDate: row.fromDate,
      toDate: row.toDate,
      duration: row.duration,
      fromTime: row.fromTime,
      toTime: row.toTime,
      leaveType: row.leaveType,
      leaveTypeName: row.leaveTypeName,
      leaveTypeId: row.leaveTypeId,
      leaveReason: row.leaveReason,
      attachment: row.attachment,
      status: row.status,
      statusRemark: row.statusRemark,
      paidDays: row.payType === 'PAID' ? days : 0,
      unpaidDays: row.payType === 'UNPAID' ? days : 0,
      split: false,
      // The approval block is per row but identical across the group.
      pendingWithRole: row.pendingWithRole,
      pendingWithOwner: row.pendingWithOwner,
      pendingWithNobody: row.pendingWithNobody,
      canDecide: row.canDecide,
    }
    byRef.set(row.applicationRef, group)
    groups.push(group)
  }

  return groups
}

/**
 * How a leave body is built for the call being made. The API reads a PATCH two
 * different ways, and the screen has to pick one deliberately:
 *
 * - `create` — the whole record, plus the employee and the opening status.
 * - `schedule` — a PENDING application's type/dates/duration. This RE-RUNS the
 *   split, so the rows are rewritten and **their ids change**.
 * - `notes` — the reason and the attachment only. Allowed at any status, written
 *   to every row of the application, ids untouched. The only edit a DECIDED
 *   application accepts.
 */
export type LeavePayloadMode = 'create' | 'schedule' | 'notes'

/**
 * A leave body. **Never carries `pay_type`** — the server decides paid vs unpaid
 * from what is left of the type's yearly allowance, and one sent from here is
 * ignored.
 *
 * The two times travel only on a half day, since the API rejects them on a full
 * one. `employee_id` and `status` travel only on create: a leave can't change
 * hands, and the decision has its own endpoint.
 */
export function leaveToPayload(
  values: LeaveFormValues,
  mode: LeavePayloadMode,
): LeavePayload {
  const notes = {
    leave_reason: orNull(values.leaveReason),
    attachment: orNull(values.attachment),
  }
  if (mode === 'notes') return notes

  const isHalfDay = values.duration === 'HALF_DAY'
  const schedule = {
    from_date: toApiDate(values.fromDate),
    to_date: toApiDate(values.toDate),
    duration: values.duration,
    ...(isHalfDay ? { from_time: values.fromTime, to_time: values.toTime } : {}),
    leave_type_id: idOrNull(values.leaveTypeId),
  }

  if (mode === 'schedule') return { ...schedule, ...notes }

  return {
    employee_id: idOrNull(values.employeeId),
    status: values.status,
    ...schedule,
    ...notes,
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
    status: leave.status,
    leaveReason: leave.leaveReason,
    attachment: leave.attachment,
  }
}

export function leaveDecisionToPayload(
  values: LeaveDecisionFormValues,
): LeaveDecisionPayload {
  return { status: values.status, remark: orNull(values.remark) }
}

/**
 * The balance card. `available` is deliberately NOT defaulted to `0`: `null` is
 * the API saying "uncapped" on an unpaid type, which the card renders as
 * "Unlimited" — collapsing it to zero would say the opposite.
 */
export function toLeaveBalance(response: LeaveBalanceResponse): LeaveBalance {
  return {
    year: response.year,
    fromDate: toFormDate(response.from_date),
    toDate: toFormDate(response.to_date),
    paid: {
      total: response.paid?.total ?? 0,
      used: response.paid?.used ?? 0,
      pending: response.paid?.pending ?? 0,
      available: response.paid?.available ?? 0,
      overflow: response.paid?.overflow ?? 0,
    },
    unpaid: {
      used: response.unpaid?.used ?? 0,
      pending: response.unpaid?.pending ?? 0,
      effective: response.unpaid?.effective ?? 0,
    },
    items: response.items.map((item) => ({
      leaveTypeId: item.leave_type_id,
      shortCode: item.short_code ?? '',
      leaveType: item.leave_type ?? '',
      payType: item.pay_type ?? 'PAID',
      total: item.total ?? 0,
      quotaSource: item.quota_source ?? 'NONE',
      used: item.used ?? 0,
      pending: item.pending ?? 0,
      available: item.available ?? null,
      overflow: item.overflow ?? 0,
    })),
  }
}
