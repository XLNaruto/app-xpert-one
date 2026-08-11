import type {
  AttendanceGroupEmployeesResponse,
  AttendanceGroupsResponse,
  AttendanceMonthResponse,
} from '../schemas'
import type {
  AttendanceDay,
  AttendanceEmployee,
  AttendanceGroup,
  AttendanceGroupEmployeesResult,
  AttendanceGroupsResult,
  AttendanceMonthResult,
  AttendancePunch,
  AttendanceTotals,
} from '../types'

/**
 * Wire → UI. Pure functions, no React.
 *
 * Every nullable string lands as `''` rather than `null`, so a component renders
 * a value or an em dash and never has to branch on two kinds of empty. The one
 * field kept nullable is `attendanceId` — `null` there means "no attendance row
 * exists", which is a different thing from a blank string.
 */

function toTotals(raw: AttendanceGroupsResponse['totals']): AttendanceTotals {
  return {
    total: raw.total,
    present: raw.present,
    absent: raw.absent,
    attendanceRate: raw.attendance_rate,
  }
}

function toGroup(raw: AttendanceGroupsResponse['items'][number]): AttendanceGroup {
  return { ...toTotals(raw), id: raw.id, name: raw.name, code: raw.code ?? '' }
}

function toEmployee(
  raw: AttendanceGroupEmployeesResponse['items'][number],
): AttendanceEmployee {
  return {
    employeeId: raw.employee_id,
    prefix: raw.prefix ?? '',
    name: raw.name ?? '',
    // The server composes prefix + name; fall back to the bare name so a row
    // without one still has something to label the avatar with.
    fullName: raw.employee_full_name ?? raw.name ?? '',
    code: raw.code ?? '',
    photo: raw.photo ?? '',
    status: raw.status,
    attendanceId: raw.attendance_id ?? null,
    dayStatus: raw.day_status ?? null,
    checkIn: raw.check_in ?? '',
    checkOut: raw.check_out ?? '',
    totalHour: raw.total_hour ?? '',
    checkInAt: raw.check_in_at ?? '',
    checkOutAt: raw.check_out_at ?? '',
  }
}

export function toAttendanceGroups(
  raw: AttendanceGroupsResponse,
): AttendanceGroupsResult {
  return {
    date: raw.date,
    today: raw.today,
    groupBy: raw.group_by,
    totals: toTotals(raw.totals),
    items: raw.items.map(toGroup),
    total: raw.total,
  }
}

export function toAttendanceGroupEmployees(
  raw: AttendanceGroupEmployeesResponse,
): AttendanceGroupEmployeesResult {
  return {
    date: raw.date,
    today: raw.today,
    groupBy: raw.group_by,
    group: toGroup(raw.group),
    totals: toTotals(raw.totals),
    items: raw.items.map(toEmployee),
    total: raw.total,
  }
}

function toPunch(
  raw: NonNullable<AttendanceMonthResponse['data']['list'][number]['log']>[number],
): AttendancePunch {
  return {
    id: raw.id,
    eventType: raw.event_type,
    eventTime: raw.event_time ?? '',
    time: raw.time ?? '',
    capturedImage: raw.captured_image ?? '',
    capturedImageUrl: raw.captured_image_url ?? '',
    latitude: raw.latitude ?? '',
    longitude: raw.longitude ?? '',
    locationAccuracy: raw.location_accuracy ?? '',
    device: raw.device ?? '',
  }
}

function toDay(raw: AttendanceMonthResponse['data']['list'][number]): AttendanceDay {
  return {
    date: raw.shift_date,
    status: raw.status,
    checkIn: raw.check_in ?? '',
    checkOut: raw.check_out ?? '',
    totalHour: raw.total_hour ?? '',
    totalDisplay: raw.total_time?.display ?? '',
    weeklyOff: raw.weekly_off ?? false,
    holidayName: raw.holiday_name ?? '',
    leaveType: raw.leave_type ?? '',
    punches: (raw.log ?? []).map(toPunch),
  }
}

