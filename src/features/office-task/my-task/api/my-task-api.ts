import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import {
  requireCompany,
  toOfficeTaskError,
  toSopTask,
  uploadProofFiles,
} from '@/features/office-task/common'
import {
  handInResponseSchema,
  myProjectTasksResponseSchema,
  mySopTasksResponseSchema,
} from '../schemas'
import { toMyProjectRow } from '../lib/my-task-mappers'
import type { HandInInput, HandInStatus, MyProjectRow, MySopRow, ProgressInput } from '../types'

/**
 * `/user/office-task/my-tasks` — the signed-in login's OWN board: work given to
 * them as a panel user (role picks) plus work given to the employee their login
 * is linked to (designation picks). Whose board it is comes from the session,
 * never a parameter.
 *
 * ONE clock at a time across SOP runs and project shares: starting anything
 * while something else runs is a 409 that names the running task.
 */

const { MY_TASKS } = endpoints.OFFICE_TASK

// ── SOP ───────────────────────────────────────────────────────────────────

/** GET /my-tasks/sop?date= — past days as they settled, today's generated, future empty. */
export async function fetchMySopTasks(date: string): Promise<MySopRow[]> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(MY_TASKS.SOP, { params: { date } })
    return mySopTasksResponseSchema.parse(raw).items.map(toSopTask)
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load your SOP tasks.")
  }
}

/** POST /my-tasks/sop/:id/start — only today's; a rejected run can be restarted. */
export async function startSopTask(id: number): Promise<void> {
  try {
    await http.post<unknown>(MY_TASKS.SOP_START(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't start the task.")
  }
}

/** POST /my-tasks/sop/:id/pause — no day check, so a run left across midnight still pauses. */
export async function pauseSopTask(id: number): Promise<void> {
  try {
    await http.post<unknown>(MY_TASKS.SOP_PAUSE(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't pause the task.")
  }
}

/**
 * POST /my-tasks/sop/:id/complete — the proof goes up first (presign + PUT),
 * then the hand-in sends only `{ key, name }` per file. A note is required.
 */
export async function completeSopTask(input: HandInInput): Promise<HandInStatus> {
  try {
    const proof = await uploadProofFiles(input.files)
    const raw = await http.post<unknown>(MY_TASKS.SOP_COMPLETE(input.id), {
      note: input.note.trim(),
      proof,
    })
    return handInResponseSchema.parse(raw).status
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't hand the task in.")
  }
}

// ── Project ───────────────────────────────────────────────────────────────

/**
 * GET /my-tasks/project?date= — shares live on that day: started by then, and
 * still open or finished on/after it. `worked_seconds` is FINISHED sessions only.
 */
export async function fetchMyProjectTasks(date: string): Promise<MyProjectRow[]> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(MY_TASKS.PROJECT, { params: { date } })
    return myProjectTasksResponseSchema.parse(raw).items.map(toMyProjectRow)
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load your project tasks.")
  }
}

/** POST /my-tasks/project/:workId/start — start or resume the clock. */
export async function startProjectWork(id: number): Promise<void> {
  try {
    await http.post<unknown>(MY_TASKS.PROJECT_START(id))
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't start the task.")
  }
}

/**
 * POST /my-tasks/project/:workId/progress — a progress note; with `stop` it
 * also closes the running session at the same instant. There is no bare stop.
 */
export async function addProjectProgress(input: ProgressInput): Promise<void> {
  try {
    const photos = await uploadProofFiles(input.files)
    await http.post<unknown>(MY_TASKS.PROJECT_PROGRESS(input.id), {
      percent: Math.round(input.percent),
      note: input.note.trim(),
      photos,
      stop: !!input.stop,
    })
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't save the progress.")
  }
}

/** POST /my-tasks/project/:workId/complete — the note is optional here. */
export async function completeProjectWork(input: HandInInput): Promise<HandInStatus> {
  try {
    const proof = await uploadProofFiles(input.files)
    const raw = await http.post<unknown>(MY_TASKS.PROJECT_COMPLETE(input.id), {
      note: input.note.trim(),
      proof,
    })
    return handInResponseSchema.parse(raw).status
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't hand the task in.")
  }
}
