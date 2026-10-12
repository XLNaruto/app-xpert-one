import { shiftIso, todayIso } from '@/features/office-task/common'
import type { AnalysisFilters, ProjectTaskTab, SopRunTab } from './types'

/** Sortable columns, named the way the endpoint will name them. */
export const ANALYSIS_SORT = {
  employeeName: 'employee_name',
  assigned: 'assigned',
  completed: 'completed',
  completionRate: 'completion_rate',
  onTimeRate: 'on_time_rate',
  workedSeconds: 'worked_seconds',
} as const

export const ANALYSIS_DEFAULT_SORT = { id: ANALYSIS_SORT.completionRate, desc: true }

/** The last 30 days — enough runs for the rates to mean something. */
export const defaultAnalysisFilters = (): AnalysisFilters => ({
  from: shiftIso(todayIso(), -29),
  to: todayIso(),
  departmentId: '',
  employeeId: '',
})

/** The employee detail's project-task tabs, in the order work moves through them. */
export const PROJECT_TASK_TABS: { value: ProjectTaskTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_approval', label: 'Awaiting Approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
]

/** The employee detail's SOP-run tabs. */
export const SOP_RUN_TABS: { value: SopRunTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_approval', label: 'Awaiting Approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'late', label: 'Late' },
]
