import { z } from 'zod'

/** Create/edit form for an allowance / deduction master record. */
export const allowanceDeductionSchema = z.object({
  type: z.enum(['ALLOWANCE', 'DEDUCTION'], { message: 'Please select type' }),
  name: z
    .string()
    .trim()
    .min(1, 'Please enter name')
    .min(2, 'Minimum 2 characters'),
  shortName: z.string().trim().min(1, 'Please enter short name'),
})

export type AllowanceDeductionFormValues = z.infer<typeof allowanceDeductionSchema>
