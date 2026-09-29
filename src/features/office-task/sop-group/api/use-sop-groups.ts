import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { useOfficeTaskMutation } from '@/features/office-task/common'
import {
  createSopGroup,
  deleteCustomTask,
  deleteSopGroup,
  deleteSopGroupItem,
  fetchSopGroup,
  fetchSopGroupAssignees,
  fetchSopGroupOptions,
  fetchSopGroups,
  removeSopGroupAssignee,
  saveSopGroupAssignees,
  updateSopGroup,
} from './sop-group-api'

/** One page of SOP groups. */
export function useSopGroups(params: PageParams) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopGroups(params),
    queryFn: () => fetchSopGroups(params),
    placeholderData: keepPreviousData,
  })
}

/** Every group as `{ id, name }` — filters and pickers. */
export function useSopGroupOptions() {
  return useQuery({
    queryKey: queryKeys.officeTask.sopGroupOptions(),
    queryFn: fetchSopGroupOptions,
  })
}

export function useSopGroup(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopGroup(id ?? 0),
    queryFn: () => fetchSopGroup(id as number),
    enabled: id !== undefined,
  })
}

export function useSopGroupAssignees(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopGroupAssignees(id ?? 0),
    queryFn: () => fetchSopGroupAssignees(id as number),
    enabled: id !== undefined,
  })
}

export const useCreateSopGroup = () => useOfficeTaskMutation(createSopGroup)
export const useUpdateSopGroup = () => useOfficeTaskMutation(updateSopGroup)
export const useDeleteSopGroup = () => useOfficeTaskMutation(deleteSopGroup)
export const useDeleteSopGroupItem = () => useOfficeTaskMutation(deleteSopGroupItem)
export const useSaveSopGroupAssignees = () => useOfficeTaskMutation(saveSopGroupAssignees)
export const useRemoveSopGroupAssignee = () => useOfficeTaskMutation(removeSopGroupAssignee)
export const useDeleteCustomTask = () => useOfficeTaskMutation(deleteCustomTask)
