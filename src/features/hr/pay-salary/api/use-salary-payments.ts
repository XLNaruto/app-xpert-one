import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchSalaryPayments } from './pay-salary-api'
import type { PaySalaryFilters } from '../schemas'

/**
 * GET /user/salary/payments — one page of the tab on screen.
 *
 * Everything that selects the read is in the key, the tab included: unpaid and
 * paid are different reads split in SQL, not two views of one answer, so
 * switching tabs must not show one under the other's heading.
 *
 * `keepPreviousData` keeps the current page up while the next one loads, so the
 * table doesn't collapse to skeletons between pages — and the totals tiles above
 * it don't flash to zero.
 */
export function useSalaryPayments(
  filters: PaySalaryFilters,
  params: PageParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.salary.payments({ ...filters }, params),
    queryFn: () => fetchSalaryPayments(filters, params),
    enabled,
    placeholderData: keepPreviousData,
  })
}
