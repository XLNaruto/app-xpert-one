import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPtRate } from './pt-rate-api'

/** GET /pt-rates/:id — a single PT rate with its slabs. */
export function usePtRate(id: number) {
  return useQuery({
    queryKey: queryKeys.ptRate.detail(id),
    queryFn: () => fetchPtRate(id),
    enabled: Number.isFinite(id),
  })
}
