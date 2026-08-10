import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  ShiftFormValues,
  ShiftResponse,
  ShiftUpdatePayload,
} from '../schemas'
import type { Shift } from '../types'

/** `09:00:00` → `09:00` — the API stores seconds, the form doesn't want them. */
function toHhMm(time: string): string {
  return time.slice(0, 5)
}

/**
 * API record → the UI shift. The audit trail only comes back on the list rows;
 * on a single-record response it's absent and renders as a dash.
 */
export function toShift(response: ShiftResponse): Shift {
  return {
    id: response.id,
    companyId: response.company_id,
    shiftName: response.name,
    startTime: toHhMm(response.start_time),
    endTime: toHhMm(response.end_time),
    isNightShift: response.is_night_shift,
    breakMinutes: response.break_minutes,
    concessionMinutes: response.concession_minutes,
    earlyExitGraceMinutes: response.early_exit_grace_minutes,
    minFullDayHours: response.min_full_day_hours,
    minHalfDayHours: response.min_half_day_hours,
    weekoffPolicyId: response.weekoff_policy_id ?? null,
    status: response.status,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 *
 * A blank tolerance field is left out rather than sent as a zero: on create the
 * API applies its own default, and on edit an omitted key leaves the stored
 * value untouched. The form is always hydrated from the record in edit mode, so
 * a field is only ever blank on a fresh create.
 */
export function shiftToPayload(values: ShiftFormValues): ShiftUpdatePayload {
  /** `{ key: n }` when the field holds something, nothing at all when it's blank. */
  const sent = <K extends string>(key: K, value: string) =>
    value.trim() ? ({ [key]: Number(value) } as Record<K, number>) : undefined

  return {
    name: values.shiftName.trim(),
    start_time: values.startTime,
    end_time: values.endTime,
    ...sent('break_minutes', values.breakMinutes),
    ...sent('concession_minutes', values.concessionMinutes),
    // Not on the form any more — every shift is saved with no end-of-shift grace.
    early_exit_grace_minutes: 0,
    ...sent('min_full_day_hours', values.minFullDayHours),
    ...sent('min_half_day_hours', values.minHalfDayHours),
    // Always sent, unlike the tolerances: clearing the picker means "follow the
    // default pattern", which only takes effect if the null overwrites the old id.
    weekoff_policy_id: values.weekoffPolicyId ? Number(values.weekoffPolicyId) : null,
    status: values.status,
  }
}

/** Hydrate the edit form from a stored shift. */
export function shiftToFormValues(shift: Shift): ShiftFormValues {
  return {
    shiftName: shift.shiftName,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakMinutes: String(shift.breakMinutes),
    concessionMinutes: String(shift.concessionMinutes),
    minFullDayHours: String(shift.minFullDayHours),
    minHalfDayHours: String(shift.minHalfDayHours),
    weekoffPolicyId: shift.weekoffPolicyId ? String(shift.weekoffPolicyId) : '',
    status: shift.status,
  }
}

/** `HH:MM` → minutes past midnight, or `null` when the string isn't a time yet. */
function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const mins = Number(match[2])
  if (hours > 23 || mins > 59) return null
  return hours * 60 + mins
}

/**
 * Paid hours in the shift window: end − start, minus the unpaid break, rounded
 * to the nearest half hour so it lands on the form's 0.5 step.
 *
 * An end at or before the start crosses midnight, so a day is added — the same
 * rule the API uses to derive `is_night_shift`. Returns `null` while either time
 * is blank or half-typed, and when the break swallows the whole window.
 */
export function shiftPaidHours(
  startTime: string,
  endTime: string,
  breakMinutes: string,
): number | null {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (start === null || end === null) return null

  const span = end > start ? end - start : end + 1440 - start
  const paid = span - (Number(breakMinutes.trim()) || 0)
  if (paid <= 0) return null

  return Math.round(paid / 30) / 2
}

/** `09:00` → `09:00 AM` — how a time reads on a list row. */
export function formatTime(time: string): string {
  const [hh, mm] = time.split(':')
  const hour = Number(hh)
  if (!Number.isFinite(hour)) return time
  const suffix = hour < 12 ? 'AM' : 'PM'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${String(twelve).padStart(2, '0')}:${mm} ${suffix}`
}

/** `09:00 AM – 06:00 PM` — the window as one readable cell. */
export function formatShiftWindow(shift: Shift): string {
  return `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`
}

/**
 * Dropdown options for the pickers that assign a shift to something. The value
 * is the shift's **id** — that's what `set-default` expects — while the label
 * carries its window, since two shifts often differ only by their hours.
 */
export function shiftOptions(shifts: Shift[]): ComboboxOption[] {
  return shifts.map((shift) => ({
    label: `${shift.shiftName} (${formatShiftWindow(shift)})`,
    value: String(shift.id),
  }))
}
