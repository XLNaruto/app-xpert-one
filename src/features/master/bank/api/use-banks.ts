import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchBanks } from './bank-api'

/**
 * GET /user/banks — the whole master in one query, for screens that have to
 * *label* a stored `bank_id` rather than pick one.
 *
 * The employee list shows a Bank Name column for a page of rows: reading each
 * bank by id would be a request per distinct bank, per page. The master is a few
 * hundred rows and never changes during a session, so it's pulled once and
 * cached — pickers still use the scroll-lazy `useBanksInfinite`.
 */
export function useBanks() {
  return useQuery({
    queryKey: queryKeys.bank.list(),
    queryFn: () => fetchBanks(),
  })
}
