import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { useWageHeads } from '@/features/master/designation'
import { fetchBulkWageHistory } from './bulk-wage-api'

/**
 * GET /user/designations/wage-structures/history — every designation of one
 * company with every wage version behind it, a page of designations at a time.
 *
 * Waits on the allowance / deduction master for the same reason the grid does: a
 * version's heads come back as ids, and the columns they sit under are that
 * master's. The company and the page params both ride in the key — a different
 * tenant or a different page is a different result set, not a refetch of this
 * one — and the previous page is kept on screen while the next one loads, so
 * paging a grid this wide doesn't blank it out.
 */
export function useBulkWageHistory(companyId: number | null, params: PageParams) {
  const { heads, isReady, isLoading } = useWageHeads()

  const query = useQuery({
    queryKey: queryKeys.designation.bulkWageHistory(companyId ?? 0, params),
    queryFn: () => fetchBulkWageHistory(companyId as number, params, heads),
    enabled: companyId !== null && isReady,
    placeholderData: keepPreviousData,
  })

  // While the master loads the query is disabled, which reads as idle rather
  // than pending — the screen is still waiting, so say so.
  return { ...query, isLoading: query.isLoading || isLoading }
}
