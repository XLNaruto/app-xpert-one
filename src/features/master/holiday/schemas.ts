import { z } from 'zod'

/** Create/edit form for a holiday master record. Dates are `yyyy-MM-dd`. */
export const holidaySchema = z
  .object({
    holidayName: z
      .string()
      .trim()
      .min(1, 'Please enter holiday name')
      .min(2, 'Minimum 2 characters'),
    fromDate: z.string().trim().min(1, 'Please select from date'),
    toDate: z.string().trim().min(1, 'Please select to date'),
  })
  // Both dates are `yyyy-MM-dd`, so a plain string compare orders them.
  .refine((v) => !v.fromDate || !v.toDate || v.toDate >= v.fromDate, {
    path: ['toDate'],
    message: 'To date must be on or after from date',
  })

export type HolidayFormValues = z.infer<typeof holidaySchema>
