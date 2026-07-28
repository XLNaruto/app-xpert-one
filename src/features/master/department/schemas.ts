import { z } from 'zod'

/** Create/edit form for a department master record. */
export const departmentSchema = z.object({
  branch: z.string().trim().min(1, 'Branch is required'),
  departmentName: z.string().trim().min(1, 'Department name is required'),
  /** Kept on the record, but no longer captured on the create/edit form. */
  departmentCode: z.string().trim(),
  monthStartDate: z.string().trim().min(1, 'Month start date is required'),
})

export type DepartmentFormValues = z.infer<typeof departmentSchema>
