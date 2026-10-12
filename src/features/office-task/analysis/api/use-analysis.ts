import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import {
  fetchProjectAnalysis,
  fetchProjectEmployeeDetail,
  fetchProjectEmployeeTasks,
  fetchSopAnalysis,
  fetchSopEmployeeChecklists,
  fetchSopEmployeeDetail,
  fetchSopEmployeeRuns,
} from './analysis-api'
import type { AnalysisFilters, ProjectTaskTab, SopRunTab } from '../types'

export function useSopAnalysis(filters: AnalysisFilters, params: PageParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAnalysis({ ...filters }, params),
    queryFn: () => fetchSopAnalysis(filters, params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useProjectAnalysis(filters: AnalysisFilters, params: PageParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectAnalysis({ ...filters }, params),
    queryFn: () => fetchProjectAnalysis(filters, params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** The detail page's window — just the dates; department / employee don't apply to one person. */
type Range = Pick<AnalysisFilters, 'from' | 'to'>

export function useSopEmployeeDetail(employeeId: number | undefined, range: Range, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAnalysisEmployee(employeeId ?? 0, { ...range }),
    queryFn: () => fetchSopEmployeeDetail(employeeId!, range),
    placeholderData: keepPreviousData,
    enabled: enabled && !!employeeId,
  })
}

export function useProjectEmployeeDetail(employeeId: number | undefined, range: Range, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectAnalysisEmployee(employeeId ?? 0, { ...range }),
    queryFn: () => fetchProjectEmployeeDetail(employeeId!, range),
    placeholderData: keepPreviousData,
    enabled: enabled && !!employeeId,
  })
}

export function useProjectEmployeeTasks(
  employeeId: number | undefined,
  range: Range,
  tab: ProjectTaskTab,
  params: PageParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.officeTask.projectAnalysisTasks(employeeId ?? 0, { ...range, tab }, params),
    queryFn: () => fetchProjectEmployeeTasks(employeeId!, range, tab, params),
    placeholderData: keepPreviousData,
    enabled: enabled && !!employeeId,
  })
}

export function useSopEmployeeRuns(
  employeeId: number | undefined,
  range: Range,
  tab: SopRunTab,
  params: PageParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAnalysisRuns(employeeId ?? 0, { ...range, tab }, params),
    queryFn: () => fetchSopEmployeeRuns(employeeId!, range, tab, params),
    placeholderData: keepPreviousData,
    enabled: enabled && !!employeeId,
  })
}

export function useSopEmployeeChecklists(
  employeeId: number | undefined,
  range: Range,
  params: PageParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.officeTask.sopAnalysisChecklists(employeeId ?? 0, { ...range }, params),
    queryFn: () => fetchSopEmployeeChecklists(employeeId!, range, params),
    placeholderData: keepPreviousData,
    enabled: enabled && !!employeeId,
  })
}
