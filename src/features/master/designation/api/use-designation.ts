import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDesignation } from './designation-api'

/** GET /designations/:id — a single designation record. */
export function useDesignation(id: number) {
  return useQuery({
    queryKey: queryKeys.designation.detail(id),
    queryFn: () => fetchDesignation(id),
    enabled: Number.isFinite(id),
  })
}
