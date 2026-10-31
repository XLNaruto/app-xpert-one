import type { TaskSubmissionMode } from '@/features/office-task/common'
import { SUBMISSION_MODE_SHORT_LABELS } from '../constants'
import type {
  CompanySettingsFormValues,
  CompanySettingsPayload,
  CompanySettingsResponse,
  SettingChangeHistoryItemResponse,
} from '../schemas'
import type { CompanySettings, SettingChange, SettingChangeHistoryItem } from '../types'
import { toIstFields } from './ist'

type SettingChangeResponse = CompanySettingsResponse['scheduled_changes'][number]

export function toSettingChange(raw: SettingChangeResponse): SettingChange {
  return {
    id: raw.id,
    settingKey: raw.setting_key,
    value: raw.value,
    previousValue: raw.previous_value,
    effectiveFrom: raw.effective_from,
    status: raw.status,
  }
}

export function toSettingChangeHistoryItem(
  raw: SettingChangeHistoryItemResponse,
): SettingChangeHistoryItem {
  return {
    ...toSettingChange(raw),
    createdAt: raw.created_at ?? null,
    createdByName: raw.created_by_name ?? null,
  }
}

export function toCompanySettings(raw: CompanySettingsResponse): CompanySettings {
  const scheduled: CompanySettings['scheduled'] = {}
  // Earliest first, at most one per key — keep the first seen just in case.
  for (const change of raw.scheduled_changes) {
    if (change.status === 'SCHEDULED' && !scheduled[change.setting_key]) {
      scheduled[change.setting_key] = toSettingChange(change)
    }
  }
  return {
    companyId: raw.company_id,
    sopTaskSubmission: raw.sop_task_submission,
    projectTaskSubmission: raw.project_task_submission,
    scheduled,
    earliestEffectiveFrom: raw.earliest_effective_from,
  }
}

/** The form seeded with the modes IN FORCE, effective from the earliest allowed. */
export function companySettingsToFormValues(
  settings: CompanySettings,
): CompanySettingsFormValues {
  const { date, time } = toIstFields(settings.earliestEffectiveFrom)
  return {
    sopTaskSubmission: settings.sopTaskSubmission,
    projectTaskSubmission: settings.projectTaskSubmission,
    effectiveDate: date,
    effectiveTime: time,
  }
}

/**
 * The PATCH body — `company_id`, `effective_from` and only the modes that differ
 * from the ones in force. `null` when no mode changed, since the API refuses a
 * save without a setting key.
 */
export function companySettingsToPayload(
  companyId: number,
  effectiveFrom: string,
  values: Pick<CompanySettingsFormValues, 'sopTaskSubmission' | 'projectTaskSubmission'>,
  inForce: Pick<CompanySettings, 'sopTaskSubmission' | 'projectTaskSubmission'>,
): CompanySettingsPayload | null {
  const payload: CompanySettingsPayload = { company_id: companyId, effective_from: effectiveFrom }
  let changed = false
  if (values.sopTaskSubmission !== inForce.sopTaskSubmission) {
    payload.sop_task_submission = values.sopTaskSubmission
    changed = true
  }
  if (values.projectTaskSubmission !== inForce.projectTaskSubmission) {
    payload.project_task_submission = values.projectTaskSubmission
    changed = true
  }
  return changed ? payload : null
}

/** `START_STOP` → `Start / Stop`; a missing previous value → `N/A`. */
export function submissionModeLabel(mode: TaskSubmissionMode | null): string {
  return mode ? SUBMISSION_MODE_SHORT_LABELS[mode] : 'N/A'
}

/**
 * What re-seeds the form: the company, the modes in force and the bookings.
 * `earliest_effective_from` moving on its own must NOT wipe the user's choices.
 */
export function companySettingsSeedKey(settings: CompanySettings): string {
  const booked = Object.values(settings.scheduled)
    .map((c) => `${c.id}:${c.value}:${c.effectiveFrom}`)
    .join(',')
  return `${settings.companyId}|${settings.sopTaskSubmission}|${settings.projectTaskSubmission}|${booked}`
}
