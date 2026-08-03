import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchBranch } from './branch-api'

/** GET /user/branches/:id — a single branch record. */
export function useBranch(id: number) {
  return useQuery({
    queryKey: queryKeys.branch.detail(id),
    queryFn: () => fetchBranch(id),
    enabled: Number.isFinite(id),
  })
}
