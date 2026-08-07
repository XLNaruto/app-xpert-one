import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useWageHeads } from '@/features/master/designation'
import { fetchBulkWageGrid } from './bulk-wage-api'

/**
 * GET /user/designations/wage-structures — the bulk wage grid for one company.
 *
 * Waits on the allowance / deduction master: a row's heads are laid out under
 * the grid's columns by id, so nothing can be mapped until that list is in. The
 * company is the screen's own pick, so the query is disabled until one is
 * chosen and the key carries it — switching companies is a different grid, not
 * a refetch of this one.
 */
export function useBulkWageGrid(companyId: number | null) {
  const { heads, isReady } = useWageHeads()

  return useQuery({
    queryKey: queryKeys.designation.bulkWageGrid(companyId ?? 0),
    queryFn: () => fetchBulkWageGrid(companyId as number, heads),
    enabled: companyId !== null && isReady,
  })
}
