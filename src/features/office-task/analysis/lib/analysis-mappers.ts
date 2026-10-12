import { formatDate } from '@/lib/utils'
import type {
  ProjectAnalysisResponse,
  ProjectDayResponse,
  ProjectEmployeeResponse,
  ProjectTaskResponse,
  SopAnalysisResponse,
  SopChecklistResponse,
  SopEmployeeResponse,
  SopRunResponse,
} from '../schemas'
import type {
  ProjectAnalysisSummary,
  ProjectDayPoint,
  ProjectEmployeeAnalysis,
  ProjectTaskRow,
  SopAnalysisSummary,
  SopChecklistBreakdown,
  SopEmployeeAnalysis,
  SopRunRow,
} from '../types'

/** Task Analysis responses -> the screen's camelCase records. */

const toEmployee = (r: SopEmployeeResponse | ProjectEmployeeResponse) => ({
  employeeId: r.employee_id,
  employeeName: r.employee_name,
  employeeCode: r.employee_code,
  departmentName: r.department_name,
})

export const toSopEmployee = (r: SopEmployeeResponse): SopEmployeeAnalysis => ({
  ...toEmployee(r),
  checklists: r.checklists,
  assigned: r.assigned,
  completed: r.completed,
  pending: r.pending,
  pendingApproval: r.pending_approval,
  missed: r.missed,
  late: r.late,
  approved: r.approved,
  rejected: r.rejected,
  workedSeconds: r.worked_seconds,
  completionRate: r.completion_rate,
  onTimeRate: r.on_time_rate,
})

export const toProjectEmployee = (r: ProjectEmployeeResponse): ProjectEmployeeAnalysis => ({
  ...toEmployee(r),
  assigned: r.assigned,
  completed: r.completed,
  inProgress: r.in_progress,
  notStarted: r.not_started,
  pendingApproval: r.pending_approval,
  overdue: r.overdue,
  finishedLate: r.finished_late,
  avgProgress: r.avg_progress,
  updateCompliance: r.update_compliance,
  workedSeconds: r.worked_seconds,
  completionRate: r.completion_rate,
  onTimeRate: r.on_time_rate,
})

export const toSopSummary = (s: SopAnalysisResponse['summary']): SopAnalysisSummary => ({
  employees: s.employees,
  assigned: s.assigned,
  completed: s.completed,
  pending: s.pending,
  missed: s.missed,
  late: s.late,
  workedSeconds: s.worked_seconds,
  completionRate: s.completion_rate,
  onTimeRate: s.on_time_rate,
})

export const toProjectSummary = (s: ProjectAnalysisResponse['summary']): ProjectAnalysisSummary => ({
  employees: s.employees,
  assigned: s.assigned,
  completed: s.completed,
  inProgress: s.in_progress,
  notStarted: s.not_started,
  pendingApproval: s.pending_approval,
  overdue: s.overdue,
  workedSeconds: s.worked_seconds,
  completionRate: s.completion_rate,
  onTimeRate: s.on_time_rate,
})

export const toSopChecklist = (r: SopChecklistResponse): SopChecklistBreakdown => ({
  id: r.id,
  name: r.name,
  runs: r.runs,
  completed: r.completed,
  missed: r.missed,
  late: r.late,
  completionRate: r.completion_rate,
})

export const toSopRun = (r: SopRunResponse): SopRunRow => ({
  id: r.id,
  date: r.date,
  checklist: r.checklist,
  task: r.task,
  slot: r.slot,
  status: r.status,
  submittedAt: r.submitted_at,
  late: r.is_late,
  workedSeconds: r.worked_seconds,
  verdict: r.verdict,
  needsApproval: r.needs_approval,
})

export const toProjectDay = (r: ProjectDayResponse): ProjectDayPoint => ({
  date: r.date,
  label: formatDate(r.date, 'dd MMM'),
  updates: r.updates,
  hours: r.hours,
})

export const toProjectTask = (r: ProjectTaskResponse): ProjectTaskRow => ({
  id: r.id,
  taskId: r.task_id,
  task: r.task,
  priority: r.priority,
  status: r.status,
  startDate: r.start_date,
  deadline: r.deadline,
  completedAt: r.completed_at,
  progress: r.latest_percent,
  workedSeconds: r.worked_seconds,
  updates: r.updates,
  overdue: r.is_overdue,
  finishedLate: r.finished_late,
})

/** "EMP-016 · HR" — whichever of code and department the API sent. */
export const employeeSubtitle = (e: { employeeCode: string | null; departmentName: string | null }) =>
  [e.employeeCode, e.departmentName].filter(Boolean).join(' · ')
