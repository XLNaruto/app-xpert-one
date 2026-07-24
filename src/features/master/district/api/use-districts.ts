import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDistricts } from './district-api'

/** GET /districts — the district master list. */
export function useDistricts() {
  return useQuery({
    queryKey: queryKeys.district.list(),
    queryFn: fetchDistricts,
  })
}
