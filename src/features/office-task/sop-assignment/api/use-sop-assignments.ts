import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { useOfficeTaskMutation } from '@/features/office-task/common'
import {
  deleteSopAssignment,
  fetchSopAssignment,
  fetchSopAssignmentItems,
  fetchSopAssignmentRuns,
  fetchSopAssignments,
  startSopAssignment,
  stopSopAssignment,
} from './sop-assignment-api'
import type { SopAssignmentFilters, SopRunRange } from '../types'

export function useSopAssignments(filters: SopAssignmentFilters, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAssignments({ ...filters }, params),
    queryFn: () => fetchSopAssignments(filters, params),
    placeholderData: keepPreviousData,
  })
}

export function useSopAssignment(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAssignment(id ?? 0),
    queryFn: () => fetchSopAssignment(id as number),
    enabled: id !== undefined,
  })
}

export function useSopAssignmentItems(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAssignmentItems(id ?? 0),
    queryFn: () => fetchSopAssignmentItems(id as number),
    enabled: id !== undefined,
  })
}

export function useSopAssignmentRuns(id: number | undefined, range: SopRunRange, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAssignmentRuns(id ?? 0, { ...range }, params),
    queryFn: () => fetchSopAssignmentRuns(id as number, range, params),
    enabled: id !== undefined,
    placeholderData: keepPreviousData,
  })
}

export const useStartSopAssignment = () => useOfficeTaskMutation(startSopAssignment)
export const useStopSopAssignment = () => useOfficeTaskMutation(stopSopAssignment)
export const useDeleteSopAssignment = () => useOfficeTaskMutation(deleteSopAssignment)
