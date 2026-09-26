import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchHolidayReminder } from './holiday-api'

/**
 * GET /user/dashboard/holiday-reminder — the dashboard banner. There is no
 * dismiss endpoint: the banner disappears once every named company has a
 * holiday in the year, which any holiday write picks up (the key sits under
 * `holiday.all`).
 */
export function useHolidayReminder(companyIds?: number[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.holiday.reminder(companyIds),
    queryFn: ({ signal }) => fetchHolidayReminder(companyIds, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
