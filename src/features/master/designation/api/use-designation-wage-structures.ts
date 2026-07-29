import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDesignationWageStructures } from './designation-wage-api'

/** GET /designations/:id/wage-structures — the history, most recent first. */
export function useDesignationWageStructures(designationId: number) {
  return useQuery({
    queryKey: queryKeys.designation.wageStructures(designationId),
    queryFn: () => fetchDesignationWageStructures(designationId),
    enabled: Number.isFinite(designationId),
  })
}
