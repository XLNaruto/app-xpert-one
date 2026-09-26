/**
 * Where a schedule entry came from. `POLICY` was laid down by Generate and a
 * later Generate refreshes it; `MANUAL` was set by a person and Generate never
 * touches it again.
 */
export type ScheduleSourceType = 'POLICY' | 'MANUAL'

/**
 * One scheduled date. Only dates with an entry exist — a date missing from an
 * employee's `days` is "not scheduled", and the week-off policy decides it.
 */
export interface ScheduleDay {
  id: number
  /** `YYYY-MM-DD`. */
  workDate: string
  /**
   * `true` scheduled OFF, `false` scheduled WORKING, `null` the entry only
   * overrides the shift and leaves off / working to the policy.
   */
  isWeekOff: boolean | null
  /** A shift override for the date; `null` means the employee's normal shift. */
  shiftId: number | null
  shiftName: string
  sourceType: ScheduleSourceType
}

/** One employee's row of the grid — never split across pages. */
export interface ScheduleEmployeeRow {
  employeeId: number
  employeeServiceId: number
  employeeName: string
  employeeCode: string
  branchId: number | null
  departmentId: number | null
  days: ScheduleDay[]
}

/** The grid read: one page of employees over the window it was read for. */
export interface ScheduleGrid {
  from: string
  to: string
  items: ScheduleEmployeeRow[]
  total: number
}

/** What the grid is read for, besides the page and the search term. */
export interface ScheduleFilters {
  branchId: number | null
  departmentId: number | null
  /** `YYYY-MM-DD`, inclusive. */
  from: string
  /** `YYYY-MM-DD`, inclusive — at most 31 days after `from`. */
  to: string
}

/** What Generate is asked to fill. */
export interface ScheduleGenerateInput extends ScheduleFilters {
  /** Regenerate only these people; empty means everyone the filters match. */
  employeeIds: number[]
}

/** What Generate did. */
export interface ScheduleGenerateResult {
  from: string
  to: string
  /** Employees the filters matched. */
  employees: number
  /** Dates written or refreshed. */
  written: number
  /** Dates skipped because a person had set them. */
  keptManual: number
  /** Employees with no shift on some date — nothing to generate from. */
  skippedNoShift: number[]
  /** Employees on a FLEXIBLE week-off policy — a manager picks their days. */
  skippedFlexible: number[]
}

/**
 * Set one date. `shiftId` left `undefined` keeps whatever shift the date has, a
 * number overrides it, `null` removes the override.
 */
export interface ScheduleDayInput {
  employeeId: number
  date: string
  isWeekOff: boolean
  shiftId?: number | null
}
