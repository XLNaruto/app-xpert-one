import { z } from 'zod'
import { recordNameField } from '@/lib/validation'

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
