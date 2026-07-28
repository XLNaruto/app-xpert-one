import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchEsicRates } from './esic-rate-api'

/** GET /esic-rates — every ESIC rate slab, newest effective date first. */
export function useEsicRates() {
  return useQuery({
    queryKey: queryKeys.esicRate.list(),
    queryFn: fetchEsicRates,
  })
}
