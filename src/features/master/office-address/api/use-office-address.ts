import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchOfficeAddress } from './office-address-api'

/** GET /user/office-addresses/:id — a single office address. */
export function useOfficeAddress(id: number) {
  return useQuery({
    queryKey: queryKeys.officeAddress.detail(id),
    queryFn: () => fetchOfficeAddress(id),
    enabled: Number.isFinite(id),
  })
}
