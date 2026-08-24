import { z } from 'zod'
import { recordNameField } from '@/lib/validation'

/** The API's ceiling on `days` — 7 weekdays × 5 occurrences. */
export const MAX_WEEKOFF_RULES = 35

/**
 * One occurrence-specific rule row on the form.
 *
 * `weekNumber` is a string because it comes out of a dropdown: `''` is "every
 * occurrence" (the API's `null`) and `'1'`–`'5'` name one occurrence in the
 * month.
 */
export const weekoffRuleSchema = z.object({
  /** 0 = Sunday … 6 = Saturday, held as the dropdown's string. */
  weekDay: z.string().trim().min(1, 'Pick a day'),
  weekNumber: z.string().trim(),
  /** Off, or a working-day exception carved out of a broader rule. */
  isOff: z.boolean(),
})

export type WeekoffRuleFormValues = z.infer<typeof weekoffRuleSchema>

/**
 * Create/edit form for one week-off policy.
 *
 * A policy has TWO shapes, chosen by `offType`:
 *
 * - **FIXED** names the weekdays, and is what every policy written before this
 *   field existed is. The rules are captured in two parts because that's how
 *   people think about them: `everyWeekDays` are the plain "this weekday is
 *   always off" ticks, and `rules` are the occurrence-specific ones (alternate
 *   Saturdays, or a working exception on the 1st). Both collapse into the API's
 *   single `days` array.
 * - **FLEXIBLE** names a COUNT instead — so many days off a week, any days. It
 *   describes a shop, a warehouse or a hospital, where the business runs seven
 *   days and each person rests when the rota allows. A named weekday would
 *   contradict the count, so `days` must go out empty.
 */
export const weekoffPolicySchema = z
  .object({
    name: recordNameField('the policy name', { max: 100 }),
    /** Which of the two shapes this policy is. */
    offType: z.enum(['FIXED', 'FLEXIBLE']),
    /** Weekdays that are off every week — `week_number: null`, `is_off: true`. */
    everyWeekDays: z.array(z.number().int().min(0).max(6)),
    rules: z.array(weekoffRuleSchema),
    /** FLEXIBLE only: how many days a week are off. Held as the input's string. */
    weeklyOffDays: z.string().trim(),
    status: z.boolean(),
  })
  .superRefine((values, ctx) => {
    /*
     * A flexible policy is judged on its count and nothing else — the weekday
     * rules are cleared on the way out, so they aren't validated on the way in.
     */
    if (values.offType === 'FLEXIBLE') {
      const count = Number(values.weeklyOffDays)
      if (
        values.weeklyOffDays === '' ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 6
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weeklyOffDays'],
          message: 'Enter a whole number of days between 1 and 6',
        })
      }
      return
    }

    // A policy with no rule at all says nothing — the shift would fall through to
    // the platform's Sunday-only constant, which is not what saving it means.
    if (values.everyWeekDays.length === 0 && values.rules.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['everyWeekDays'],
        message: 'Mark at least one week-off day, or add an occurrence rule',
      })
    }

    // Every weekday off every week is a full-week closure, which the pattern
    // editor intentionally does not allow because somebody must still be working.
    if (values.everyWeekDays.length === 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['everyWeekDays'],
        message: "You can't select all seven days as off every week.",
      })
    }

    if (values.everyWeekDays.length + values.rules.length > MAX_WEEKOFF_RULES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message: `A policy can hold at most ${MAX_WEEKOFF_RULES} rules`,
      })
    }

    // The same weekday + occurrence twice is two answers to one question, and the
    // API would store whichever it read last.
    const seen = new Set<string>()
    values.rules.forEach((rule, index) => {
      const key = `${rule.weekDay}-${rule.weekNumber || 'every'}`
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rules', index, 'weekDay'],
          message: 'This day and occurrence already has a rule',
        })
      }
      seen.add(key)

      // An every-occurrence rule here would collide with the tick above it.
      if (
        !rule.weekNumber &&
        rule.isOff &&
        values.everyWeekDays.includes(Number(rule.weekDay))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rules', index, 'weekNumber'],
          message: 'This day is already off every week — pick an occurrence',
        })
      }
    })
  })

export type WeekoffPolicyFormValues = z.infer<typeof weekoffPolicySchema>

/** One rule as the API returns it. */
export const weekoffDayResponseSchema = z.object({
  id: z.number(),
  week_day: z.number(),
  week_number: z.number().nullish(),
  is_off: z.boolean(),
})

/**
 * One policy as the API returns it. List rows carry the audit trail; POST, GET
 * and PATCH answer the record's own columns only — hence the optional audit
 * fields, which the mapper reads as an empty trail.
 */
export const weekoffPolicyResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  status: z.boolean(),
  /** Which shape the policy is. Absent on records written before the column. */
  off_type: z.enum(['FIXED', 'FLEXIBLE']).nullish(),
  /** FLEXIBLE only — how many days a week are off. `null` on a FIXED policy. */
  weekly_off_days: z.number().nullish(),
  /** Always `[]` for a FLEXIBLE policy: a named day would contradict the count. */
  days: z.array(weekoffDayResponseSchema),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type WeekoffPolicyResponse = z.infer<typeof weekoffPolicyResponseSchema>

/** `GET /user/weekoff-policies` — an offset-paginated page of policies. */
export const weekoffPoliciesResponseSchema = z.object({
  items: z.array(weekoffPolicyResponseSchema),
  total: z.number(),
})

/** One rule in a request body. `week_number: null` is "every occurrence". */
export interface WeekoffDayPayload {
  week_day: number
  week_number: number | null
  is_off: boolean
}

/**
 * The create body. The endpoint rejects unknown keys, so this is exactly what
 * may be sent. `days` is always the WHOLE rule set — the API replaces the lot.
 */
export interface WeekoffPolicyPayload {
  company_id: number
  name: string
  status: boolean
  /**
   * FLEXIBLE requires `weekly_off_days` and an EMPTY `days`; FIXED must not carry
   * `weekly_off_days` at all — either mismatch is a 400, so the two travel as a
   * pair rather than being set independently.
   */
  off_type: 'FIXED' | 'FLEXIBLE'
  weekly_off_days?: number
  days: WeekoffDayPayload[]
}

/** The update body — a policy never moves between companies. */
export type WeekoffPolicyUpdatePayload = Omit<WeekoffPolicyPayload, 'company_id'>

/**
 * `set-default` / `clear-default` — exactly one of the two ids, naming the level
 * the default is being set at. A department's default wins over its company's.
 */
export interface WeekoffDefaultScope {
  company_id?: number
  department_id?: number
}
