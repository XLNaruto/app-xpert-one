import { toShift } from '@/features/master/shift'
import { toFormDate, toRequiredApiDate } from './employee-dates'
import type {
  EmployeeRosterEntryResponse,
  EmployeeRosterFormValues,
  EmployeeRosterPayload,
  EmployeeShiftAssignmentFormValues,
  EmployeeShiftAssignmentPayload,
  EmployeeShiftAssignmentResponse,
  EmployeeShiftOnDayResponse,
} from '../schemas'
import type {
  EmployeeRosterEntry,
  EmployeeShiftAssignment,
  EmployeeShiftOnDay,
  RosterSourceType,
  ShiftSource,
} from '../types'

/** Step 9 mappers — the assignment timeline, the roster and the resolved answer. */

/** The links of the precedence chain, in the order the server walks them. */
const SHIFT_SOURCES: ShiftSource[] = [
  'roster',
  'rotation',
  'assignment',
  'department',
  'company',
]

const ROSTER_SOURCES: RosterSourceType[] = ['MANUAL', 'ROTATION', 'POLICY']

/** API record → one entry of the assignment timeline. */
export function toEmployeeShiftAssignment(
  response: EmployeeShiftAssignmentResponse,
): EmployeeShiftAssignment {
  return {
    id: response.id,
    employeeId: response.employee_id,
    employeeServiceId: response.employee_service_id,
    shiftId: response.shift_id ?? null,
    shiftName: response.shift_name ?? '',
    rotationId: response.rotation_id ?? null,
    rotationName: response.rotation_name ?? '',
    effectiveDate: toFormDate(response.effective_date),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * API record → one roster override. An unrecognised `source_type` reads as
 * `MANUAL`: the row exists either way, and manual is the only value the portal
 * writes.
 */
export function toEmployeeRosterEntry(
  response: EmployeeRosterEntryResponse,
): EmployeeRosterEntry {
  const source = response.source_type as RosterSourceType
  return {
    id: response.id,
    employeeId: response.employee_id,
    employeeServiceId: response.employee_service_id,
    workDate: toFormDate(response.work_date),
    shiftId: response.shift_id,
    shiftName: response.shift_name ?? '',
    sourceType: ROSTER_SOURCES.includes(source) ? source : 'MANUAL',
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * API record → the shift resolved for one date. The nested shift goes through the
 * shift master's own mapper, so a shift reads identically here and on its master
 * screen.
 */
export function toEmployeeShiftOnDay(
  response: EmployeeShiftOnDayResponse,
): EmployeeShiftOnDay {
  const source = response.source as ShiftSource | null | undefined
  return {
    day: toFormDate(response.day),
    shift: response.shift ? toShift(response.shift) : null,
    source: source && SHIFT_SOURCES.includes(source) ? source : null,
    isWeekOff: response.is_week_off,
  }
}

/**
 * Validated form values → the assignment body.
 *
 * The `default` mode sends both ids as `null`, which is the API's own way of
 * saying "back to the department or company default from this date". That's why
 * the keys travel as explicit nulls instead of being left out.
 */
export function employeeShiftAssignmentToPayload(
  values: EmployeeShiftAssignmentFormValues,
): EmployeeShiftAssignmentPayload {
  return {
    shift_id: values.mode === 'shift' && values.shiftId ? Number(values.shiftId) : null,
    rotation_id:
      values.mode === 'rotation' && values.rotationId ? Number(values.rotationId) : null,
    effective_date: toRequiredApiDate(values.effectiveDate),
  }
}

/** Validated form values → the roster body. */
export function employeeRosterToPayload(
  values: EmployeeRosterFormValues,
): EmployeeRosterPayload {
  return {
    work_date: toRequiredApiDate(values.workDate),
    shift_id: Number(values.shiftId),
  }
}

/**
 * What one timeline entry says, in words. An entry naming neither a shift nor a
 * rotation is not blank — it ends the previous assignment — so it gets a phrase of
 * its own rather than a dash.
 */
export function assignmentLabel(entry: EmployeeShiftAssignment): string {
  if (entry.rotationId !== null) return entry.rotationName || `Rotation #${entry.rotationId}`
  if (entry.shiftId !== null) return entry.shiftName || `Shift #${entry.shiftId}`
  return 'Back to department / company default'
}

/** How each link of the chain reads on screen, and what it means for the user. */
export const SHIFT_SOURCE_LABELS: Record<ShiftSource, string> = {
  roster: 'Rostered for this date',
  rotation: 'From the rotation cycle',
  assignment: 'From the assignment timeline',
  department: "The department's default",
  company: "The company's default",
}
