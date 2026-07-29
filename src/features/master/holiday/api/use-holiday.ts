import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchHoliday } from './holiday-api'

/** GET /holidays/:id — a single holiday record. */
export function useHoliday(id: number) {
  return useQuery({
    queryKey: queryKeys.holiday.detail(id),
    queryFn: () => fetchHoliday(id),
    enabled: Number.isFinite(id),
  })
}
