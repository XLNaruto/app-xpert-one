import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDesignations } from './designation-api'

/** GET /designations — the designation master list. */
export function useDesignations() {
  return useQuery({
    queryKey: queryKeys.designation.list(),
    queryFn: fetchDesignations,
  })
}
