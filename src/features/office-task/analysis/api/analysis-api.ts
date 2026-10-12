import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import type { PageParams, Paginated } from '@/lib/pagination'
import { pageQuery, requireCompany, toOfficeTaskError } from '@/features/office-task/common'
import { ANALYSIS_DEFAULT_SORT } from '../constants'
import {
  projectAnalysisResponseSchema,
  projectEmployeeDetailResponseSchema,
  projectTasksResponseSchema,
  sopAnalysisResponseSchema,
  sopChecklistsResponseSchema,
  sopEmployeeResponseSchema,
  sopRunsResponseSchema,
} from '../schemas'
import {
  toProjectDay,
  toProjectEmployee,
  toProjectSummary,
  toProjectTask,
  toSopChecklist,
  toSopEmployee,
  toSopRun,
  toSopSummary,
} from '../lib/analysis-mappers'
import type {
  AnalysisFilters,
  AnalysisPage,
  ProjectAnalysisSummary,
  ProjectEmployeeAnalysis,
  ProjectEmployeeDetail,
  ProjectTaskPage,
  ProjectTaskTab,
  SopAnalysisSummary,
  SopChecklistBreakdown,
  SopEmployeeAnalysis,
  SopEmployeeDetail,
  SopRunPage,
  SopRunTab,
} from '../types'

/**
 * Task Analysis — `/user/office-task/analysis`. Read-only rollups of SOP runs
 * and project works per employee over a `from`–`to` window (≤ 366 days). Only
 * employees with something in the window are rows; panel users never are.
 * An employee outside the active company answers 404 on the detail routes.
 */

const { ANALYSIS } = endpoints.OFFICE_TASK

/** The window — every endpoint requires it. */
const windowQuery = (filters: Pick<AnalysisFilters, 'from' | 'to'>) => ({ from: filters.from, to: filters.to })

function listQuery(filters: AnalysisFilters, params: PageParams) {
  return {
    ...pageQuery(params, ANALYSIS_DEFAULT_SORT),
    ...windowQuery(filters),
    ...(filters.departmentId ? { department_id: Number(filters.departmentId) } : {}),
    ...(filters.employeeId ? { employee_id: Number(filters.employeeId) } : {}),
  }
}

/** GET /analysis/sop — one row per employee with SOP runs in the window. */
export async function fetchSopAnalysis(
  filters: AnalysisFilters,
  params: PageParams,
): Promise<AnalysisPage<SopEmployeeAnalysis, SopAnalysisSummary>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.SOP, { params: listQuery(filters, params) })
    const { items, total, summary } = sopAnalysisResponseSchema.parse(raw)
    return { items: items.map(toSopEmployee), total, summary: toSopSummary(summary) }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the SOP analysis.")
  }
}

/** GET /analysis/project — one row per employee with project work in the window. */
export async function fetchProjectAnalysis(
  filters: AnalysisFilters,
  params: PageParams,
): Promise<AnalysisPage<ProjectEmployeeAnalysis, ProjectAnalysisSummary>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.PROJECT, { params: listQuery(filters, params) })
    const { items, total, summary } = projectAnalysisResponseSchema.parse(raw)
    return { items: items.map(toProjectEmployee), total, summary: toProjectSummary(summary) }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the project analysis.")
  }
}

/** GET /analysis/sop/:employee_id — the SOP rollup for one employee (all zeros when idle). */
export async function fetchSopEmployeeDetail(
  employeeId: number,
  filters: Pick<AnalysisFilters, 'from' | 'to'>,
): Promise<SopEmployeeDetail> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.SOP_EMPLOYEE(employeeId), { params: windowQuery(filters) })
    return { summary: toSopEmployee(sopEmployeeResponseSchema.parse(raw)) }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load this employee's analysis.")
  }
}

/** GET /analysis/sop/:employee_id/checklists — a page of their checklists, name A–Z. */
export async function fetchSopEmployeeChecklists(
  employeeId: number,
  filters: Pick<AnalysisFilters, 'from' | 'to'>,
  params: PageParams,
): Promise<Paginated<SopChecklistBreakdown>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.SOP_CHECKLISTS(employeeId), {
      params: { ...pageQuery(params), ...windowQuery(filters) },
    })
    const { items, total } = sopChecklistsResponseSchema.parse(raw)
    return { items: items.map(toSopChecklist), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the checklists.")
  }
}

/** GET /analysis/sop/:employee_id/runs — one tab of their runs, newest first, with every tab's count. */
export async function fetchSopEmployeeRuns(
  employeeId: number,
  filters: Pick<AnalysisFilters, 'from' | 'to'>,
  tab: SopRunTab,
  params: PageParams,
): Promise<SopRunPage> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.SOP_RUNS(employeeId), {
      params: { ...pageQuery(params), ...windowQuery(filters), tab },
    })
    const { items, total, counts } = sopRunsResponseSchema.parse(raw)
    return { items: items.map(toSopRun), total, counts }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the SOP tasks.")
  }
}

/** GET /analysis/project/:employee_id — the project rollup plus one point per day. */
export async function fetchProjectEmployeeDetail(
  employeeId: number,
  filters: Pick<AnalysisFilters, 'from' | 'to'>,
): Promise<ProjectEmployeeDetail> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.PROJECT_EMPLOYEE(employeeId), { params: windowQuery(filters) })
    const { summary, daily } = projectEmployeeDetailResponseSchema.parse(raw)
    return { summary: toProjectEmployee(summary), daily: daily.map(toProjectDay) }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load this employee's analysis.")
  }
}

/** GET /analysis/project/:employee_id/tasks — one tab of their works, deadline first, with every tab's count. */
export async function fetchProjectEmployeeTasks(
  employeeId: number,
  filters: Pick<AnalysisFilters, 'from' | 'to'>,
  tab: ProjectTaskTab,
  params: PageParams,
): Promise<ProjectTaskPage> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(ANALYSIS.PROJECT_TASKS(employeeId), {
      params: { ...pageQuery(params), ...windowQuery(filters), tab },
    })
    const { items, total, counts } = projectTasksResponseSchema.parse(raw)
    return { items: items.map(toProjectTask), total, counts }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the project tasks.")
  }
}
