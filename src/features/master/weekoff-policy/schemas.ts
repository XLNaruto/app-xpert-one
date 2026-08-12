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
 * The rules are captured in two parts because that's how people think about
 * them: `everyWeekDays` are the plain "this weekday is always off" ticks, and
 * `rules` are the occurrence-specific ones (alternate Saturdays, or a working
 * exception on the 1st). Both collapse into the API's single `days` array.
 */
export const weekoffPolicySchema = z
  .object({
    name: recordNameField('the policy name', { max: 100 }),
    /** Weekdays that are off every week — `week_number: null`, `is_off: true`. */
    everyWeekDays: z.array(z.number().int().min(0).max(6)),
    rules: z.array(weekoffRuleSchema),
    status: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // A policy with no rule at all says nothing — the shift would fall through to
    // the platform's Sunday-only constant, which is not what saving it means.
    if (values.everyWeekDays.length === 0 && values.rules.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['everyWeekDays'],
        message: 'Mark at least one week-off day, or add an occurrence rule',
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
