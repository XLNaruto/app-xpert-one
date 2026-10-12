import type { TaskSubmissionMode } from '@/features/office-task/common'
import type { SettingChangeStatus, SettingKey } from '../schemas'

/** One booked change to a setting. Timestamps stay ISO-8601 UTC. */
export interface SettingChange {
  id: number
  settingKey: SettingKey
  value: TaskSubmissionMode
  previousValue: TaskSubmissionMode | null
  effectiveFrom: string
  status: SettingChangeStatus
}

/** A history row — the change plus who booked it and when. */
export interface SettingChangeHistoryItem extends SettingChange {
  createdAt: string | null
  createdByName: string | null
}

/** One company's behaviour switches, as the Settings screen reads them. */
export interface CompanySettings {
  companyId: number
  /** The modes IN FORCE right now — never the booked ones. */
  sopTaskSubmission: TaskSubmissionMode
  projectTaskSubmission: TaskSubmissionMode
  /** The booking waiting on each key, if any (the server keeps at most one). */
  scheduled: Partial<Record<SettingKey, SettingChange>>
  /** The soonest a new change may take effect — the picker's minimum. */
  earliestEffectiveFrom: string
}

/** The history list's server-side filters; `undefined` means "any". */
export interface SettingChangeFilters {
  settingKey?: SettingKey
  status?: SettingChangeStatus
}
