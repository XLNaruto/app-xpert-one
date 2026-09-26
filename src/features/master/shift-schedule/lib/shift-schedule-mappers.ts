import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { SCHEDULE_MAX_DAYS } from '../constants'
import type {
  ScheduleDayResponse,
  ScheduleEmployeeResponse,
  ScheduleGenerateResponse,
  ScheduleGridResponse,
} from '../schemas'
import type {
  ScheduleDay,
  ScheduleEmployeeRow,
  ScheduleGenerateResult,
  ScheduleGrid,
  ScheduleSourceType,
} from '../types'

const ISO = 'yyyy-MM-dd'

/* ── API → UI ─────────────────────────────────────────────────────────────── */

export function toScheduleDay(response: ScheduleDayResponse): ScheduleDay {
  return {
    id: response.id,
    workDate: response.work_date.slice(0, 10),
    isWeekOff: response.is_week_off ?? null,
    shiftId: response.shift_id ?? null,
    shiftName: response.shift_name ?? '',
    sourceType: (response.source_type === 'POLICY' ? 'POLICY' : 'MANUAL') as ScheduleSourceType,
  }
}

export function toScheduleEmployeeRow(
  response: ScheduleEmployeeResponse,
): ScheduleEmployeeRow {
  return {
    employeeId: response.employee_id,
    employeeServiceId: response.employee_service_id,
    employeeName: response.employee_name ?? '',
    employeeCode: response.employee_code ?? '',
    branchId: response.branch_id ?? null,
    departmentId: response.department_id ?? null,
    days: response.days.map(toScheduleDay),
  }
}

export function toScheduleGrid(response: ScheduleGridResponse): ScheduleGrid {
  return {
    from: response.from,
    to: response.to,
    total: response.total,
    items: response.items.map(toScheduleEmployeeRow),
  }
}

export function toScheduleGenerateResult(
  response: ScheduleGenerateResponse,
): ScheduleGenerateResult {
  return {
    from: response.from,
    to: response.to,
    employees: response.employees,
    written: response.written,
    keptManual: response.kept_manual,
    skippedNoShift: response.skipped_no_shift ?? [],
    skippedFlexible: response.skipped_flexible ?? [],
  }
}

/* ── The window ───────────────────────────────────────────────────────────── */

/** Today in the browser, `YYYY-MM-DD`. */
export function todayIso(): string {
  return format(new Date(), ISO)
}

/** A `yyyy-MM` month as its first and last day — never more than 31 days. */
export function monthWindow(month: string): { from: string; to: string } {
  const start = parseISO(`${month}-01`)
  return { from: format(startOfMonth(start), ISO), to: format(endOfMonth(start), ISO) }
}

/** The last `to` a window starting on `from` may reach. */
export function maxWindowEnd(from: string): string {
  return format(addDays(parseISO(from), SCHEDULE_MAX_DAYS - 1), ISO)
}

/** Whether `from`…`to` is a window the API accepts: ordered, and ≤ 31 days. */
export function isValidWindow(from: string, to: string): boolean {
  const start = parseISO(from)
  const end = parseISO(to)
  if (!isValid(start) || !isValid(end)) return false
  const span = differenceInCalendarDays(end, start)
  return span >= 0 && span < SCHEDULE_MAX_DAYS
}

/** One column per date of the window — the grid builds its own, `days` is sparse. */
export function windowDates(from: string, to: string): string[] {
  if (!isValidWindow(from, to)) return []
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((day) =>
    format(day, ISO),
  )
}

/** `dd` and the weekday — the two lines of a date column's header. */
export function dateHeading(date: string): { day: string; weekday: string; weekend: boolean } {
  const value = parseISO(date)
  const weekday = value.getDay()
  return {
    day: format(value, 'dd'),
    weekday: format(value, 'EEE'),
    weekend: weekday === 0 || weekday === 6,
  }
}

/** An employee's entries keyed by date, for the per-cell lookup. */
export function daysByDate(days: ScheduleDay[]): Map<string, ScheduleDay> {
  return new Map(days.map((day) => [day.workDate, day]))
}

/* ── Local cache patches ──────────────────────────────────────────────────── */

/** The grid with one employee's date replaced by what PUT returned. */
export function withScheduleDay(
  grid: ScheduleGrid,
  employeeId: number,
  day: ScheduleDay,
): ScheduleGrid {
  return {
    ...grid,
    items: grid.items.map((row) =>
      row.employeeId !== employeeId
        ? row
        : {
            ...row,
            days: [...row.days.filter((d) => d.workDate !== day.workDate), day].sort(
              (a, b) => a.workDate.localeCompare(b.workDate),
            ),
          },
    ),
  }
}

/**
 * The grid after DELETE handed one date back to the policy. A shift override on
 * the same date survives the delete, so that entry stays with its off / working
 * decision cleared; an entry with no override goes altogether.
 */
export function withoutScheduleDecision(
  grid: ScheduleGrid,
  employeeId: number,
  date: string,
): ScheduleGrid {
  return {
    ...grid,
    items: grid.items.map((row) =>
      row.employeeId !== employeeId
        ? row
        : {
            ...row,
            days: row.days.flatMap((d) => {
              if (d.workDate !== date) return [d]
              return d.shiftId !== null ? [{ ...d, isWeekOff: null }] : []
            }),
          },
    ),
  }
}
