import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPtRates } from './pt-rate-api'

/** GET /pt-rates — every PT rate, newest effective date first. */
export function usePtRates() {
  return useQuery({
    queryKey: queryKeys.ptRate.list(),
    queryFn: fetchPtRates,
  })
}
