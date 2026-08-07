import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchSalaryRegister } from './salary-api'
import type { SalaryRegisterFilters } from '../schemas'

/**
 * GET /user/salary/register — the month's register for one designation.
 *
 * Disabled until a designation is picked. The grid's columns are that
 * designation's allowance and deduction heads, so a company-wide read would
 * either open a column for every head in the company or show rows under headings
 * that aren't theirs — which is why the screen asks for the designation first.
 *
 * Everything that selects the register is in the key (company, period,
 * designation, side, page, search term), so switching any of them is a different
 * register rather than a refetch of this one. `keepPreviousData` keeps the
 * current page on screen while the next one loads, so the grid doesn't collapse
 * to a spinner between pages.
 */
export function useSalaryRegister(
  filters: SalaryRegisterFilters,
  params: PageParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.salary.register({ ...filters }, params),
    queryFn: () => fetchSalaryRegister(filters, params),
    enabled,
    placeholderData: keepPreviousData,
  })
}
