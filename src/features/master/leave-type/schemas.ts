import { z } from 'zod'

/** Create/edit form for a leave type master record. */
export const leaveTypeSchema = z.object({
  leaveName: z
    .string()
    .trim()
    .min(1, 'Leave name is required')
    .min(2, 'Minimum 2 characters')
    .max(120, 'Leave name cannot exceed 120 characters'),
  shortName: z
    .string()
    .trim()
    .min(1, 'Short name is required')
    .max(20, 'Short name cannot exceed 20 characters'),
  payType: z.enum(['PAID', 'UNPAID'], { message: 'Pay type is required' }),
})

export type LeaveTypeFormValues = z.infer<typeof leaveTypeSchema>

/**
 * One leave type as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/leave-types` and
 * `GET/PATCH /user/leave-types/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 *
 * `type` is documented as a bare string on the way out (the enum is enforced
 * only on the way in), so it's narrowed in the mapper rather than here — an
 * unexpected value shouldn't fail the whole page.
 */
export const leaveTypeResponseSchema = z.object({
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

/** `GET /user/leave-types` — an offset-paginated page of leave types. */
export const leaveTypesResponseSchema = z.object({
  items: z.array(leaveTypeResponseSchema),
  total: z.number(),
})

export type LeaveTypeResponse = z.infer<typeof leaveTypeResponseSchema>

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 */
export interface LeaveTypePayload {
  company_id: number
  short_code: string
  name: string
  type: LeaveTypeFormValues['payType']
}

/** The update body — the same fields minus `company_id`, which can't be moved. */
export type LeaveTypeUpdatePayload = Omit<LeaveTypePayload, 'company_id'>
