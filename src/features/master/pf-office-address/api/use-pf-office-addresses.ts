import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPfOfficeAddresses } from './pf-office-address-api'

/** GET /pf-office-addresses — every PF office address. */
export function usePfOfficeAddresses() {
  return useQuery({
    queryKey: queryKeys.pfOfficeAddress.list(),
    queryFn: fetchPfOfficeAddresses,
  })
}
