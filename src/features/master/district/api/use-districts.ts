import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDistricts } from './district-api'

/**
 * GET /user/districts — the district master.
 *
 * Pass a `stateId` for a state→district cascade and the API narrows the list
 * server-side; call it with no argument for the whole master, which the screens
 * needing districts for several states at once read.
 */
export function useDistricts(stateId?: number) {
  return useQuery({
    queryKey: queryKeys.district.list(stateId),
    queryFn: () => fetchDistricts(stateId),
  })
}
