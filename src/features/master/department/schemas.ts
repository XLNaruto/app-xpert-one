import { z } from 'zod'

/**
 * Create/edit form for a department master record — the three fields the screen
 * captures. The branch is held as an id string (that's what the combobox gives
 * us) and parsed to a number by the mappers; the department code is generated
 * server-side, so the form never touches it.
 */
export const departmentSchema = z.object({
  branchId: z.string().trim().min(1, 'Branch is required'),
  departmentName: z
    .string()
    .trim()
    .min(1, 'Department name is required')
    .max(200, 'Department name cannot exceed 200 characters'),
  /** Day of the month (1–31) the attendance/salary cycle starts. */
  monthStartDay: z.string().trim().min(1, 'Month start date is required'),
  /**
   * Shift length for this department's staff, held as a string (that's what the
   * input gives us) and parsed to a number by the mappers. Optional: blank
   * inherits the company's value, and the platform default of 18 when it has
   * none. A value must land in (0, 24].
   */
  shiftHours: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (Number(v) > 0 && Number(v) <= 24),
      'Enter hours greater than 0 and up to 24',
    ),
})

export type DepartmentFormValues = z.infer<typeof departmentSchema>

/** A corner of the department's site boundary, as the API stores it. */
const geoFencePointSchema = z.object({
  lat: z.number(),
  long: z.number(),
})

/**
 * One department as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/departments` and
 * `GET/PATCH /user/departments/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 */
export const departmentResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  branch_id: z.number().nullable(),
  name: z.string(),
  code: z.string().nullable(),
  geo_fence: z.array(geoFencePointSchema).nullish(),
  month_start_day: z.number().nullable(),
  /**
   * Hours a shift may run before an unclosed check-in counts as abandoned.
   * `null` inherits the company's value. Nullish rather than nullable — older
   * records answered before the column existed omit it.
   */
  shift_hours: z.number().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type DepartmentResponse = z.infer<typeof departmentResponseSchema>

/** `GET /user/departments` — an offset-paginated page of departments. */
export const departmentsResponseSchema = z.object({
  items: z.array(departmentResponseSchema),
  total: z.number(),
})

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent —
 * `geo_fence` is left out, since this screen doesn't capture a site boundary.
 */
export interface DepartmentPayload {
  company_id: number
  branch_id: number | null
  name: string
  month_start_day: number | null
  /** `null` inherits the company's shift hours (and the default of 18). */
  shift_hours: number | null
}

/**
 * The update body. A department may be moved to another branch of the same
 * company, so `branch_id` stays — only the tenant is fixed.
 */
export type DepartmentUpdatePayload = Omit<DepartmentPayload, 'company_id'>
