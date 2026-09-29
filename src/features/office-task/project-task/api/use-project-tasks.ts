import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { useOfficeTaskMutation } from '@/features/office-task/common'
import {
  bulkEditProjectTasks,
  createProjectTask,
  deleteProjectTask,
  fetchProjectTask,
  fetchProjectTasks,
  fetchProjectWork,
  fetchProjectWorkActivity,
  fetchProjectWorks,
  setProjectTaskPriority,
  updateProjectTask,
} from './project-task-api'
import type { ProjectTaskFilters } from '../types'

export function useProjectTasks(filters: ProjectTaskFilters, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectTasks({ ...filters }, params),
    queryFn: () => fetchProjectTasks(filters, params),
    placeholderData: keepPreviousData,
  })
}

export function useProjectTask(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectTask(id ?? 0),
    queryFn: () => fetchProjectTask(id as number),
    enabled: id !== undefined,
  })
}

export function useProjectWorks(id: number | undefined, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectWorks(id ?? 0, params),
    queryFn: () => fetchProjectWorks(id as number, params),
    enabled: id !== undefined,
    placeholderData: keepPreviousData,
  })
}

export function useProjectWork(id: number | undefined, workId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectWork(id ?? 0, workId ?? 0),
    queryFn: () => fetchProjectWork(id as number, workId as number),
    enabled: id !== undefined && workId !== undefined,
  })
}

export function useProjectWorkActivity(id: number | undefined, workId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectWorkActivity(id ?? 0, workId ?? 0),
    queryFn: () => fetchProjectWorkActivity(id as number, workId as number),
    enabled: id !== undefined && workId !== undefined,
  })
}

export const useCreateProjectTask = () => useOfficeTaskMutation(createProjectTask)
export const useUpdateProjectTask = () => useOfficeTaskMutation(updateProjectTask)
export const useSetProjectTaskPriority = () => useOfficeTaskMutation(setProjectTaskPriority)
export const useBulkEditProjectTasks = () => useOfficeTaskMutation(bulkEditProjectTasks)
export const useDeleteProjectTask = () => useOfficeTaskMutation(deleteProjectTask)
