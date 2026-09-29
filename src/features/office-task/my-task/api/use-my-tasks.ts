import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isForbiddenError } from '@/lib/api-error'
import { useOfficeTaskMutation } from '@/features/office-task/common'
import {
  addProjectProgress,
  completeProjectWork,
  completeSopTask,
  fetchMyProjectTasks,
  fetchMySopTasks,
  pauseSopTask,
  startProjectWork,
  startSopTask,
} from './my-task-api'

/** A 403 is the server's final answer — don't retry it. */
const retry = (failureCount: number, error: unknown) =>
  !isForbiddenError(error) && failureCount < 2

export function useMySopTasks(date: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.mySopTasks(date),
    queryFn: () => fetchMySopTasks(date),
    enabled,
    retry,
  })
}

export function useMyProjectTasks(date: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.myProjectTasks(date),
    queryFn: () => fetchMyProjectTasks(date),
    enabled,
    retry,
  })
}

export const useStartSopTask = () => useOfficeTaskMutation(startSopTask)
export const usePauseSopTask = () => useOfficeTaskMutation(pauseSopTask)
export const useCompleteSopTask = () => useOfficeTaskMutation(completeSopTask)
export const useStartProjectWork = () => useOfficeTaskMutation(startProjectWork)
export const useAddProjectProgress = () => useOfficeTaskMutation(addProjectProgress)
export const useCompleteProjectWork = () => useOfficeTaskMutation(completeProjectWork)
