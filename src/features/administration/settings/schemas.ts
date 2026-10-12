import { z } from 'zod'
import { taskSubmissionModeSchema } from '@/features/office-task/common'

/**
 * GET / PATCH /user/company-settings — both answer the company's full settings.
 * Every company has a row (the migration seeds `START_STOP`), so the two modes
 * are always present.
 */
export const companySettingsResponseSchema = z.object({
  company_id: z.number(),
  sop_task_submission: taskSubmissionModeSchema,
  project_task_submission: taskSubmissionModeSchema,
})

export type CompanySettingsResponse = z.infer<typeof companySettingsResponseSchema>

/** The Settings form — one choice per kind of task. */
export const companySettingsFormSchema = z.object({
  sopTaskSubmission: taskSubmissionModeSchema,
  projectTaskSubmission: taskSubmissionModeSchema,
})

export type CompanySettingsFormValues = z.infer<typeof companySettingsFormSchema>

/**
 * PATCH /user/company-settings — a PARTIAL save: `company_id` plus only the
 * fields that changed. The API answers 400 when neither travels.
 */
export interface CompanySettingsPayload {
  company_id: number
  sop_task_submission?: CompanySettingsFormValues['sopTaskSubmission']
  project_task_submission?: CompanySettingsFormValues['projectTaskSubmission']
}
