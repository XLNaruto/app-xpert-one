import { z } from 'zod'
import { recordNameField } from '@/lib/validation'
import {
  accountingYearOfDate,
  accountingYearRange,
  isAccountingYear,
  isInAccountingYear,
} from './lib/accounting-year'

/**
 * A holiday may not run past 31 March — the API files each one under a single
 * accounting year. Checked on the client so the date picker's error says so
 * before the request does.
 */
function crossesAccountingYear(fromDate: string, toDate: string): string | null {
  if (!fromDate || !toDate || toDate < fromDate) return null
  const year = accountingYearOfDate(fromDate)
  if (!year || isInAccountingYear(toDate, year)) return null
  return `A holiday must fall within one accounting year; ${year} ends on 31 March — enter it as two holidays`
}

/** Create/edit form for a holiday master record. Dates are `yyyy-MM-dd`. */
export const holidaySchema = z
  .object({
    holidayName: recordNameField('the holiday name', { max: 200 }),
    fromDate: z.string().trim().min(1, 'Please select from date'),
    toDate: z.string().trim().min(1, 'Please select to date'),
  })
  // Both dates are `yyyy-MM-dd`, so a plain string compare orders them.
  .refine((v) => !v.fromDate || !v.toDate || v.toDate >= v.fromDate, {
    path: ['toDate'],
    message: 'To date must be on or after from date',
  })
  .superRefine((v, ctx) => {
    const message = crossesAccountingYear(v.fromDate, v.toDate)
    if (message) ctx.addIssue({ code: 'custom', path: ['toDate'], message })
  })

export type HolidayFormValues = z.infer<typeof holidaySchema>

/**
 * One holiday as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/holidays` and
 * `GET/PATCH /user/holidays/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 */
export const holidayResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  from_date: z.string(),
  to_date: z.string(),
  /** `2026-27` — derived by the API from `from_date`. */
  accounting_year: z.string().nullish(),
  created_at: z.string(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

/** `GET /user/holidays` — an offset-paginated page of holidays. */
export const holidaysResponseSchema = z.object({
  items: z.array(holidayResponseSchema),
  total: z.number(),
})

export type HolidayResponse = z.infer<typeof holidayResponseSchema>

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent, and
 * both dates must be plain `yyyy-MM-dd`.
 */
export interface HolidayPayload {
  company_id: number
  name: string
  from_date: string
  to_date: string
}

/** The update body — the same fields minus `company_id`, which can't be moved. */
export type HolidayUpdatePayload = Omit<HolidayPayload, 'company_id'>

/* ── A whole accounting year in one save ─────────────────────────────────── */

/** One row of the year form. Dates are `yyyy-MM-dd`. */
export const holidayYearRowSchema = z.object({
  name: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
})

/**
 * `POST /user/holidays/accounting-year` — up to 100 holidays, every one inside
 * the chosen year, saved all-or-nothing. A row left completely blank is
 * ignored rather than reported, so a spare empty row doesn't block the save.
 */
export const holidayYearSchema = z
  .object({
    accountingYear: z
      .string()
      .refine(isAccountingYear, 'Please select an accounting year'),
    rows: z.array(holidayYearRowSchema),
  })
  .superRefine((v, ctx) => {
    const range = accountingYearRange(v.accountingYear)
    const filled = v.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.name.trim() || row.fromDate || row.toDate)

    if (filled.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['rows'], message: 'Add at least one holiday' })
      return
    }
    if (filled.length > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['rows'],
        message: 'A single save can hold at most 100 holidays',
      })
    }

    // The API refuses the same name twice on one start date.
    const seen = new Set<string>()

    for (const { row, index } of filled) {
      const name = row.name.trim()
      if (!name) {
        ctx.addIssue({ code: 'custom', path: ['rows', index, 'name'], message: 'Please enter the holiday name' })
      } else if (name.length > 200) {
        ctx.addIssue({ code: 'custom', path: ['rows', index, 'name'], message: 'Maximum 200 characters' })
      }
      if (!row.fromDate) {
        ctx.addIssue({ code: 'custom', path: ['rows', index, 'fromDate'], message: 'Please select from date' })
      } else if (range && !isInAccountingYear(row.fromDate, v.accountingYear)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'fromDate'],
          message: `Must fall within ${v.accountingYear}`,
        })
      }
      if (!row.toDate) {
        ctx.addIssue({ code: 'custom', path: ['rows', index, 'toDate'], message: 'Please select to date' })
      } else if (row.fromDate && row.toDate < row.fromDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'toDate'],
          message: 'To date must be on or after from date',
        })
      } else if (range && !isInAccountingYear(row.toDate, v.accountingYear)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'toDate'],
          message: `Must fall within ${v.accountingYear}`,
        })
      }

      if (name && row.fromDate) {
        const key = `${name.toLowerCase()}|${row.fromDate}`
        if (seen.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['rows', index, 'name'],
            message: 'Listed twice for the same start date',
          })
        }
        seen.add(key)
      }
    }
  })

export type HolidayYearRowValues = z.infer<typeof holidayYearRowSchema>
export type HolidayYearFormValues = z.infer<typeof holidayYearSchema>

/** The year-save request body. */
export interface HolidayYearPayload {
  company_id: number
  accounting_year: string
  holidays: HolidayUpdatePayload[]
}

/** The year-save answer — the created holidays, in the order sent. */
export const holidayYearResponseSchema = z.object({
  accounting_year: z.string(),
  items: z.array(holidayResponseSchema),
  total: z.number(),
})

/* ── Dashboard reminder ──────────────────────────────────────────────────── */

/** `GET /user/dashboard/holiday-reminder`. */
export const holidayReminderResponseSchema = z.object({
  show: z.boolean(),
  accounting_year: z.string().nullish(),
  starts_on: z.string().nullish(),
  ends_on: z.string().nullish(),
  notify_from: z.string().nullish(),
  status: z.string().nullish(),
  days_until_start: z.number().nullish(),
  items: z
    .array(
      z.object({
        company_id: z.number(),
        company_name: z.string().nullish(),
        company_code: z.string().nullish(),
      }),
    )
    .nullish(),
  total: z.number().nullish(),
})

export type HolidayReminderResponse = z.infer<typeof holidayReminderResponseSchema>
