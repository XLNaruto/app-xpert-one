import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams, Paginated } from '@/lib/pagination'
import {
  employeeRosterEntryResponseSchema,
  employeeRosterResponseSchema,
  employeeShiftAssignmentResponseSchema,
  employeeShiftAssignmentsResponseSchema,
  employeeShiftOnDayResponseSchema,
} from '../schemas'
import {
  employeeRosterToPayload,
  employeeShiftAssignmentToPayload,
  toEmployeeRosterEntry,
  toEmployeeShiftAssignment,
  toEmployeeShiftOnDay,
} from '../lib/employee-shift-mappers'
import type {
  EmployeeRosterFormValues,
  EmployeeRosterPayload,
  EmployeeShiftAssignmentFormValues,
  EmployeeShiftAssignmentPayload,
} from '../schemas'
import type {
  EmployeeRosterEntry,
  EmployeeShiftAssignment,
  EmployeeShiftOnDay,
} from '../types'

/**
 * Step 9 — which shift an employee works, on `/user/employees/:id/…`.
 *
 * Three resources, in order of authority:
 *
 * - `roster` — a per-date override, the most specific statement anybody can make.
 * - `shifts` — the assignment timeline, effective-dated and append-only.
 * - `shift` — not a resource but a QUESTION: the server walks the whole chain
 *   (roster → rotation → assignment → department → company) for one date and
 *   reports which link answered.
 *
 * Nothing here needs a `company_id`: the employee id already fixes the tenant.
 */

/** The API's maximum `limit` on the roster window. */
const MAX_ROSTER_LIMIT = 200

/**
 * GET /user/employees/:id/shift — the shift resolved for one date, with the link
 * of the chain that answered it. `date` omitted answers for the server's current
 * business day.
 */
export async function fetchEmployeeShiftOnDay(
  employeeId: number,
  date?: string,
): Promise<EmployeeShiftOnDay> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.SHIFT_ON_DAY(employeeId), {
      params: date ? { date } : undefined,
    })
    return toEmployeeShiftOnDay(employeeShiftOnDayResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't work out this employee's shift for that date.")
  }
}

/**
 * GET /user/employees/:id/shifts — the whole assignment timeline, newest first and
 * unpaginated (a career collects a handful of entries).
 *
 * An EMPTY list is the ordinary, healthy state: it means the employee is on their
 * department's or company's default shift, which is what most people are on.
 */
export async function fetchEmployeeShiftAssignments(
  employeeId: number,
): Promise<Paginated<EmployeeShiftAssignment>> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.SHIFTS(employeeId))
    const { items, total } = employeeShiftAssignmentsResponseSchema.parse(raw)
    return { items: items.map(toEmployeeShiftAssignment), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load the shift assignment timeline.")
  }
}

/**
 * POST /user/employees/:id/shifts — assign a shift or a rotation from a date, or
 * (naming neither) end the current assignment and hand the employee back to the
 * department or company default.
 *
 * For a rotation the `effective_date` is also the cycle's anchor: week 1 starts
 * there, which is why two employees assigned a week apart are out of phase.
 */
export async function createEmployeeShiftAssignment(
  employeeId: number,
  values: EmployeeShiftAssignmentFormValues,
): Promise<EmployeeShiftAssignment> {
  try {
    const raw = await http.post<unknown, EmployeeShiftAssignmentPayload>(
      endpoints.EMPLOYEES.SHIFTS(employeeId),
      employeeShiftAssignmentToPayload(values),
    )
    return toEmployeeShiftAssignment(employeeShiftAssignmentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the shift assignment.")
  }
}

/**
 * DELETE /user/employees/:id/shifts/:entryId — remove an entry typed by mistake.
 *
 * NOT the way to end an assignment: post an entry naming neither a shift nor a
 * rotation for that. Deleting rewrites history — days already stamped against the
 * removed shift would re-resolve differently the next time the timeline was walked.
 */
export async function deleteEmployeeShiftAssignment(
  employeeId: number,
  entryId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.SHIFT_ENTRY(employeeId, entryId))
  } catch (error) {
    throw toApiError(error, "Couldn't remove the timeline entry.")
  }
}

/**
 * GET /user/employees/:id/roster — the per-date overrides inside a window.
 *
 * Only the dates somebody explicitly overrode are rows: the ordinary days aren't
 * stored anywhere, they resolve from the rotation, the assignment or a default.
 *
 * The tab reads a month at a time and takes the whole window in one request rather
 * than paging it. That's safe here and nowhere else: a date can hold at most one
 * override (re-rostering replaces it), so a month can't exceed 31 rows — well under
 * the endpoint's own 200 ceiling. `params` is honoured for a caller that wants a
 * wider window than a month.
 */
export async function fetchEmployeeRoster(
  employeeId: number,
  from: string,
  to: string,
  params?: PageParams,
): Promise<Paginated<EmployeeRosterEntry>> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.ROSTER(employeeId), {
      params: {
        from,
        to,
        limit:
          params?.limit && params.limit > 0
            ? Math.min(params.limit, MAX_ROSTER_LIMIT)
            : MAX_ROSTER_LIMIT,
        offset: params?.offset ?? 0,
      },
    })
    const { items, total } = employeeRosterResponseSchema.parse(raw)
    return { items: items.map(toEmployeeRosterEntry), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load the roster.")
  }
}

/**
 * POST /user/employees/:id/roster — override the shift for one date.
 *
 * Re-rostering the same date REPLACES its entry rather than raising a conflict: a
 * manager changing their mind about tomorrow is an ordinary correction.
 */
export async function createEmployeeRosterEntry(
  employeeId: number,
  values: EmployeeRosterFormValues,
): Promise<EmployeeRosterEntry> {
  try {
    const raw = await http.post<unknown, EmployeeRosterPayload>(
      endpoints.EMPLOYEES.ROSTER(employeeId),
      employeeRosterToPayload(values),
    )
    return toEmployeeRosterEntry(employeeRosterEntryResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't override the shift for that date.")
  }
}

/**
 * DELETE /user/employees/:id/roster/:entryId — drop a date override.
 *
 * Unlike a timeline entry this IS the right way to undo one: a roster row says
 * nothing about history, it only outranks the rotation and the defaults for its one
 * date, and removing it hands that date straight back to them.
 */
export async function deleteEmployeeRosterEntry(
  employeeId: number,
  entryId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.ROSTER_ENTRY(employeeId, entryId))
  } catch (error) {
    throw toApiError(error, "Couldn't drop the date override.")
  }
}
