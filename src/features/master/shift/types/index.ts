import type { AuditFields } from '@/types/audit'

/** How one late day is charged — a share of that day's wage, or flat rupees. */
export type LateCheckInPenaltyType = 'PERCENTAGE' | 'FIXED'

/**
 * A shift master record as consumed by the UI (camelCase), mapped from the raw
 * `/user/shifts` response.
 *
 * A shift is a TIMELINE: the identity below (company, name, status) is the record,
 * and every RULE hangs off a dated version. The same shift id legitimately reports
 * different timings for different days — what you get here is the version in force
 * for the day the API answered for, named by `versionId` / `effectiveDate`.
 */
export interface Shift extends AuditFields {
  id: number
  /** The tenant the shift belongs to — the company whose screen created it. */
  companyId: number
  shiftName: string
  /** `HH:MM`, 24-hour. */
  startTime: string
  /** `HH:MM`, 24-hour. Earlier than `startTime` means the shift crosses midnight. */
  endTime: string
  /**
   * Derived server-side from the two times, never sent — true when the shift
   * runs past midnight.
   */
  isNightShift: boolean
  /** Unpaid break inside the shift. */
  breakMinutes: number
  /**
   * True when break time taken beyond `breakMinutes` is docked from pay — the
   * excess only, at the per-minute rate of the daily wage, landing on the payslip
   * as its `lunch_deduction`. False (the default) reports the overage without
   * charging for it.
   */
  isLateBreakPenaltyApplicable: boolean
  /** Minutes after `startTime` in which a check-in still counts as on time. */
  concessionMinutes: number
  /**
   * True when a check-in past `concessionMinutes` is docked from pay — the day
   * charged once by the type and value below, landing on the payslip as its
   * `penalty`. False (the default) reports the lateness without charging for it.
   */
  isLateCheckInPenaltyApplicable: boolean
  /**
   * How a late day is charged: a percentage of that day's wage, or a flat rupee
   * amount. `null` while no rule has been configured — it survives the switch
   * being turned off, so a suspended rule keeps its numbers.
   */
  lateCheckInPenaltyType: LateCheckInPenaltyType | null
  /**
   * What one late day costs — percent (at most 100) or rupees, per the type. A
   * fixed amount above the day's wage is capped when charged, so a day can pay
   * nothing but never owes.
   */
  lateCheckInPenaltyValue: number | null
  /** The mirror of the concession at the end of the shift. */
  earlyExitGraceMinutes: number
  /** Worked hours at or above this are a full day. */
  minFullDayHours: number
  /** Worked hours at or above this, but under a full day, are a half day. */
  minHalfDayHours: number
  /**
   * The week-off policy this shift names, or `null` when it names none — in which
   * case the department's default answers, then the company's, then the platform's
   * Sunday-only constant.
   */
  weekoffPolicyId: number | null
  status: boolean
  /**
   * Which dated version these timings are, and the day it took effect. `null` on
   * a response written before the timeline existed.
   */
  versionId: number | null
  /** `YYYY-MM-DD` — the day this version's rules started applying. */
  effectiveDate: string
}

/**
 * One dated version of a shift's rules.
 *
 * Which version answers a day: the greatest `effectiveDate` <= that day, and if
 * the day precedes every version, the earliest one — so history older than the
 * shift itself still resolves.
 *
 * `shiftName` and `status` are deliberately absent: they aren't versioned, and
 * repeating today's name on every historical row would suggest the shift had
 * always been called that.
 */
export interface ShiftVersion extends AuditFields {
  id: number
  shiftId: number
  /** `YYYY-MM-DD`. */
  effectiveDate: string
  startTime: string
  endTime: string
  isNightShift: boolean
  breakMinutes: number
  isLateBreakPenaltyApplicable: boolean
  concessionMinutes: number
  isLateCheckInPenaltyApplicable: boolean
  lateCheckInPenaltyType: LateCheckInPenaltyType | null
  lateCheckInPenaltyValue: number | null
  earlyExitGraceMinutes: number
  minFullDayHours: number
  minHalfDayHours: number
  weekoffPolicyId: number | null
  /**
   * The version in force TODAY — exactly one row carries it, and it is NOT always
   * the newest, because a change can be dated in the future.
   */
  isCurrent: boolean
}
