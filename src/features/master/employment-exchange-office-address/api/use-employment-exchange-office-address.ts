import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchEmploymentExchangeOfficeAddress } from './employment-exchange-office-address-api'

/** GET /employment-exchange-office-addresses/:id — a single employment exchange office address. */
export function useEmploymentExchangeOfficeAddress(id: number) {
  return useQuery({
    queryKey: queryKeys.employmentExchangeOfficeAddress.detail(id),
    queryFn: () => fetchEmploymentExchangeOfficeAddress(id),
    enabled: Number.isFinite(id),
  })
}
