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
