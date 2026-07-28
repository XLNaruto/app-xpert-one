import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchEsicRate } from './esic-rate-api'

/** GET /esic-rates/:id — a single ESIC rate slab. */
export function useEsicRate(id: number) {
  return useQuery({
    queryKey: queryKeys.esicRate.detail(id),
    queryFn: () => fetchEsicRate(id),
    enabled: Number.isFinite(id),
  })
}
