import { z } from 'zod'
import { recordNameField } from '@/lib/validation'

/** `HH:MM` (24-hour), the only time format the endpoint accepts. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * A whole-number field held as a string (that's what the input gives us) and
 * parsed by the mappers. Blank is allowed and falls back to the API's own
 * default for the column.
 */
const optionalInt = (max: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d+$/.test(v) && Number(v) <= max),
      message,
    )

/** Same, for the two fractional hour thresholds. */
const optionalHours = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || (Number(v) >= 0.5 && Number(v) <= 24),
    'Enter hours between 0.5 and 24',
  )

/**
 * Create/edit form for one shift.
 *
 * `is_night_shift` is absent on purpose — the API derives it from the two times
 * (an end earlier than the start makes it a night shift), so a form field for it
 * could only ever disagree with the times above it.
 */
export const shiftSchema = z
  .object({
    shiftName: recordNameField('the shift name', { max: 100 }),
    startTime: z
      .string()
      .trim()
      .min(1, 'Start time is required')
      .regex(TIME_PATTERN, 'Enter a time as HH:MM'),
    endTime: z
      .string()
      .trim()
      .min(1, 'End time is required')
      .regex(TIME_PATTERN, 'Enter a time as HH:MM'),
    /** Unpaid break inside the shift. */
    breakMinutes: optionalInt(1440, 'Enter whole minutes, up to 1440'),
    /** Grace after `startTime` in which a check-in still counts as on time. */
    concessionMinutes: optionalInt(720, 'Enter whole minutes, up to 720'),
    /** Worked hours at or above this are a full day. */
    minFullDayHours: optionalHours,
    /** Worked hours at or above this, but under a full day, are a half day. */
    minHalfDayHours: optionalHours,
    /**
     * The week-off pattern this shift follows, as a policy id (or `''` for none).
     *
     * Optional on purpose: most shifts name none and fall back to the department's
     * or the company's default pattern — and, failing both, to the platform's
     * Sunday-only constant. Naming one here overrides all of that for this shift.
     */
    weekoffPolicyId: z.string().trim(),
    /**
     * Active/inactive, toggled on the form. A new shift opens active; an edit
     * opens on whatever the record holds, so a save only flips it deliberately.
     */
    status: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // A half day that reaches the full-day threshold would never be a half day.
    if (
      values.minFullDayHours !== '' &&
      values.minHalfDayHours !== '' &&
      Number(values.minHalfDayHours) >= Number(values.minFullDayHours)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minHalfDayHours'],
        message: 'Half-day hours must be less than full-day hours',
      })
    }

    // Equal times describe a zero-length shift, not a 24-hour one.
    if (values.startTime && values.startTime === values.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must differ from the start time',
      })
    }
  })

export type ShiftFormValues = z.infer<typeof shiftSchema>

/**
 * One shift as the API returns it. List rows carry the audit trail; POST, GET
 * and PATCH answer the record's own columns only — hence the optional audit
 * fields, which the mapper reads as an empty trail.
 */
export const shiftResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  /** Derived server-side from the two times — read-only here. */
  is_night_shift: z.boolean(),
  break_minutes: z.number(),
  concession_minutes: z.number(),
  early_exit_grace_minutes: z.number(),
  min_full_day_hours: z.number(),
  min_half_day_hours: z.number(),
  weekoff_policy_id: z.number().nullish(),
  status: z.boolean(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type ShiftResponse = z.infer<typeof shiftResponseSchema>

/** `GET /user/shifts` — an offset-paginated page of shifts. */
export const shiftsResponseSchema = z.object({
  items: z.array(shiftResponseSchema),
  total: z.number(),
})

/**
 * The create body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent —
 * `is_night_shift` is derived and `weekoff_policy_id` isn't captured by any
 * screen yet, so neither travels.
 *
 * The five tolerance fields are optional here because they're optional on the
 * form: left blank they're dropped from the body entirely and the API applies
 * its own default, rather than the app inventing one that could drift from it.
 *
 * `weekoff_policy_id` behaves differently — it travels as an explicit `null` when
 * the form clears it, since "no pattern of its own" is a real choice that has to
 * overwrite a previously named policy rather than leave it in place.
 */
export interface ShiftPayload {
  company_id: number
  name: string
  start_time: string
  end_time: string
  break_minutes?: number
  concession_minutes?: number
  early_exit_grace_minutes?: number
  min_full_day_hours?: number
  min_half_day_hours?: number
  weekoff_policy_id: number | null
  status: boolean
}

/** The update body — a shift never moves between companies. */
export type ShiftUpdatePayload = Omit<ShiftPayload, 'company_id'>

/**
 * `set-default` / `clear-default` — exactly one of the two ids, naming the level
 * the default is being set at.
 */
export interface ShiftDefaultScope {
  company_id?: number
  department_id?: number
}
