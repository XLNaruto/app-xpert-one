import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { activeCompanyId } from '@/lib/active-company'
import type { PageParams } from '@/lib/pagination'
import { ATTENDANCE_MAX_LIMIT, ATTENDANCE_SEARCH_MAX_LENGTH } from '../constants'
import {
  attendanceGroupEmployeesResponseSchema,
  attendanceGroupsResponseSchema,
  attendanceMonthResponseSchema,
} from '../schemas'
import {
  toAttendanceGroupEmployees,
  toAttendanceGroups,
  toAttendanceMonth,
} from '../lib/attendance-mappers'
import type {
  AttendanceGroupBy,
  AttendanceGroupEmployeesResult,
  AttendanceGroupsResult,
  AttendanceMonthResult,
  AttendanceStatusFilter,
} from '../types'

/**
 * `/user/attendance/groups` and `/user/attendance/groups/employees` — the two
 * reads Attendance Management is made of.
 *
 * Both are scoped by `company_id` and both take the day as an optional
 * `yyyy-MM-dd`. An omitted date is deliberate rather than lazy: the business day
 * is bucketed in the server's attendance timezone, so a client that computed
 * "today" itself would ask for the wrong day either side of midnight. The
 * response echoes the day it answered on, which is what the header prints.
 */

/** Clamp a page to what the endpoints accept — both cap `limit` at 100. */
function pageParams({ limit, offset }: PageParams) {
  return {
    limit: limit < 0 ? ATTENDANCE_MAX_LIMIT : Math.min(limit, ATTENDANCE_MAX_LIMIT),
    offset,
  }
}

/** The endpoints 400 past 100 characters, so trim rather than let them. */
function term(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, ATTENDANCE_SEARCH_MAX_LENGTH) : undefined
}

/**
 * GET /user/attendance/groups — the company tiles plus one page of cards.
 *
 * `search` matches the GROUP name (and a department code), never an employee:
 * this is the department picker. It narrows `items` and `total` only — `totals`
 * is the company's day and must not move while somebody types.
 */
export async function fetchAttendanceGroups(
  params: PageParams,
  date?: string,
): Promise<AttendanceGroupsResult> {
  try {
    const search = term(params.search)
    const raw = await http.get<unknown>(endpoints.ATTENDANCE.GROUPS, {
      params: {
        company_id: activeCompanyId('attendance'),
        ...pageParams(params),
        ...(date ? { date } : {}),
        ...(search ? { search } : {}),
      },
    })
    return toAttendanceGroups(attendanceGroupsResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the attendance summary.")
  }
}

export interface AttendanceEmployeeFilters {
  /** The level the card came from — decides which id parameter goes up. */
  groupBy: AttendanceGroupBy
  groupId: number
  date?: string
  status?: AttendanceStatusFilter
}

/**
 * GET /user/attendance/groups/employees — one card opened.
 *
 * Exactly one of `department_id` / `designation_id` is sent, picked by the
 * `group_by` the card list answered with: sending both, neither, or the wrong
 * one for this company is a 400/404 rather than a quietly-preferred reading.
 * `params.search` becomes `term`, which matches the employee's name and code.
 */
export async function fetchAttendanceGroupEmployees(
  params: PageParams,
  filters: AttendanceEmployeeFilters,
): Promise<AttendanceGroupEmployeesResult> {
  try {
    const search = term(params.search)
    const raw = await http.get<unknown>(endpoints.ATTENDANCE.GROUP_EMPLOYEES, {
      params: {
        company_id: activeCompanyId('attendance'),
        ...(filters.groupBy === 'department'
          ? { department_id: filters.groupId }
          : { designation_id: filters.groupId }),
        ...pageParams(params),
        ...(filters.date ? { date: filters.date } : {}),
        ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
        ...(search ? { term: search } : {}),
      },
    })
    return toAttendanceGroupEmployees(
      attendanceGroupEmployeesResponseSchema.parse(raw),
    )
  } catch (error) {
    throw toApiError(error, "Couldn't load the group's attendance.")
  }
}

/**
 * GET /user/attendance/employee-detail — one employee's month grid.
 *
 * `year` and `month` go up as separate numbers, which the API joins into the one
 * `YYYY-MM` every month read takes — so a figure here can never disagree with
 * the one on the employee record.
 */
export async function fetchAttendanceMonth(
  employeeId: number,
  /** `yyyy-MM`. */
  month: string,
): Promise<AttendanceMonthResult> {
  const [year, monthNumber] = month.split('-').map(Number)
  try {
    const raw = await http.get<unknown>(endpoints.ATTENDANCE.EMPLOYEE_DETAIL, {
      params: {
        company_id: activeCompanyId('attendance'),
        employee_id: employeeId,
        year,
        month: monthNumber,
      },
    })
    return toAttendanceMonth(attendanceMonthResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the employee's attendance.")
  }
}
