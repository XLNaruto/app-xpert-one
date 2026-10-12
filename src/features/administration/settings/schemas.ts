import { z } from 'zod'
import { taskSubmissionModeSchema } from '@/features/office-task/common'

/** The switches a change can be booked against. */
export const settingKeySchema = z.enum(['sop_task_submission', 'project_task_submission'])

export type SettingKey = z.infer<typeof settingKeySchema>

/** Where a booked change is in its life — see `SETTING_CHANGE_STATUS_META`. */
export const settingChangeStatusSchema = z.enum([
  'SCHEDULED',
  'APPLIED',
  'CANCELLED',
  'SUPERSEDED',
])

export type SettingChangeStatus = z.infer<typeof settingChangeStatusSchema>

/** One booked change. Every timestamp is ISO-8601 UTC. */
export const settingChangeResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  setting_key: settingKeySchema,
  value: taskSubmissionModeSchema,
  previous_value: taskSubmissionModeSchema.nullable(),
  effective_from: z.string(),
  status: settingChangeStatusSchema,
  applied_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancelled_by: z.union([z.string(), z.number()]).nullable(),
})

/**
 * GET / PATCH /user/company-settings — both answer the company's full settings.
 * The two modes are the values IN FORCE now; `scheduled_changes` holds what's
 * booked (at most one per key), and `earliest_effective_from` is the soonest a
 * new change may take effect — the server works out the 7-day notice, not us.
 */
export const companySettingsResponseSchema = z.object({
  company_id: z.number(),
  sop_task_submission: taskSubmissionModeSchema,
  project_task_submission: taskSubmissionModeSchema,
  scheduled_changes: z.array(settingChangeResponseSchema).default([]),
  earliest_effective_from: z.string(),
})

export type CompanySettingsResponse = z.infer<typeof companySettingsResponseSchema>

/** GET /user/company-settings/changes — one history row, with its audit names. */
export const settingChangeHistoryItemSchema = settingChangeResponseSchema.extend({
  created_at: z.string().nullable().optional(),
  created_by_name: z.string().nullable().optional(),
})

export type SettingChangeHistoryItemResponse = z.infer<typeof settingChangeHistoryItemSchema>

export const settingChangesResponseSchema = z.object({
  items: z.array(settingChangeHistoryItemSchema),
  total: z.number(),
})

/**
 * The Settings form — one choice per kind of task, plus when the change takes
 * effect. `effectiveDate` / `effectiveTime` are an IST wall-clock date and time
 * (`yyyy-MM-dd`, `HH:mm`); the 7-day minimum is checked in the hook, since it
 * moves with the clock.
 */
export const companySettingsFormSchema = z.object({
  sopTaskSubmission: taskSubmissionModeSchema,
  projectTaskSubmission: taskSubmissionModeSchema,
  effectiveDate: z.string().min(1, 'Choose the date the change takes effect'),
  effectiveTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose the time the change takes effect'),
})

export type CompanySettingsFormValues = z.infer<typeof companySettingsFormSchema>

/**
 * PATCH /user/company-settings — `company_id`, when it takes effect (ISO with an
 * offset), and ONLY the keys the user changed. Sending a key's in-force value
 * would withdraw its booking, so untouched keys never travel.
 */
export interface CompanySettingsPayload {
  company_id: number
  effective_from: string
  sop_task_submission?: CompanySettingsFormValues['sopTaskSubmission']
  project_task_submission?: CompanySettingsFormValues['projectTaskSubmission']
}
