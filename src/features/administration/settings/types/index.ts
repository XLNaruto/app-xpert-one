import type { TaskSubmissionMode } from '@/features/office-task/common'

/** One company's behaviour switches, as the Settings screen reads them. */
export interface CompanySettings {
  companyId: number
  sopTaskSubmission: TaskSubmissionMode
  projectTaskSubmission: TaskSubmissionMode
}
