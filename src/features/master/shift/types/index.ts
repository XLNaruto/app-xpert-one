import type { AuditFields } from '@/types/audit'

/**
 * A shift master record as consumed by the UI (camelCase), mapped from the raw
 * `/user/shifts` response.
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
  /** Minutes after `startTime` in which a check-in still counts as on time. */
  concessionMinutes: number
  /** The mirror of the concession at the end of the shift. */
  earlyExitGraceMinutes: number
  /** Worked hours at or above this are a full day. */
  minFullDayHours: number
  /** Worked hours at or above this, but under a full day, are a half day. */
  minHalfDayHours: number
  status: boolean
}
