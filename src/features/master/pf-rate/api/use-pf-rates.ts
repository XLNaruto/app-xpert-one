import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPfRates } from './pf-rate-api'

/** GET /pf-rates — every PF rate slab, newest effective date first. */
export function usePfRates() {
  return useQuery({
    queryKey: queryKeys.pfRate.list(),
    queryFn: fetchPfRates,
  })
}
