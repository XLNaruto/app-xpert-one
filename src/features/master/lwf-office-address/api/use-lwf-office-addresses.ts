import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLwfOfficeAddresses } from './lwf-office-address-api'

/** GET /lwf-office-addresses — every LWF office address. */
export function useLwfOfficeAddresses() {
  return useQuery({
    queryKey: queryKeys.lwfOfficeAddress.list(),
    queryFn: fetchLwfOfficeAddresses,
  })
}
