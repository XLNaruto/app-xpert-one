import type { ComboboxOption } from '@/components/ui/combobox'
import type { Shift } from '@/features/master/shift'
import type {
  RotationWeekPayload,
  ShiftRotationFormValues,
  ShiftRotationResponse,
  ShiftRotationUpdatePayload,
} from '../schemas'
import type { RotationWeek, ShiftRotation } from '../types'

/**
 * API record → the UI rotation. The weeks are sorted week 1 first: the API says it
 * returns them that way, but the cycle only reads correctly in order, so the
 * screens don't depend on that promise.
 */
export function toShiftRotation(response: ShiftRotationResponse): ShiftRotation {
  return {
    id: response.id,
    companyId: response.company_id,
    name: response.name,
    cycleLengthWeeks: response.cycle_length_weeks,
    status: response.status,
    weeks: response.weeks
      .map(
        (week): RotationWeek => ({
          id: week.id,
          weekNumber: week.week_number,
          shiftId: week.shift_id,
        }),
      )
      .sort((a, b) => a.weekNumber - b.weekNumber),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update.
 *
 * `weeks` always travels complete, and only for the weeks inside the current cycle
 * length: shortening a cycle leaves its extra rows on the form (so lengthening it
 * again doesn't lose the picks), but they must not reach the API, which refuses a
 * week number past the length.
 */
export function shiftRotationToPayload(
  values: ShiftRotationFormValues,
): ShiftRotationUpdatePayload {
  const length = Number(values.cycleLengthWeeks)

  const weeks: RotationWeekPayload[] = values.weeks
    .filter((week) => week.weekNumber <= length)
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((week) => ({ week_number: week.weekNumber, shift_id: Number(week.shiftId) }))

  return {
    name: values.name.trim(),
    cycle_length_weeks: length,
    status: values.status,
    weeks,
  }
}

/** Hydrate the edit form from a stored rotation. */
export function shiftRotationToFormValues(
  rotation: ShiftRotation,
): ShiftRotationFormValues {
  return {
    name: rotation.name,
    cycleLengthWeeks: String(rotation.cycleLengthWeeks),
    weeks: rotation.weeks.map((week) => ({
      weekNumber: week.weekNumber,
      shiftId: String(week.shiftId),
    })),
    status: rotation.status,
  }
}

/**
 * The cycle as one readable line — `W1 Morning → W2 Night` — for a list row and
 * for the employee tab, where the rotation is named rather than expanded.
 *
 * A shift the lookup can't resolve reads as its id rather than disappearing: an
 * unnamed week is still a week of the cycle.
 */
export function rotationSummary(
  rotation: ShiftRotation,
  shifts: Pick<Shift, 'id' | 'shiftName'>[],
): string {
  const byId = new Map(shifts.map((shift) => [shift.id, shift.shiftName]))
  if (rotation.weeks.length === 0) return 'No weeks'
  return rotation.weeks
    .map((week) => `W${week.weekNumber} ${byId.get(week.shiftId) ?? `#${week.shiftId}`}`)
    .join(' → ')
}

/**
 * Dropdown options for the pickers that put an employee on a rotation. The value
 * is the rotation's id; the label carries the cycle length, since two rotations
 * over the same shifts differ by exactly that.
 */
export function shiftRotationOptions(rotations: ShiftRotation[]): ComboboxOption[] {
  return rotations.map((rotation) => ({
    label: `${rotation.name} (${rotation.cycleLengthWeeks}-week cycle)`,
    value: String(rotation.id),
  }))
}
