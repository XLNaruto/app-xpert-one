import { z } from 'zod'

/**
 * Numeric fields cross the form boundary as strings (that's what an `<input>`
 * gives us) and are parsed to numbers by the mappers. These builders validate
 * the string form so the messages read like the rest of the app's forms.
 */

/** Required money field: present, numeric and not negative. */
const amount = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter ${what}`)
    .refine((v) => Number.isFinite(Number(v)), 'Please enter a valid amount')
    .refine((v) => Number(v) >= 0, 'Amount must be positive')

/** Required percentage field: present, numeric and within 0–100. */
const percent = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter ${what}`)
    .refine((v) => Number.isFinite(Number(v)), 'Please enter a valid percentage')
    .refine((v) => Number(v) >= 0, 'Percentage must be positive')
    .refine((v) => Number(v) <= 100, 'Percentage cannot exceed 100')

/** Create/edit form for an ESIC rate slab. */
export const esicRateSchema = z
  .object({
    wef: z.string().trim().min(1, 'Please select W.E.F date'),

    wageCeilingLimit: amount('ESIC wage ceiling'),
    minimumRate: amount('minimum rate'),

    contributionEndPeriod1: z
      .string()
      .trim()
      .min(1, 'Please select contribution period 1'),
    contributionEndPeriod2: z
      .string()
      .trim()
      .min(1, 'Please select contribution period 2'),

    employeeEsiContribution: percent('employee contribution'),
    employerEsiContribution: percent('employer contribution'),

    disabilityDuration: z
      .string()
      .trim()
      .min(1, 'Please enter disability duration')
      .refine((v) => Number.isFinite(Number(v)), 'Please enter a valid duration')
      .refine((v) => Number(v) >= 0, 'Duration must be positive'),

    disabilityWageLimit: amount('disability wage limit'),
  })
  // The two ESIC contribution periods split the year (typically ending in
  // September and March) — the same closing month twice would leave half the
  // year uncovered.
  .refine((v) => v.contributionEndPeriod1 !== v.contributionEndPeriod2, {
    path: ['contributionEndPeriod2'],
    message: 'Contribution period 2 must differ from period 1',
  })

export type EsicRateFormValues = z.infer<typeof esicRateSchema>

/**
 * One ESIC rate slab as the API returns it (`POST/GET/PATCH /user/esic-rates`).
 * Every value column is nullable server-side — the mapper substitutes 0 — the
 * contribution periods come back as month numbers, and the only audit field is
 * `created_at`.
 */
export const esicRateResponseSchema = z.object({
  id: z.number(),
  effective_date: z.string().nullable(),
  wage_ceiling_limit: z.number().nullable(),
  minimum_rate: z.number().nullable(),
  employee_esic_contribution: z.number().nullable(),
  employer_esic_contribution: z.number().nullable(),
  disability_duration: z.number().nullable(),
  disability_wage_limit: z.number().nullable(),
  contribution_end_period1: z.number().nullable(),
  contribution_end_period2: z.number().nullable(),
  created_at: z.string(),
})

/** `GET /user/esic-rates` — one page of slabs plus the unpaged total. */
export const esicRatesResponseSchema = z.object({
  items: z.array(esicRateResponseSchema),
  total: z.number(),
})

export type EsicRateResponse = z.infer<typeof esicRateResponseSchema>
export type EsicRatesResponse = z.infer<typeof esicRatesResponseSchema>

/** The fields both request bodies agree on — snake_case, numbers not strings. */
type EsicRateBasePayload = {
  effective_date: string
  wage_ceiling_limit: number
  minimum_rate: number
  disability_duration: number
  disability_wage_limit: number
  contribution_end_period1: number
  contribution_end_period2: number
}

/**
 * `POST /user/esic-rates` spells the contribution pair without the "c", unlike
 * the response and the PATCH body. Both bodies reject unknown keys, so the two
 * verbs get their own payload type until the backend settles on one spelling.
 */
export type EsicRateCreatePayload = EsicRateBasePayload & {
  employee_esi_contribution: number
  employer_esi_contribution: number
}

/** `PATCH /user/esic-rates/:id` — the response's spelling. */
export type EsicRateUpdatePayload = EsicRateBasePayload & {
  employee_esic_contribution: number
  employer_esic_contribution: number
}
