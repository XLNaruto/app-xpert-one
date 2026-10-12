import type { Priority, TaskStatus, Verdict } from '@/features/office-task/common'

/** Task Analysis — employee-wise performance on SOP checklists and project work. */

export type AnalysisKind = 'sop' | 'project'

export interface AnalysisFilters {
  /** ISO date — the window the analysis covers, inclusive. */
  from: string
  to: string
  departmentId: string
  employeeId: string
}

/** Who the row is about — both kinds share it. */
interface AnalysisEmployee {
  employeeId: number
  /** The API may send any of these as null. */
  employeeName: string | null
  employeeCode: string | null
  /** The employee's CURRENT department. */
  departmentName: string | null
}

/** One employee's SOP runs in the window. */
export interface SopEmployeeAnalysis extends AnalysisEmployee {
  /** Checklists (templates) assigned to them. */
  checklists: number
  /** Runs due in the window — one per slot per day. */
  assigned: number
  completed: number
  /** Pending + in progress. */
  pending: number
  pendingApproval: number
  /** Runs whose day passed without a hand-in. */
  missed: number
  /** Handed in on a later day than the run's own date, whatever its status now. */
  late: number
  approved: number
  rejected: number
  workedSeconds: number
  /** `completed / assigned`, 0–100. */
  completionRate: number
  /** Completed runs handed in on time, 0–100. */
  onTimeRate: number
}

/** One employee's project work in the window. */
export interface ProjectEmployeeAnalysis extends AnalysisEmployee {
  assigned: number
  completed: number
  inProgress: number
  notStarted: number
  pendingApproval: number
  /** Open work past its deadline. */
  overdue: number
  /** Completed after the deadline. */
  finishedLate: number
  /** Mean latest progress across their open work, 0–100. */
  avgProgress: number
  /** Progress updates posted vs asked for, 0–100. */
  updateCompliance: number
  workedSeconds: number
  completionRate: number
  onTimeRate: number
}

export interface SopAnalysisSummary {
  employees: number
  assigned: number
  completed: number
  pending: number
  missed: number
  late: number
  workedSeconds: number
  completionRate: number
  onTimeRate: number
}

export interface ProjectAnalysisSummary {
  employees: number
  assigned: number
  completed: number
  inProgress: number
  notStarted: number
  pendingApproval: number
  overdue: number
  workedSeconds: number
  completionRate: number
  onTimeRate: number
}

/** A page of employees plus the totals across every page. */
export interface AnalysisPage<T, S> {
  items: T[]
  total: number
  summary: S
}

/** What the detail page opens on — rides in its encrypted `?data=`. */
export interface AnalysisDetailParams {
  id: number
  kind: AnalysisKind
  from: string
  to: string
}

/** One checklist's share of an employee's SOP runs. */
export interface SopChecklistBreakdown {
  /** `null` when the SOP group was deleted since — never key a link on it. */
  id: number | null
  name: string
  runs: number
  completed: number
  missed: number
  late: number
  completionRate: number
}

/** One SOP run, for the detail's task list. */
export interface SopRunRow {
  id: number
  date: string
  checklist: string
  task: string
  /** 1-based slot within the day — an item done 3× a day has slots 1–3. */
  slot: number
  status: TaskStatus
  submittedAt: string | null
  late: boolean
  workedSeconds: number
  verdict: Verdict | null
  needsApproval: boolean
}

/** One project task the employee holds. */
export interface ProjectTaskRow {
  /** The work id. */
  id: number
  taskId: number
  task: string
  priority: Priority
  /** Can be `missed` — rejected with no resubmit; it shows under "All" only. */
  status: TaskStatus
  startDate: string
  deadline: string
  completedAt: string | null
  progress: number
  workedSeconds: number
  updates: number
  overdue: boolean
  finishedLate: boolean
}

/** Per day in the window, for the activity chart. */
export interface ProjectDayPoint {
  date: string
  label: string
  updates: number
  hours: number
}

export interface SopEmployeeDetail {
  summary: SopEmployeeAnalysis
}

/** The detail page's SOP-run tabs — a status, or work handed in late. */
export type SopRunTab = 'all' | 'pending' | 'pending_approval' | 'completed' | 'missed' | 'late'

/** A page of one employee's SOP runs, plus every tab's count. */
export interface SopRunPage {
  items: SopRunRow[]
  total: number
  counts: Record<SopRunTab, number>
}

export interface ProjectEmployeeDetail {
  summary: ProjectEmployeeAnalysis
  daily: ProjectDayPoint[]
}

/** The detail page's project-task tabs — a status, or overdue work. */
export type ProjectTaskTab = 'all' | 'pending' | 'in_progress' | 'pending_approval' | 'completed' | 'overdue'

/** A page of one employee's project tasks, plus every tab's count. */
export interface ProjectTaskPage {
  items: ProjectTaskRow[]
  total: number
  counts: Record<ProjectTaskTab, number>
}
