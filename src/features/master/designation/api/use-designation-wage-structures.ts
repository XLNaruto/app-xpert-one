import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDesignationWageStructures } from './designation-wage-api'
import { useWageHeads } from './use-wage-heads'

/**
 * GET /user/designations/:id/wage-structures — the version history, most recent
 * effective month first.
 *
 * Waits on the pay-component catalog: a version's heads come back as ids, and
 * without the catalog there's nothing to render them under.
 */
export function useDesignationWageStructures(designationId: number) {
  const { heads, isReady, isLoading } = useWageHeads()

  const query = useQuery({
    queryKey: queryKeys.designation.wageStructures(designationId),
    queryFn: () => fetchDesignationWageStructures(designationId, heads),
    /* `> 0` rather than merely finite: callers stand in a `0` for "no
       designation picked yet", and that would otherwise read a history for it. */
    enabled: Number.isFinite(designationId) && designationId > 0 && isReady,
  })

  // While the catalog loads the query is disabled, which reads as idle rather
  // than pending — the screen is still waiting, so say so.
  return { ...query, isLoading: query.isLoading || isLoading }
}
