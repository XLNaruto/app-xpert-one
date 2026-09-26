import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchHolidays } from './holiday-api'

/**
 * GET /holidays — the holiday master list.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns and history panels.
 * `accountingYear` (`2026-27`) narrows it to one financial year.
 */
export function useHolidays(params: PageParams = ALL_ROWS, accountingYear?: string) {
  return useQuery({
    queryKey: queryKeys.holiday.list(params, accountingYear),
    queryFn: () => fetchHolidays(params, accountingYear),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
