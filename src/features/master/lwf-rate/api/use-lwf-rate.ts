import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLwfRate } from './lwf-rate-api'

/** GET /lwf-rates/:id — a single LWF rate. */
export function useLwfRate(id: number) {
  return useQuery({
    queryKey: queryKeys.lwfRate.detail(id),
    queryFn: () => fetchLwfRate(id),
    enabled: Number.isFinite(id),
  })
}
