import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  ShiftFormValues,
  ShiftResponse,
  ShiftUpdatePayload,
  ShiftVersionResponse,
} from '../schemas'
import type { Shift, ShiftVersion } from '../types'

/** `2026-09-01T00:00:00Z` → `2026-09-01` — the form and the API both want the day. */
function toIsoDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

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
    isLateBreakPenaltyApplicable: response.is_late_break_penalty_applicable,
    concessionMinutes: response.concession_minutes,
    isLateCheckInPenaltyApplicable: response.is_late_check_in_penalty_applicable,
    lateCheckInPenaltyType: response.late_check_in_penalty_type ?? null,
    lateCheckInPenaltyValue: response.late_check_in_penalty_value ?? null,
    earlyExitGraceMinutes: response.early_exit_grace_minutes,
    minFullDayHours: response.min_full_day_hours,
    minHalfDayHours: response.min_half_day_hours,
    weekoffPolicyId: response.weekoff_policy_id ?? null,
    status: response.status,
    versionId: response.version_id ?? null,
    effectiveDate: toIsoDate(response.effective_date),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/** API record → one dated version of a shift's rules. */
export function toShiftVersion(response: ShiftVersionResponse): ShiftVersion {
  return {
    id: response.id,
    shiftId: response.shift_id,
    effectiveDate: toIsoDate(response.effective_date),
    startTime: toHhMm(response.start_time),
    endTime: toHhMm(response.end_time),
    isNightShift: response.is_night_shift,
    breakMinutes: response.break_minutes,
    isLateBreakPenaltyApplicable: response.is_late_break_penalty_applicable,
    concessionMinutes: response.concession_minutes,
    isLateCheckInPenaltyApplicable: response.is_late_check_in_penalty_applicable,
    lateCheckInPenaltyType: response.late_check_in_penalty_type ?? null,
    lateCheckInPenaltyValue: response.late_check_in_penalty_value ?? null,
    earlyExitGraceMinutes: response.early_exit_grace_minutes,
    minFullDayHours: response.min_full_day_hours,
    minHalfDayHours: response.min_half_day_hours,
    weekoffPolicyId: response.weekoff_policy_id ?? null,
    isCurrent: response.is_current,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/** The versioned rules — the fields an edit has to date. Name and status aren't. */
const VERSIONED_FIELDS = [
  'effectiveDate',
  'startTime',
  'endTime',
  'breakMinutes',
  'isLateBreakPenaltyApplicable',
  'concessionMinutes',
  'isLateCheckInPenaltyApplicable',
  'lateCheckInPenaltyType',
  'lateCheckInPenaltyValue',
  'minFullDayHours',
  'minHalfDayHours',
  'weekoffPolicyId',
] as const satisfies readonly (keyof ShiftFormValues)[]

/**
 * Did this edit touch anything that lives on a dated version?
 *
 * Only `name` and `status` don't — they apply at once — so an edit that moved
 * neither must NOT carry `effective_date`, or renaming a shift would open a
 * pointless version on today's date.
 */
export function touchesVersionedRules(
  dirtyFields: Partial<Record<keyof ShiftFormValues, unknown>>,
): boolean {
  return VERSIONED_FIELDS.some((field) => Boolean(dirtyFields[field]))
}

/**
 * Validated form values → the request body shared by create and update, minus the
 * date. The create call adds `company_id` and a REQUIRED `effective_date` on top;
 * an edit can't move a record between tenants and dates its body conditionally, so
 * the shared part stops here.
 *
 * A blank tolerance field is left out rather than sent as a zero: on create the
 * API applies its own default, and on edit an omitted key leaves the stored
 * value untouched. The form is always hydrated from the record in edit mode, so
 * a field is only ever blank on a fresh create.
 */
export function shiftToPayload(
  values: ShiftFormValues,
): Omit<ShiftUpdatePayload, 'effective_date'> {
  /** `{ key: n }` when the field holds something, nothing at all when it's blank. */
  const sent = <K extends string>(key: K, value: string) =>
    value.trim() ? ({ [key]: Number(value) } as Record<K, number>) : undefined

  return {
    name: values.shiftName.trim(),
    start_time: values.startTime,
    end_time: values.endTime,
    ...sent('break_minutes', values.breakMinutes),
    // Always sent: a toggle turned off has to overwrite a stored `true`.
    is_late_break_penalty_applicable: values.isLateBreakPenaltyApplicable,
    ...sent('concession_minutes', values.concessionMinutes),
    // Always sent, for the same reason as the break penalty.
    is_late_check_in_penalty_applicable: values.isLateCheckInPenaltyApplicable,
    // The rule travels even while the switch is off, so suspending it keeps the
    // configured numbers; a blank field is a real "no rule" and has to null out
    // whatever was stored.
    late_check_in_penalty_type: values.lateCheckInPenaltyType || null,
    late_check_in_penalty_value: values.lateCheckInPenaltyValue.trim()
      ? Number(values.lateCheckInPenaltyValue)
      : null,
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
export function shiftToFormValues(shift: Shift, effectiveDate: string): ShiftFormValues {
  return {
    shiftName: shift.shiftName,
    /*
     * NOT the record's own `effectiveDate`. Re-sending that would AMEND the
     * version in force and rewrite the days already judged against it; an edit
     * means "from now on", so the field opens on today and the user moves it.
     */
    effectiveDate,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakMinutes: String(shift.breakMinutes),
    isLateBreakPenaltyApplicable: shift.isLateBreakPenaltyApplicable,
    concessionMinutes: String(shift.concessionMinutes),
    isLateCheckInPenaltyApplicable: shift.isLateCheckInPenaltyApplicable,
    lateCheckInPenaltyType: shift.lateCheckInPenaltyType ?? '',
    lateCheckInPenaltyValue:
      shift.lateCheckInPenaltyValue === null ? '' : String(shift.lateCheckInPenaltyValue),
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
 * Length of the shift window in hours: end − start, rounded to the nearest half
 * hour so it lands on the form's 0.5 step. The unpaid break is deliberately
 * *not* taken off — the full-day threshold is measured against the window, and
 * the break is charged separately by its own penalty.
 *
 * An end at or before the start crosses midnight, so a day is added — the same
 * rule the API uses to derive `is_night_shift`. Returns `null` while either time
 * is blank or half-typed.
 */
export function shiftSpanHours(startTime: string, endTime: string): number | null {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (start === null || end === null) return null

  const span = end > start ? end - start : end + 1440 - start
  return Math.round(span / 30) / 2
}

/**
 * The other direction: `09:00` + 9 hours → `18:00`, so typing a full day can fill
 * the end of the window in. Wraps past midnight, and returns `null` while the
 * start isn't a time yet or the hours aren't a sane day length.
 */
export function shiftEndFromHours(startTime: string, hours: number): string | null {
  const start = toMinutes(startTime)
  if (start === null) return null
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return null

  const end = (start + Math.round(hours * 60)) % 1440
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

/** Half a day on the form's 0.5 step — 9 → 4.5, 8.5 → 4.5. */
export function halfDayHours(fullDayHours: number): number {
  return Math.round(fullDayHours) / 2
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
 * `10%` / `₹150` — what one late day costs, or `null` while no rule is
 * configured. Charged per late day either way, so no "per minute" reading.
 */
export function formatLateCheckInPenalty(shift: Shift): string | null {
  if (shift.lateCheckInPenaltyType === null || shift.lateCheckInPenaltyValue === null) {
    return null
  }

  return shift.lateCheckInPenaltyType === 'PERCENTAGE'
    ? `${shift.lateCheckInPenaltyValue}%`
    : `₹${shift.lateCheckInPenaltyValue.toLocaleString('en-IN')}`
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
