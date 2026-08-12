import { z } from 'zod'
import { recordNameField } from '@/lib/validation'

/** The API's ceiling on a cycle — and so on the `weeks` array too. */
export const MAX_CYCLE_WEEKS = 52

/** One week of the cycle on the form. `shiftId` is a dropdown's string. */
export const rotationWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(MAX_CYCLE_WEEKS),
  shiftId: z.string().trim().min(1, 'Pick a shift for this week'),
})

export type RotationWeekFormValues = z.infer<typeof rotationWeekSchema>

/**
 * Create/edit form for one rotation cycle.
 *
 * `weeks` is the WHOLE cycle: the API refuses a gap, because an employee landing
 * on a missing week would silently fall through to the department default. The
 * length field and the rows are therefore validated against each other here too,
 * rather than letting the server be the first to notice.
 */
export const shiftRotationSchema = z
  .object({
    name: recordNameField('the rotation name', { max: 100 }),
    /** Held as a string — that's what the number input gives us. */
    cycleLengthWeeks: z
      .string()
      .trim()
      .min(1, 'Cycle length is required')
      .refine(
        (value) =>
          /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_CYCLE_WEEKS,
        `Enter a whole number of weeks, 1 to ${MAX_CYCLE_WEEKS}`,
      ),
    weeks: z.array(rotationWeekSchema).min(1, 'A cycle needs at least one week'),
    status: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const length = Number(values.cycleLengthWeeks)
    if (!Number.isFinite(length)) return

    // A cycle that doesn't cover 1..length exactly once is refused server-side.
    if (values.weeks.length !== length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weeks'],
        message: `The cycle must name a shift for each of its ${length} week${length === 1 ? '' : 's'}`,
      })
    }

    const covered = new Set(values.weeks.map((week) => week.weekNumber))
    for (let week = 1; week <= length; week += 1) {
      if (!covered.has(week)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weeks'],
          message: `Week ${week} is missing from the cycle`,
        })
        break
      }
    }
  })

export type ShiftRotationFormValues = z.infer<typeof shiftRotationSchema>

/** One week of the cycle as the API returns it. */
export const rotationWeekResponseSchema = z.object({
  id: z.number(),
  week_number: z.number(),
  shift_id: z.number(),
})

/**
 * One rotation as the API returns it. List rows carry the audit trail; POST, GET
 * and PATCH answer the record's own columns only — hence the optional audit
 * fields, which the mapper reads as an empty trail.
 */
export const shiftRotationResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  cycle_length_weeks: z.number(),
  status: z.boolean(),
  weeks: z.array(rotationWeekResponseSchema),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type ShiftRotationResponse = z.infer<typeof shiftRotationResponseSchema>

/** `GET /user/shift-rotations` — an offset-paginated page of rotations. */
export const shiftRotationsResponseSchema = z.object({
  items: z.array(shiftRotationResponseSchema),
  total: z.number(),
})

/** One week in a request body. */
export interface RotationWeekPayload {
  week_number: number
  shift_id: number
}

/**
 * The create body. The endpoint rejects unknown keys, so this is exactly what may
 * be sent — and `weeks` is always the complete cycle.
 */
export interface ShiftRotationPayload {
  company_id: number
  name: string
  cycle_length_weeks: number
  status: boolean
  weeks: RotationWeekPayload[]
}

/** The update body — a rotation never moves between companies. */
export type ShiftRotationUpdatePayload = Omit<ShiftRotationPayload, 'company_id'>
