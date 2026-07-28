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
