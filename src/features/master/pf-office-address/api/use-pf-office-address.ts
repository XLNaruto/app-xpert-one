import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPfOfficeAddress } from './pf-office-address-api'

/** GET /pf-office-addresses/:id — a single PF office address. */
export function usePfOfficeAddress(id: number) {
  return useQuery({
    queryKey: queryKeys.pfOfficeAddress.detail(id),
    queryFn: () => fetchPfOfficeAddress(id),
    enabled: Number.isFinite(id),
  })
}
