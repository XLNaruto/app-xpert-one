import { useQuery } from '@tanstack/react-query'
import { LOOKUP_STALE_TIME } from '@/lib/lookup-cache'
import { DISTRICT_SOURCE } from './use-district-select'

/**
 * One saved `district_id` as `{ value, label }`, read by id — for naming a district on
 * a read-only screen without pulling the whole master. Shares its cache entry
 * with the district dropdown's own by-id label read. Disabled for `null`.
 */
export function useDistrictOption(id: number | null | undefined) {
  const value = id != null && Number.isFinite(id) ? String(id) : ''
  return useQuery({
    queryKey: DISTRICT_SOURCE.key(value),
    queryFn: () => DISTRICT_SOURCE.fetch(value),
    enabled: value !== '',
    staleTime: LOOKUP_STALE_TIME,
    retry: false,
  })
}
