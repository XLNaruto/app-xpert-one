import type { AuditFields } from '@/types/audit'

/** A holiday master record. Dates are stored as `yyyy-MM-dd`. */
export interface Holiday extends AuditFields {
  id: number
  /** The tenant the record belongs to — set by the API from the active company. */
  companyId: number
  holidayName: string
  fromDate: string
  toDate: string
  /** `2026-27` — the accounting year the holiday is filed under. */
  accountingYear: string
}

/** A company the reminder banner names — it has no holidays for the year yet. */
export interface HolidayReminderCompany {
  companyId: number
  companyName: string
  companyCode: string
}

/**
 * The dashboard's "add next year's holidays" nudge. `upcoming` from 1 March
 * (one month before the year starts); `overdue` once the year has started and
 * some companies still have nothing in it.
 */
export interface HolidayReminder {
  show: boolean
  accountingYear: string
  startsOn: string
  endsOn: string
  status: 'upcoming' | 'overdue'
  daysUntilStart: number
  companies: HolidayReminderCompany[]
}
