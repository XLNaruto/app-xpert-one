/**
 * Office Task — what every module shares: the response schemas and mappers, the
 * request plumbing, the employee picker and proof upload, the status / proof /
 * progress pieces and the date helpers.
 */
export {
  requireCompany,
  pageQuery,
  toOfficeTaskError,
  isStaleRowError,
  OFFICE_TASK_MAX_LIMIT,
  TASK_STARTED_CODE,
} from './api/office-task-request'
export { uploadProofFiles, type EmployeePickerFilter } from './api/office-task-api'
export { useOfficeTaskMutation } from './api/use-office-task-mutation'
export { useOfficeTaskEmployeeSelect, personHint } from './hooks/use-office-task-employee-select'
export {
  toAudit,
  toProof,
  toProofs,
  toVerdict,
  toSopItem,
  toSopTask,
  toProgressNote,
  toWorkSession,
  targetPayload,
  assigneeKindOf,
} from './lib/office-task-mappers'
export * from './schemas'
export {
  todayIso,
  shiftIso,
  daysBetween,
  eachIso,
  dayLabel,
  frequencyLabel,
  formatStopwatch,
  formatClock,
  formatDuration,
  deadlineInfo,
  localDateOf,
} from './lib/task-dates'
export { useNow } from './hooks/use-now'
export {
  TaskStatusBadge,
  VerdictBadge,
  PriorityBadge,
  RuleIcons,
} from './components/task-badges'
export { ProofStrip } from './components/proof-strip'
export { ProofUploader } from './components/proof-uploader'
export { WorkSessionLog } from './components/work-session-log'
export { proofKind, formatFileSize } from './lib/proof-kind'
export { ProgressTimeline, ProgressBar } from './components/progress-timeline'
export { PeopleChips } from './components/people-chips'
export * from './constants'
export type * from './types'
