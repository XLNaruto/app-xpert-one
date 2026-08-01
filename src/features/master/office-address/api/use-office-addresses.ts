import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchOfficeAddresses } from './office-address-api'
import type { OfficeFor } from '../types'

/**
 * GET /user/office-addresses — the addresses filed under one `officeFor`.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with no
 * params it returns every address for that screen, for dropdowns elsewhere.
 */
export function useOfficeAddresses(officeFor: OfficeFor, params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.officeAddress.list(officeFor, params),
    queryFn: () => fetchOfficeAddresses(officeFor, params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
