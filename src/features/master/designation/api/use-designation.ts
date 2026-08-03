import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDesignation } from './designation-api'

/**
 * GET /user/designations/:id — one designation: the title plus the wage
 * structure in force and the heads it was saved with.
 */
export function useDesignation(id: number) {
  return useQuery({
    queryKey: queryKeys.designation.detail(id),
    queryFn: () => fetchDesignation(id),
    enabled: Number.isFinite(id),
  })
}
