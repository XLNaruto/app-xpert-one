import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { activeCompanyId } from '@/lib/active-company'
import type { PageParams } from '@/lib/pagination'
import { SCHEDULE_MAX_LIMIT } from '../constants'
import {
  scheduleDayResponseSchema,
  scheduleEmployeeResponseSchema,
  scheduleGenerateResponseSchema,
  scheduleGridResponseSchema,
  type ScheduleDayPayload,
  type ScheduleGeneratePayload,
} from '../schemas'
import {
  toScheduleDay,
  toScheduleEmployeeRow,
  toScheduleGenerateResult,
  toScheduleGrid,
} from '../lib/shift-schedule-mappers'
import type {
  ScheduleDay,
  ScheduleDayInput,
  ScheduleEmployeeRow,
  ScheduleFilters,
  ScheduleGenerateInput,
  ScheduleGenerateResult,
  ScheduleGrid,
} from '../types'

/**
 * Off-Day Schedule — `/user/shift-schedules`. The grid is paged by EMPLOYEE
 * (`limit` 1–200), searched with `term` against name and code, and has no sort.
 * Reads and Generate carry `company_id` explicitly, so they take the session's
 * active company. Every window is `from`…`to` inclusive, at most 31 days; the
 * API's error `message`s are written for users and are what the screen shows.
 */

/** What `activeCompanyId` names in its error when no company is selected. */
const WHAT = 'the off-day schedule'

/** The branch / department scope, sent only when picked. */
function scopeParams({ branchId, departmentId }: Pick<ScheduleFilters, 'branchId' | 'departmentId'>) {
  return {
    ...(branchId !== null ? { branch_id: branchId } : {}),
    ...(departmentId !== null ? { department_id: departmentId } : {}),
  }
}

/** GET /user/shift-schedules — one page of employees with their entries over the window. */
export async function fetchShiftSchedules(
  filters: ScheduleFilters,
  params: PageParams,
): Promise<ScheduleGrid> {
  try {
    const raw = await http.get<unknown>(endpoints.SHIFT_SCHEDULES.LIST, {
      params: {
        company_id: activeCompanyId(WHAT),
        ...scopeParams(filters),
        from: filters.from,
        to: filters.to,
        ...(params.search?.trim() ? { term: params.search.trim() } : {}),
        // The table's "All" is a negative limit — the most the endpoint serves.
        limit: params.limit > 0 ? Math.min(params.limit, SCHEDULE_MAX_LIMIT) : SCHEDULE_MAX_LIMIT,
        offset: params.offset,
      },
    })
    return toScheduleGrid(scheduleGridResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the off-day schedule.")
  }
}

/** GET /user/shift-schedules/employees/:id — one employee's window. */
export async function fetchEmployeeSchedule(
  employeeId: number,
  from: string,
  to: string,
): Promise<ScheduleEmployeeRow> {
  try {
    const raw = await http.get<unknown>(endpoints.SHIFT_SCHEDULES.EMPLOYEE(employeeId), {
      params: { from, to },
    })
    return toScheduleEmployeeRow(scheduleEmployeeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the employee's schedule.")
  }
}

/**
 * POST /user/shift-schedules/generate — fill the window from each employee's
 * week-off policy. All-or-nothing, safe to repeat: POLICY entries are refreshed,
 * MANUAL ones never touched. `from` must be today or later.
 */
export async function generateShiftSchedule(
  input: ScheduleGenerateInput,
): Promise<ScheduleGenerateResult> {
  try {
    const raw = await http.post<unknown, ScheduleGeneratePayload>(
      endpoints.SHIFT_SCHEDULES.GENERATE,
      {
        company_id: activeCompanyId(WHAT),
        ...scopeParams(input),
        ...(input.employeeIds.length ? { employee_ids: input.employeeIds } : {}),
        from: input.from,
        to: input.to,
      },
    )
    return toScheduleGenerateResult(scheduleGenerateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't generate the schedule.")
  }
}

/**
 * PUT /user/shift-schedules/employees/:id/days/:date — set one date. Past dates
 * are allowed (a correction). The answer is always a MANUAL entry.
 */
export async function setScheduleDay({
  employeeId,
  date,
  isWeekOff,
  shiftId,
}: ScheduleDayInput): Promise<ScheduleDay> {
  try {
    const raw = await http.put<unknown, ScheduleDayPayload>(
      endpoints.SHIFT_SCHEDULES.DAY(employeeId, date),
      {
        is_week_off: isWeekOff,
        // Left out, the date keeps its shift — so `undefined` must not travel as `null`.
        ...(shiftId !== undefined ? { shift_id: shiftId } : {}),
      },
    )
    return toScheduleDay(scheduleDayResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the date.")
  }
}

/**
 * DELETE /user/shift-schedules/employees/:id/days/:date — hand the date back to
 * the week-off policy. A shift override on the date survives.
 */
export async function resetScheduleDay(employeeId: number, date: string): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.SHIFT_SCHEDULES.DAY(employeeId, date))
  } catch (error) {
    throw toApiError(error, "Couldn't reset the date.")
  }
}
