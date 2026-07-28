import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLwfRates } from './lwf-rate-api'

/** GET /lwf-rates — every LWF rate, newest effective date first. */
export function useLwfRates() {
  return useQuery({
    queryKey: queryKeys.lwfRate.list(),
    queryFn: fetchLwfRates,
  })
}
