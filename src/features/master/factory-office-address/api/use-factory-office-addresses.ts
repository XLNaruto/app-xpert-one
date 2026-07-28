import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchFactoryOfficeAddresses } from './factory-office-address-api'

/** GET /factory-office-addresses — every factory office address. */
export function useFactoryOfficeAddresses() {
  return useQuery({
    queryKey: queryKeys.factoryOfficeAddress.list(),
    queryFn: fetchFactoryOfficeAddresses,
  })
}
