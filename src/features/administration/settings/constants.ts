import type { ComboboxOption } from '@/components/ui/combobox'
import type { TaskSubmissionMode } from '@/features/office-task/common'
import type { BadgeProps } from '@/components/ui/badge'
import type { SettingChangeStatus, SettingKey } from './schemas'

/** What each setting key is called on screen. */
export const SETTING_KEY_LABELS: Record<SettingKey, string> = {
  sop_task_submission: 'SOP task submission',
  project_task_submission: 'Project task submission',
}

/** A mode in a sentence or a table cell — shorter than the picker's card titles. */
export const SUBMISSION_MODE_SHORT_LABELS: Record<TaskSubmissionMode, string> = {
  START_STOP: 'Start / Stop',
  DIRECT: 'Direct',
}

/** History status badges: Scheduled blue, Applied green, the closed ones grey. */
export const SETTING_CHANGE_STATUS_META: Record<
  SettingChangeStatus,
  { label: string; variant: BadgeProps['variant']; className?: string }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    variant: 'outline',
    className: 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  APPLIED: { label: 'Applied', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
  SUPERSEDED: { label: 'Superseded', variant: 'secondary' },
}

/** History filter — '' is "every setting", sent as no `setting_key`. */
export const SETTING_KEY_FILTERS: ComboboxOption[] = [
  { label: 'All Settings', value: '' },
  ...(Object.keys(SETTING_KEY_LABELS) as SettingKey[]).map((key) => ({
    label: SETTING_KEY_LABELS[key],
    value: key,
  })),
]

/** History filter — '' is "every status", sent as no `status`. */
export const SETTING_CHANGE_STATUS_FILTERS: ComboboxOption[] = [
  { label: 'All Statuses', value: '' },
  ...(Object.keys(SETTING_CHANGE_STATUS_META) as SettingChangeStatus[]).map((status) => ({
    label: SETTING_CHANGE_STATUS_META[status].label,
    value: status,
  })),
]

/** The history endpoint's maximum `limit`. */
export const SETTING_CHANGES_MAX_LIMIT = 200

/**
 * How often the settings are re-read while the screen is open. The notice
 * minimum (`earliest_effective_from`) moves forward with the clock, so the
 * picker's floor shouldn't go stale on an idle tab.
 */
export const COMPANY_SETTINGS_REFRESH_MS = 60_000
