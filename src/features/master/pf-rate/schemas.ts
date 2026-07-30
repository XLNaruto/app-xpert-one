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

/** Non-required percentage: a blank value is allowed and stores as 0. */
const lenientPercent = z
  .string()
  .trim()
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Please enter a valid percentage')
  .refine((v) => v === '' || Number(v) >= 0, 'Percentage must be positive')
  .refine((v) => v === '' || Number(v) <= 100, 'Percentage cannot exceed 100')

/** Create/edit form for a PF rate slab. */
export const pfRateSchema = z
  .object({
    wef: z.string().trim().min(1, 'Please select W.E.F date'),

    wageCeilingLimit: amount('wage ceiling limit'),
    edliWageCeilingLimit: amount('EDLI wage ceiling limit'),

    employeePfContribution: percent('employee PF contribution'),
    employerPfContribution: percent('employer PF contribution'),
    employerFpfContribution: percent('employer FPF contribution'),
    deduction: lenientPercent,

    adminCharges: percent('admin charges'),
    edliCharges: percent('EDLI charges'),
    edliAdminCharges: percent('EDLI admin charges'),

    minimumAdminCharges: amount('minimum admin charges'),
    maximumEdliCharges: amount('maximum EDLI charges'),
    minimumClosedAdminCharges: amount('minimum closed admin charges'),
    minimumEdliClosedCharges: amount('minimum EDLI closed charges'),

    pensionFundAgeLimit: z
      .string()
      .trim()
      .min(1, 'Please enter pension fund age limit')
      .refine((v) => Number.isFinite(Number(v)), 'Please enter a valid age')
      .refine((v) => Number(v) > 0 && Number(v) <= 100, 'Age must be between 1 and 100'),
  })
  // The employee share and the employer's PF + FPF split are two halves of the
  // same statutory contribution — catching a bad split here beats finding it in
  // a payroll run.
  .refine(
    (v) =>
      Number(v.employerPfContribution) + Number(v.employerFpfContribution) <=
      Number(v.employeePfContribution),
    {
      path: ['employerFpfContribution'],
      message: 'Employer PF + FPF cannot exceed the employee PF contribution',
    },
  )
  .refine(
    (v) => Number(v.minimumClosedAdminCharges) <= Number(v.minimumAdminCharges),
    {
      path: ['minimumClosedAdminCharges'],
      message: 'Closed-unit minimum cannot exceed the minimum admin charges',
    },
  )

export type PfRateFormValues = z.infer<typeof pfRateSchema>

/**
 * One PF rate slab as the API returns it (`POST/GET/PATCH /user/pf-rates`).
 * Every value column is nullable server-side — the mapper substitutes 0 — and
 * the only audit field is `created_at`.
 */
export const pfRateResponseSchema = z.object({
  id: z.number(),
  effective_date: z.string().nullable(),
  wage_ceiling_limit: z.number().nullable(),
  edli_wage_ceiling_limit: z.number().nullable(),
  employee_pf_contribution: z.number().nullable(),
  employer_pf_contribution: z.number().nullable(),
  employer_fpf_contribution: z.number().nullable(),
  deduction: z.number().nullable(),
  admin_charges: z.number().nullable(),
  edli_charges: z.number().nullable(),
  edli_admin_charges: z.number().nullable(),
  minimum_admin_charges: z.number().nullable(),
  maximum_edli_charges: z.number().nullable(),
  minimum_closed_admin_charges: z.number().nullable(),
  minimum_edli_closed_charges: z.number().nullable(),
  pension_fund_age_limit: z.number().nullable(),
  created_at: z.string(),
})

/** `GET /user/pf-rates` — one page of slabs plus the unpaged total. */
export const pfRatesResponseSchema = z.object({
  items: z.array(pfRateResponseSchema),
  total: z.number(),
})

export type PfRateResponse = z.infer<typeof pfRateResponseSchema>
export type PfRatesResponse = z.infer<typeof pfRatesResponseSchema>

/** The create/update request body — snake_case, numbers not strings. */
export type PfRatePayload = {
  effective_date: string
  wage_ceiling_limit: number
  edli_wage_ceiling_limit: number
  employee_pf_contribution: number
  employer_pf_contribution: number
  employer_fpf_contribution: number
  deduction: number
  admin_charges: number
  edli_charges: number
  edli_admin_charges: number
  minimum_admin_charges: number
  maximum_edli_charges: number
  minimum_closed_admin_charges: number
  minimum_edli_closed_charges: number
  pension_fund_age_limit: number
}
