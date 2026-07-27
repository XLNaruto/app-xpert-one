import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchBranches } from './branch-api'

/** GET /branches — the full branch master list. */
export function useBranches() {
  return useQuery({
    queryKey: queryKeys.branch.list(),
    queryFn: fetchBranches,
  })
}
