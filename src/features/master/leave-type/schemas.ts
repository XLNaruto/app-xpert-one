import { z } from 'zod'

/** Create/edit form for a leave type master record. */
export const leaveTypeSchema = z.object({
  leaveName: z
    .string()
    .trim()
    .min(1, 'Leave name is required')
    .min(2, 'Minimum 2 characters'),
  shortName: z.string().trim().min(1, 'Short name is required'),
  payType: z.enum(['PAID', 'UNPAID'], { message: 'Pay type is required' }),
})

export type LeaveTypeFormValues = z.infer<typeof leaveTypeSchema>
