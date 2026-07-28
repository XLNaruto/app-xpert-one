import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLwfOfficeAddress } from './lwf-office-address-api'

/** GET /lwf-office-addresses/:id — a single LWF office address. */
export function useLwfOfficeAddress(id: number) {
  return useQuery({
    queryKey: queryKeys.lwfOfficeAddress.detail(id),
    queryFn: () => fetchLwfOfficeAddress(id),
    enabled: Number.isFinite(id),
  })
}
