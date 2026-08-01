import { z } from 'zod'

/**
 * Contribution amounts cross the form boundary as strings (that's what an
 * `<input>` gives us) and are parsed to numbers by the mappers, so the schema
 * validates the string form.
 */
const amount = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter ${what}`)
    .refine((v) => Number.isFinite(Number(v)), 'Please enter a valid amount')
    .refine((v) => Number(v) >= 0, 'Amount must be positive')

/** Create/edit form for an LWF rate. */
export const lwfRateSchema = z.object({
  wef: z.string().trim().min(1, 'Please select W.E.F date'),
  stateId: z.string().trim().min(1, 'Please select state'),
  month: z.string().trim().min(1, 'Please select month'),
  employeeContribution: amount('employee contribution'),
  employerContribution: amount('employer contribution'),
})

export type LwfRateFormValues = z.infer<typeof lwfRateSchema>

/**
 * One LWF rate as the API returns it (`POST/GET/PATCH /user/lwf-rates`). Every
 * value column is nullable server-side — the mapper substitutes 0 / an empty
 * string — the state arrives as a bare `state_id` (its name is joined in from
 * the state master), and the only audit field is `created_at`.
 */
export const lwfRateResponseSchema = z.object({
  id: z.number(),
  effective_date: z.string().nullable(),
  state_id: z.number().nullable(),
  month: z.string().nullable(),
  employee_contribution: z.number().nullable(),
  employer_contribution: z.number().nullable(),
  created_at: z.string(),
})

export type LwfRateResponse = z.infer<typeof lwfRateResponseSchema>

/** `GET /user/lwf-rates` — an offset-paginated page of rates. */
export const lwfRatesResponseSchema = z.object({
  items: z.array(lwfRateResponseSchema),
  total: z.number(),
})

/**
 * The create/update request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 */
export interface LwfRatePayload {
  effective_date: string
  state_id: number
  month: string
  employee_contribution: number
  employer_contribution: number
}
