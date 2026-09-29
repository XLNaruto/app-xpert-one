import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import type { PageParams, Paginated } from '@/lib/pagination'
import {
  pageQuery,
  requireCompany,
  toOfficeTaskError,
  type Priority,
} from '@/features/office-task/common'
import { PROJECT_TASK_DEFAULT_SORT } from '../constants'
import {
  bulkEditResponseSchema,
  projectTaskListResponseSchema,
  projectTaskResponseSchema,
  projectWorkActivityResponseSchema,
  projectWorkDetailResponseSchema,
  projectWorksResponseSchema,
  type BulkEditPayload,
  type BulkEditValues,
  type ProjectTaskFormValues,
  type ProjectTaskPayload,
} from '../schemas'
import {
  bulkEditToPayload,
  projectTaskToPayload,
  toProjectTaskRow,
  toProjectWorkActivity,
  toProjectWorkDetail,
  toProjectWorkRow,
} from '../lib/project-task-mappers'
import type {
  ProjectTaskFilters,
  ProjectTaskRow,
  ProjectWorkActivity,
  ProjectWorkDetail,
  ProjectWorkRow,
} from '../types'

/**
 * `/user/office-task/project-tasks` — one-off work with a start and a deadline,
 * given to people picked by designation or role. Each assignee has a WORK
 * record (their share). Once anyone has started, part of the task locks
 * (`locked_fields`); once everyone has finished, all of it does.
 */

const { PROJECT_TASKS } = endpoints.OFFICE_TASK

/** GET /project-tasks — rolled-up status filter, deadline-first by default. */
export async function fetchProjectTasks(
  filters: ProjectTaskFilters,
  params: PageParams,
): Promise<Paginated<ProjectTaskRow>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(PROJECT_TASKS.LIST, {
      params: {
        ...pageQuery(params, PROJECT_TASK_DEFAULT_SORT),
        ...(filters.status !== 'all' ? { status: filters.status } : {}),
        ...(filters.priority !== 'all' ? { priority: filters.priority } : {}),
      },
    })
    const { items, total } = projectTaskListResponseSchema.parse(raw)
    return { items: items.map(toProjectTaskRow), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the project tasks.")
  }
}

/** GET /project-tasks/:id — the drawer's record and the detail page's header. */
export async function fetchProjectTask(id: number): Promise<ProjectTaskRow> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(PROJECT_TASKS.GET(id))
    return toProjectTaskRow(projectTaskResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the project task.")
  }
}

/** POST /project-tasks — one pending work record per employee. */
export async function createProjectTask(values: ProjectTaskFormValues): Promise<ProjectTaskRow> {
  try {
    const raw = await http.post<unknown, ProjectTaskPayload>(
      PROJECT_TASKS.POST,
      projectTaskToPayload(values),
    )
    return toProjectTaskRow(projectTaskResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't create the project task.")
  }
}

/**
 * PATCH /project-tasks/:id — checked in order: completed (R13), locked fields
 * (R10, named in `details.fields`), open fields, then the assignee diff (a
 * started person can't be removed, R12). The first failure refuses it all.
 */
export async function updateProjectTask(input: {
  id: number
  values: ProjectTaskFormValues
}): Promise<ProjectTaskRow> {
  try {
    const raw = await http.patch<unknown, ProjectTaskPayload>(
      PROJECT_TASKS.PATCH(input.id),
      projectTaskToPayload(input.values),
    )
    return toProjectTaskRow(projectTaskResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't update the project task.")
  }
}

/** PATCH /project-tasks/:id/priority — allowed after start, not once completed. */
export async function setProjectTaskPriority(input: { id: number; priority: Priority }): Promise<void> {
  try {
    await http.patch<unknown>(PROJECT_TASKS.PRIORITY(input.id), { priority: input.priority })
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't change the priority.")
  }
}

/**
 * PATCH /project-tasks/bulk — all-or-nothing; each refusal names the task that
 * blocked it. Answers how many were changed.
 */
export async function bulkEditProjectTasks(input: {
  ids: number[]
  values: BulkEditValues
}): Promise<number> {
  try {
    const raw = await http.patch<unknown, BulkEditPayload>(
      PROJECT_TASKS.BULK,
      bulkEditToPayload(input.ids, input.values),
    )
    return bulkEditResponseSchema.parse(raw).updated
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't update the selected tasks.")
  }
}

/** DELETE /project-tasks/:id — refused once any assignee started (R9). */
export async function deleteProjectTask(id: number): Promise<void> {
  try {
    await http.delete<unknown>(PROJECT_TASKS.DELETE(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't delete the project task.")
  }
}

/** GET /project-tasks/:id/works — the Employees table; name/code search, name order. */
export async function fetchProjectWorks(
  id: number,
  params: PageParams,
): Promise<Paginated<ProjectWorkRow>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(PROJECT_TASKS.WORKS(id), { params: pageQuery(params) })
    const { items, total } = projectWorksResponseSchema.parse(raw)
    return { items: items.map(toProjectWorkRow), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the assignees.")
  }
}

/** GET /project-tasks/:id/works/:workId — 404 unless the share belongs to the task. */
export async function fetchProjectWork(id: number, workId: number): Promise<ProjectWorkDetail> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(PROJECT_TASKS.WORK(id, workId))
    return toProjectWorkDetail(projectWorkDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load this employee's work.")
  }
}

/** GET …/works/:workId/activity — sessions and progress, merged on screen. */
export async function fetchProjectWorkActivity(
  id: number,
  workId: number,
): Promise<ProjectWorkActivity> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(PROJECT_TASKS.WORK_ACTIVITY(id, workId))
    return toProjectWorkActivity(projectWorkActivityResponseSchema.parse(raw))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the activity.")
  }
}
