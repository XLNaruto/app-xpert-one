import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchHolidays } from './holiday-api'

/** GET /holidays — the holiday master list. */
export function useHolidays() {
  return useQuery({
    queryKey: queryKeys.holiday.list(),
    queryFn: fetchHolidays,
  })
}
