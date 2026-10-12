import type {
  CompanySettingsFormValues,
  CompanySettingsPayload,
  CompanySettingsResponse,
} from '../schemas'
import type { CompanySettings } from '../types'

export function toCompanySettings(raw: CompanySettingsResponse): CompanySettings {
  return {
    companyId: raw.company_id,
    sopTaskSubmission: raw.sop_task_submission,
    projectTaskSubmission: raw.project_task_submission,
  }
}

export function companySettingsToFormValues(
  settings: CompanySettings,
): CompanySettingsFormValues {
  return {
    sopTaskSubmission: settings.sopTaskSubmission,
    projectTaskSubmission: settings.projectTaskSubmission,
  }
}

/**
 * The PATCH body — `company_id` plus only what differs from what was loaded.
 * `null` when nothing changed, since the API refuses an empty save.
 */
export function companySettingsToPayload(
  companyId: number,
  values: CompanySettingsFormValues,
  initial: CompanySettingsFormValues,
): CompanySettingsPayload | null {
  const payload: CompanySettingsPayload = { company_id: companyId }
  if (values.sopTaskSubmission !== initial.sopTaskSubmission) {
    payload.sop_task_submission = values.sopTaskSubmission
  }
  if (values.projectTaskSubmission !== initial.projectTaskSubmission) {
    payload.project_task_submission = values.projectTaskSubmission
  }
  return Object.keys(payload).length > 1 ? payload : null
}
