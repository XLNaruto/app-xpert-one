import { z } from 'zod'

/** Create/edit form for an allowance / deduction master record. */
export const allowanceDeductionSchema = z.object({
  type: z.enum(['ALLOWANCE', 'DEDUCTION'], { message: 'Please select type' }),
  name: z
    .string()
    .trim()
    .min(1, 'Please enter name')
    .min(2, 'Minimum 2 characters')
    .max(120, 'Name cannot exceed 120 characters'),
  shortName: z
    .string()
    .trim()
    .min(1, 'Please enter short name')
    .max(20, 'Short name cannot exceed 20 characters'),
})

export type AllowanceDeductionFormValues = z.infer<typeof allowanceDeductionSchema>

/**
 * One pay component as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/pay-components` and
 * `GET/PATCH /user/pay-components/:id` answer with the record's own columns
 * only — hence the optional audit fields, which the mapper reads as an empty
 * trail.
 *
 * `type` is documented as a bare string on the way out (the enum is enforced
 * only on the way in), so it's narrowed in the mapper rather than here — an
 * unexpected value shouldn't fail the whole page.
 */
export const payComponentResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  short_code: z.string(),
  name: z.string(),
  type: z.string(),
  created_at: z.string(),
  created_by_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
})

/** `GET /user/pay-components` — an offset-paginated page of components. */
export const payComponentsResponseSchema = z.object({
  items: z.array(payComponentResponseSchema),
  total: z.number(),
})

export type PayComponentResponse = z.infer<typeof payComponentResponseSchema>

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent — and
 * `type` travels lowercase, unlike the uppercase the UI holds it in.
 */
export interface PayComponentPayload {
  company_id: number
  short_code: string
  name: string
  type: 'allowance' | 'deduction'
}

/** The update body — the same fields minus `company_id`, which can't be moved. */
export type PayComponentUpdatePayload = Omit<PayComponentPayload, 'company_id'>
