import type { AuditFields } from '@/types/audit'

/**
 * One rule of a week-off pattern, as the UI holds it.
 *
 * A rule is not "Sunday is off" — it is "*this occurrence* of this weekday is
 * off (or isn't)". `weekNumber` names which occurrence of `weekDay` in the month
 * it applies to (1–5), and `null` means every one. That's what makes alternate
 * Saturdays expressible: two rules, occurrence 2 and 4.
 *
 * Because a dated rule beats an every-week rule, `isOff: false` is meaningful —
 * it carves an exception out of a broad rule ("Saturdays are off, except the
 * 1st").
 */
export interface WeekoffDay {
  id: number
  /** 0 = Sunday … 6 = Saturday. */
  weekDay: number
  /** Which occurrence in the month (1–5); `null` is every occurrence. */
  weekNumber: number | null
  isOff: boolean
}

/**
 * Which shape a policy is.
 *
 * `FIXED` names the weekdays (`days`), which is what every policy written before
 * this field existed is. `FLEXIBLE` names a count instead — so many days off a
 * week, ANY days — for a business that runs seven days and lets each person rest
 * when the rota allows. A flexible policy carries no rules at all.
 */
export type WeekoffOffType = 'FIXED' | 'FLEXIBLE'

/** A week-off policy master record as consumed by the UI. */
export interface WeekoffPolicy extends AuditFields {
  id: number
  /** The tenant the policy belongs to. */
  companyId: number
  name: string
  status: boolean
  offType: WeekoffOffType
  /**
   * FLEXIBLE only: how many days a week are off. `null` on a FIXED policy.
   *
   * Nothing is off IN ADVANCE under this — the employee hasn't taken their day
   * yet — so the days are credited afterwards on the attendance month grid.
   */
  weeklyOffDays: number | null
  /** The whole rule set — read together, it *is* the pattern. Empty when FLEXIBLE. */
  days: WeekoffDay[]
}
