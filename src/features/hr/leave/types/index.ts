import type { AuditFields } from '@/types/audit'

/**
 * Leave Management — the UI-facing record types.
 *
 * A leave is a top-level record rather than something hanging off an employee:
 * `/user/employee-leaves` answers the company-wide register, which is what this
 * module lists, and every row names the employee it belongs to.
 *
 * ## Rows, applications, and why there are two types here
 *
 * **Nobody picks paid or unpaid.** The employee (or the desk) picks a leave TYPE;
 * each type carries its own yearly PAID ALLOWANCE, and the server spends that
 * allowance day by day. Days within it are `PAID`, every day past it is `UNPAID`,
 * without limit — so ONE application can come back as TWO rows sharing an
 * `applicationRef`, one of each pay type.
 *
 * That is why the register's row type (`Leave`) and the thing a user thinks they
 * filed (`LeaveApplication`) are different types. The list endpoint answers rows;
 * the write endpoints answer applications; the screen groups the rows back into
 * applications so a split request reads as the one line it was filed as.
 *
 * Running out of allowance NEVER refuses an application — it only stops paying
 * for it. There is no "insufficient balance" error to render.
 */

export type LeaveDuration = 'FULL_DAY' | 'HALF_DAY'
export type LeavePayType = 'PAID' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * Who a pending leave sits with, and whether the reader may decide it.
 *
 * Read the three as ONE statement, not as three flags: `canDecide` describes YOU,
 * the other two describe the ROW. An owner sees `canDecide: true` on a row that
 * says `pendingWithRole: "HR"`, because the owner decides anything.
 *
 * All three are null/false on an already-decided row — there is no decision left
 * to own, and drawing a button there would produce a 400.
 *
 * The block is per row but IDENTICAL across an application's rows, so the grouped
 * line reads it off the first one.
 */
export interface LeaveApproval {
  /** The chain level holding it, e.g. `"HR"`. `null` once decided. */
  pendingWithRole: string | null
  /** It fell through the whole chain to the account owner. */
  pendingWithOwner: boolean
  /**
   * May YOU press Approve / Reject on THIS row?
   *
   * Drive the buttons off this, never off the permission code: `leaves:update`
   * now only says you may work a leave desk, not that this particular application
   * is yours.
   */
  canDecide: boolean
}

/** One stored leave row — half of a split application, or the whole of an unsplit one. */
export interface Leave extends AuditFields, LeaveApproval {
  id: number
  /**
   * The application the row belongs to. Both halves of a split share it, and it
   * survives an edit that rewrites the rows — unlike `id`, which does not.
   */
  applicationRef: string
  employeeId: number
  employeeName: string
  employeeCode: string
  companyId: number
  fromDate: string
  toDate: string
  duration: LeaveDuration
  /** `HH:MM` — only a half day carries the two times. */
  fromTime: string
  toTime: string
  /** DECIDED BY THE SERVER from the type's remaining allowance — never submitted. */
  payType: LeavePayType
  leaveTypeId: number | null
  /**
   * The type's name as it stood when the leave was filed — a snapshot, so it
   * survives a rename or a deletion of the master row. Render THIS.
   */
  leaveType: string
  /** The catalog's current name, blank if the type has since been deleted. */
  leaveTypeName: string
  leaveReason: string
  /** Object key of the proof file, to be resolved with `mediaUrl()`. */
  attachment: string
  status: LeaveStatus
  /** The note the employee reads — a rejection reason, typically. */
  statusRemark: string
  statusAt: string
}

/**
 * What a write answers: the APPLICATION, with the split the server decided.
 *
 * Create, edit and decide all return this — never a bare row. After an edit that
 * moved the dates or the type the rows are REWRITTEN and their `id`s change, so a
 * screen must re-bind from this rather than reuse the id it sent.
 */
export interface LeaveApplication {
  applicationRef: string
  fromDate: string
  toDate: string
  status: LeaveStatus
  /** Days the allowance paid for. Fractional on a half day. */
  paidDays: number
  /** Days past the allowance. Fractional on a half day. */
  unpaidDays: number
  /** The application became two rows — one paid, one unpaid. */
  split: boolean
  rows: Leave[]
}

/**
 * A register line: one application, assembled from the rows the list returned.
 *
 * Everything the two halves agree on is lifted to the top; the two day counts are
 * summed. `id` is the row a write is addressed to — any row of the group moves the
 * whole application, so the first is as good as any.
 */
export interface LeaveGroup extends LeaveApproval {
  applicationRef: string
  /** The row a decision/delete/edit is sent to. */
  id: number
  rows: Leave[]
  employeeId: number
  employeeName: string
  employeeCode: string
  fromDate: string
  toDate: string
  duration: LeaveDuration
  fromTime: string
  toTime: string
  leaveType: string
  leaveTypeName: string
  leaveTypeId: number | null
  leaveReason: string
  attachment: string
  status: LeaveStatus
  statusRemark: string
  paidDays: number
  unpaidDays: number
  /** More than one row — a paid half and an unpaid one. */
  split: boolean
}

/* ── The balance card ────────────────────────────────────────────────────── */

/** Where an allowance came from. `NONE` means NO PAID DAYS — never "unlimited". */
export type LeaveQuotaSource = 'EMPLOYEE' | 'DESIGNATION' | 'NONE'

/**
 * One leave type's line on the balance card. **This is the real answer** —
 * allowances DO NOT POOL, so a headline "6 available" can be six sick days and
 * zero casual ones.
 */
export interface LeaveBalanceItem {
  leaveTypeId: number
  shortCode: string
  leaveType: string
  payType: LeavePayType
  /** The yearly paid allowance for this type. `0` with `NONE` = no paid days. */
  total: number
  quotaSource: LeaveQuotaSource
  /** Already approved. */
  used: number
  /** Awaiting a decision — it already reduces what is free. */
  pending: number
  /**
   * `max(0, total − used − pending)`, never negative. `null` on an UNPAID type,
   * which is uncapped — render that as "Unlimited", never as `0`.
   */
  available: number | null
  /** `max(0, used + pending − total)` — days past the allowance, unpaid in effect. */
  overflow: number
}

/** The paid headline — a SUM of the per-type lines, not a spendable pot. */
export interface LeavePaidTotals {
  total: number
  used: number
  pending: number
  /** A sum of per-type remainders. It does NOT mean any one type has room. */
  available: number
  overflow: number
}

export interface LeaveUnpaidTotals {
  used: number
  pending: number
  /** `used + pending + paid.overflow` — everything the employee isn't paid for. */
  effective: number
}

/**
 * `GET /user/employee-leaves/balance` for one employee and year.
 *
 * `paid`/`unpaid` are summed from each leave row's own snapshot, so days filed
 * under a since-DELETED leave type count in the headline while appearing in no
 * line of `items`. The two are not expected to reconcile — don't assert they do.
 */
export interface LeaveBalance {
  year: number
  fromDate: string
  toDate: string
  paid: LeavePaidTotals
  unpaid: LeaveUnpaidTotals
  items: LeaveBalanceItem[]
}
