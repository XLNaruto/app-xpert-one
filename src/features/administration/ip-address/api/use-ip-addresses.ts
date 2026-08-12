import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchIpAddresses } from './ip-address-api'
import type { IpAddressType } from '../schemas'

/**
 * GET /user/ip-addresses — the company's allow/block entries, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. `type` narrows
 * to one list server-side. Called with no arguments it returns every entry.
 */
export function useIpAddresses(
  params: PageParams = ALL_ROWS,
  type?: IpAddressType,
) {
  return useQuery({
    queryKey: queryKeys.ipAddress.list(params, type),
    queryFn: () => fetchIpAddresses(params, type),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
