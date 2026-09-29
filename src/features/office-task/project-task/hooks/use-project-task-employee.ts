import { useNavigate } from '@tanstack/react-router'
import { encryptId } from '@/lib/crypto'
import { useProjectTask, useProjectWork, useProjectWorkActivity } from '../api/use-project-tasks'

/**
 * One assignee's work on one project task: the share's summary, its raw
 * activity (merged into the timeline on screen), and the task for its rules.
 */
export function useProjectTaskEmployee(taskId?: number, workId?: number) {
  const navigate = useNavigate()
  const task = useProjectTask(taskId)
  const work = useProjectWork(taskId, workId)
  const activity = useProjectWorkActivity(taskId, workId)

  return {
    task: task.data,
    work: work.data,
    activity: activity.data,
    isLoading: taskId !== undefined && (task.isLoading || work.isLoading),
    activityLoading: activity.isLoading,
    notFound: taskId === undefined || workId === undefined || task.isError || work.isError,
    error: work.error ?? task.error,
    goBack: () =>
      taskId === undefined
        ? navigate({ to: '/office-task/project-task' })
        : navigate({ to: '/office-task/project-task/detail', search: { data: encryptId(taskId) } }),
  }
}
