import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isForbiddenError } from '@/lib/api-error'
import { useOfficeTaskMutation } from '@/features/office-task/common'
import {
  addProjectProgress,
  completeProjectWork,
  completeSopTask,
  fetchMyProjectTasks,
  fetchMySopTasks,
  fetchMyTaskSettings,
  pauseSopTask,
  startProjectWork,
  startSopTask,
} from './my-task-api'

/** A 403 is the server's final answer — don't retry it. */
const retry = (failureCount: number, error: unknown) =>
  !isForbiddenError(error) && failureCount < 2

/**
 * Which buttons the board offers — START_STOP or DIRECT per kind of task. Read
 * when the board opens and re-read with the rest of the office-task tree (a
 * tenant switch, any write, a 409 from a Start the mode now refuses).
 */
export function useMyTaskSettings(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.myTaskSettings(),
    queryFn: fetchMyTaskSettings,
    enabled,
    retry,
  })
}

/**
 * One day's SOP runs. `search` is sent to the server (trimmed; empty means no
 * filter), and the previous result stays on screen while a new term loads.
 */
export function useMySopTasks(date: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.mySopTasks(date, search),
    queryFn: () => fetchMySopTasks(date, search || undefined),
    enabled,
    retry,
    placeholderData: keepPreviousData,
  })
}

/** One day's project shares — searched server-side like the SOP queue. */
export function useMyProjectTasks(date: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.myProjectTasks(date, search),
    queryFn: () => fetchMyProjectTasks(date, search || undefined),
    enabled,
    retry,
    placeholderData: keepPreviousData,
  })
}

export const useStartSopTask = () => useOfficeTaskMutation(startSopTask)
export const usePauseSopTask = () => useOfficeTaskMutation(pauseSopTask)
export const useCompleteSopTask = () => useOfficeTaskMutation(completeSopTask)
export const useStartProjectWork = () => useOfficeTaskMutation(startProjectWork)
export const useAddProjectProgress = () => useOfficeTaskMutation(addProjectProgress)
export const useCompleteProjectWork = () => useOfficeTaskMutation(completeProjectWork)
