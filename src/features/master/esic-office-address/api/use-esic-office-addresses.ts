import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchEsicOfficeAddresses } from './esic-office-address-api'

/** GET /esic-office-addresses — every ESIC office address. */
export function useEsicOfficeAddresses() {
  return useQuery({
    queryKey: queryKeys.esicOfficeAddress.list(),
    queryFn: fetchEsicOfficeAddresses,
  })
}
