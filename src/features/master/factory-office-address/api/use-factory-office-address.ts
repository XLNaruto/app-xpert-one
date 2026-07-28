import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchFactoryOfficeAddress } from './factory-office-address-api'

/** GET /factory-office-addresses/:id — a single factory office address. */
export function useFactoryOfficeAddress(id: number) {
  return useQuery({
    queryKey: queryKeys.factoryOfficeAddress.detail(id),
    queryFn: () => fetchFactoryOfficeAddress(id),
    enabled: Number.isFinite(id),
  })
}
