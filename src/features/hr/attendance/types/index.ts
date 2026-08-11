/**
 * Attendance Management — the UI-facing record types.
 *
 * Two shapes, one per screen: a `AttendanceGroup` is a card on the landing
 * screen, and an `AttendanceEmployee` is a row behind one of those cards.
 */

/**
 * The level the cards sit at. The *server* decides it — a company with
 * departments is carded by department, one with none by designation — so the
 * screen renders whatever comes back rather than offering a switch.
 */
export type AttendanceGroupBy = 'department' | 'designation'

/** The Present / Absent pill above the employee list. */
export type AttendanceStatusFilter = 'all' | 'present' | 'absent'

/** Whether a person punched at all that day. Nothing more — see `AttendanceDayStatus`. */
export type AttendanceStatus = 'present' | 'absent'

/**
 * The day resolved against leave, holidays and weekly offs — which the group
 * read only carries when the server has one; `null` where it has nothing to say.
 */
export type AttendanceDayStatus =
  | 'present'
  | 'half_day'
  | 'absent'
  | 'leave'
  | 'holiday'
  | 'weekly_off'
  | 'future'

/** The three tiles: how a day counted, for a company or for one group. */
export interface AttendanceTotals {
  total: number
  present: number
  /**
   * Did not punch — and nothing more. Leave, holidays and weekly offs are three
   * registers this screen does not consult, so somebody on approved leave counts
   * as absent here.
   */
  absent: number
  /** Percent, as the bar draws it. */
  attendanceRate: number
}

/** One card: a department (or designation) and how its day counted. */
export interface AttendanceGroup extends AttendanceTotals {
  id: number
  name: string
  /** Department code — designations carry none. */
  code: string
}

/** One row behind a card. */
export interface AttendanceEmployee {
  employeeId: number
  /** Mr. / Mrs. / … — already folded into `fullName`, kept for the rare split use. */
  prefix: string
  name: string
  /** Prefix + name as the server composes it; falls back to `name`. */
  fullName: string
  code: string
  /** Object *key* of the photo, to be resolved with `mediaUrl()` — not a URL. */
  photo: string
  status: AttendanceStatus
  attendanceId: number | null
  dayStatus: AttendanceDayStatus | null
  /** Clock time in the server's attendance timezone; `''` means nothing on record. */
  checkIn: string
  checkOut: string
  /**
   * The stored rollup, so it counts CLOSED sessions only and reads low while
   * somebody is still checked in. `''` when there is nothing on record.
   */
  totalHour: string
  /** Full timestamps behind the clock times, when the server has them. */
  checkInAt: string
  checkOutAt: string
}

/** One punch under a day — what actually produced the rollup. */
export interface AttendancePunch {
  id: number
  eventType: 'check_in' | 'check_out'
  /** Full timestamp in the server's attendance timezone. */
  eventTime: string
  /** The clock time as the server formats it for display. */
  time: string
  /** Object key of the captured face image. */
  capturedImage: string
  /** The ready-made URL the API sends alongside the key, when it has one. */
  capturedImageUrl: string
  latitude: string
  longitude: string
  locationAccuracy: string
  device: string
}

/** One day of the month grid — every day is present, worked or not. */
export interface AttendanceDay {
  /** `yyyy-MM-dd`. */
  date: string
  /**
   * The resolved day. Branch the badge on this and never on an empty
   * `checkIn`: a blank day may be a weekly off, a holiday or an approved leave,
   * and only the server holds all three registers.
   */
  status: AttendanceDayStatus
  /** `''` when there is nothing on record. Clock times, server timezone. */
  checkIn: string
  checkOut: string
  totalHour: string
  /** `HH:MM` of worked time, pre-split — `''` on a day with nothing on it. */
  totalDisplay: string
  weeklyOff: boolean
  holidayName: string
  leaveType: string
  punches: AttendancePunch[]
}

/** How the month counted, day by day. */
export interface AttendanceMonthCounts {
  present: number
  halfDay: number
  absent: number
  leave: number
  holiday: number
  weeklyOff: number
  future: number
  /** Days of the month already behind us. */
  elapsed: number
  /** Days that were meant to be worked. */
  working: number
}

/** `GET /user/attendance/employee-detail` — one employee's month. */
export interface AttendanceMonthResult {
  /** `yyyy-MM`. */
  month: string
  employeeId: number
  /** The day the server is in. */
  today: string
  /** The weekly-off pattern in words, as the company configured it. */
  weeklyOff: string
  days: AttendanceDay[]
  counts: AttendanceMonthCounts
}

/** `GET /user/attendance/groups` — the landing screen in one answer. */
export interface AttendanceGroupsResult {
  /** The day reported on. */
  date: string
  /** The day the *server* is in — what "today" means for this company. */
  today: string
  groupBy: AttendanceGroupBy
  /**
   * The COMPANY's day. Unmoved by the search box: the tiles count every employee
   * of the company while a card only holds the ones posted to it, so the cards
   * sum to at most `totals.total` and the gap is exactly the employees with no
   * posting at that level.
   */
  totals: AttendanceTotals
  items: AttendanceGroup[]
  /** Cards matching the search across every page — drives the pager. */
  total: number
}

/** `GET /user/attendance/groups/employees` — one card opened. */
export interface AttendanceGroupEmployeesResult {
  date: string
  today: string
  groupBy: AttendanceGroupBy
  /** The card's own header — the whole group's day, whatever pill is active. */
  group: AttendanceGroup
  /** The group's day again, unfiltered — so the Absent pill still shows present. */
  totals: AttendanceTotals
  items: AttendanceEmployee[]
  /** Rows on the *filtered* side, across every page. */
  total: number
}
