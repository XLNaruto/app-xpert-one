import { toProgressNote, toProofs, toVerdict } from '@/features/office-task/common'
import type { MyProjectTaskResponse } from '../schemas'
import type { MyProjectRow } from '../types'

export function toMyProjectRow(r: MyProjectTaskResponse): MyProjectRow {
  return {
    ...toVerdict(r),
    id: r.id,
    taskId: r.task_id,
    task: r.task,
    description: r.description ?? '',
    priority: r.priority,
    startDate: r.start_date,
    deadline: r.deadline,
    updatesPerDay: r.updates_per_day,
    updateFrequency: r.update_frequency ?? 'daily',
    updatesToday: r.updates_today,
    updatesThisPeriod: r.updates_this_period ?? r.updates_today,
    onBehalfOf: r.on_behalf_of
      ? {
          taskOtherId: r.on_behalf_of.task_other_id,
          fullName: r.on_behalf_of.full_name,
          mobileNumber: r.on_behalf_of.mobile_number ?? '',
        }
      : null,
    photoRequired: r.photo_required,
    needsVerification: r.needs_verification,
    status: r.status,
    latestPercent: r.latest_percent,
    runningSince: r.running_since,
    workedSeconds: r.worked_seconds,
    startedAt: r.started_at,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at,
    note: r.note ?? '',
    proof: toProofs(r.proof),
    progress: (r.progress ?? []).map(toProgressNote),
  }
}
