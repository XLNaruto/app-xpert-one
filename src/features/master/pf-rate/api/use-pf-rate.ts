import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPfRate } from './pf-rate-api'

/** GET /user/pf-rates/:id — a single PF rate slab. */
export function usePfRate(id: number) {
  return useQuery({
    queryKey: queryKeys.pfRate.detail(id),
    queryFn: () => fetchPfRate(id),
    enabled: Number.isFinite(id),
  })
}
