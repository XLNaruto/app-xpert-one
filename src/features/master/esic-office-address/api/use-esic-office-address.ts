import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchEsicOfficeAddress } from './esic-office-address-api'

/** GET /esic-office-addresses/:id — a single ESIC office address. */
export function useEsicOfficeAddress(id: number) {
  return useQuery({
    queryKey: queryKeys.esicOfficeAddress.detail(id),
    queryFn: () => fetchEsicOfficeAddress(id),
    enabled: Number.isFinite(id),
  })
}
