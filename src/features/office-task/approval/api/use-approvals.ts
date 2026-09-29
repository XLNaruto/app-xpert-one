import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { useOfficeTaskMutation } from '@/features/office-task/common'
import {
  decideProject,
  decideSop,
  fetchProjectApprovals,
  fetchSopApprovals,
} from './approval-api'
import type { ApprovalFilters } from '../types'

export function useSopApprovals(filters: ApprovalFilters, params: PageParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopApprovals({ ...filters }, params),
    queryFn: () => fetchSopApprovals(filters, params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useProjectApprovals(
  filters: ApprovalFilters,
  params: PageParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectApprovals({ ...filters }, params),
    queryFn: () => fetchProjectApprovals(filters, params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export const useDecideSop = () => useOfficeTaskMutation(decideSop)
export const useDecideProject = () => useOfficeTaskMutation(decideProject)