export function toAttendanceMonth(raw: AttendanceMonthResponse): AttendanceMonthResult {
  const { data } = raw
  return {
    month: data.month,
    employeeId: data.employee_id,
    today: data.today ?? '',
    weeklyOff: data.weekly_off ?? '',
    days: data.list.map(toDay),
    counts: {
      present: data.counts.present,
      halfDay: data.counts.half_day,
      absent: data.counts.absent,
      leave: data.counts.leave,
      holiday: data.counts.holiday,
      weeklyOff: data.counts.weekly_off,
      future: data.counts.future,
      elapsed: data.counts.elapsed,
      working: data.counts.working,
    },
  }
}

/**
 * The month's days by `yyyy-MM-dd`, which is how the calendar looks a tile up.
 * A `Map` rather than a scan per tile: 42 tiles × 31 days is a lot of work to
 * repeat on every re-render of a screen that also re-renders on hover.
 */
export function indexDaysByDate(days: AttendanceDay[]): Map<string, AttendanceDay> {
  return new Map(days.map((day) => [day.date, day]))
}

/** Percent clamped to what a bar can actually draw. */
export function attendanceBarWidth(rate: number): string {
  return `${Math.min(100, Math.max(0, rate))}%`
}

/** A check-in and the check-out that closed it — one stretch of the day worked. */
export interface AttendanceSession {
  /** 1-based, in the order the day was worked. */
  index: number
  checkIn: AttendancePunch | null
  /** `null` while the session is still open — somebody checked in and hasn't left. */
  checkOut: AttendancePunch | null
}

/**
 * Punches → sessions, in the order the server sent them (chronological).
 *
 * A day is read as pairs, not as a flat log: two punches an hour apart are one
 * stretch of work, and showing them as two unrelated rows makes the reader do
 * the pairing themselves. Both halves of an unbalanced day survive — a check-in
 * with no check-out is an open session, and a check-out with nothing before it
 * (a session that began the previous day, or a missed punch) is a session of its
 * own rather than a dropped row.
 */
export function pairPunchSessions(punches: AttendancePunch[]): AttendanceSession[] {
  const sessions: AttendanceSession[] = []
  for (const punch of punches) {
    const open = sessions[sessions.length - 1]
    if (punch.eventType === 'check_in') {
      sessions.push({ index: sessions.length + 1, checkIn: punch, checkOut: null })
    } else if (open && !open.checkOut) {
      open.checkOut = punch
    } else {
      sessions.push({ index: sessions.length + 1, checkIn: null, checkOut: punch })
    }
  }
  return sessions
}

/**
 * A punch time as a person reads it — `"10:29:19"` → `"10:29:19 AM"`.
 *
 * The API sends clock times in 24-hour form, already bucketed in the company's
 * attendance timezone, so this is a re-spelling and never a conversion: parsing
 * to a `Date` would drag the browser's timezone in and shift the punch. Anything
 * that isn't `HH:mm[:ss]` (an em dash, a full timestamp, a value that already
 * carries a meridiem) is passed through untouched.
 *
 * Durations must NOT go through here — `00:00:36` of worked time is not 36
 * seconds past midnight.
 */
export function formatClockTime(value: string, withSeconds = true): string {
  const trimmed = value.trim()
  if (!trimmed || /[ap]\.?m\.?$/i.test(trimmed)) return trimmed
  const match = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed)
  if (!match) return trimmed
  const hour = Number(match[1])
  if (hour > 23) return trimmed
  const suffix = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 || 12
  const seconds = withSeconds && match[3] ? `:${match[3]}` : ''
  return `${hour12}:${match[2]}${seconds} ${suffix}`
}

/** Two-letter initials for the avatar fallback. */
export function attendanceInitials(name: string): string {
  return (
    name
      .replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '')
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—'
  )
}
