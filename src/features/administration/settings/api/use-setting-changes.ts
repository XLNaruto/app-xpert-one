import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchSettingChanges } from './company-settings-api'
import type { SettingChangeFilters } from '../types'

/**
 * GET /user/company-settings/changes — one page of the company's settings
 * history. Pass the params from `usePagination()`; the filters go server-side.
 */
export function useSettingChanges(
  companyId: number | null,
  params: PageParams,
  filters: SettingChangeFilters,
) {
  return useQuery({
    queryKey: queryKeys.companySettings.changes(companyId ?? 0, params, filters),
    queryFn: () => fetchSettingChanges(companyId as number, params, filters),
    enabled: companyId !== null,
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
