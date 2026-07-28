import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchEmploymentExchangeOfficeAddresses } from './employment-exchange-office-address-api'

/** GET /employment-exchange-office-addresses — every employment exchange office address. */
export function useEmploymentExchangeOfficeAddresses() {
  return useQuery({
    queryKey: queryKeys.employmentExchangeOfficeAddress.list(),
    queryFn: fetchEmploymentExchangeOfficeAddresses,
  })
}
