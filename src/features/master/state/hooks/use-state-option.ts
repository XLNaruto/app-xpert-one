import { useQuery } from '@tanstack/react-query'
import { LOOKUP_STALE_TIME } from '@/lib/lookup-cache'
import { STATE_SOURCE } from './use-state-select'

/**
 * One saved `state_id` as `{ value, label }`, read by id — for naming a state on
 * a read-only screen without pulling the whole master. Shares its cache entry
 * with the state dropdown's own by-id label read. Disabled for `null`.
 */
export function useStateOption(id: number | null | undefined) {
  const value = id != null && Number.isFinite(id) ? String(id) : ''
  return useQuery({
    queryKey: STATE_SOURCE.key(value),
    queryFn: () => STATE_SOURCE.fetch(value),
    enabled: value !== '',
    staleTime: LOOKUP_STALE_TIME,
    retry: false,
  })
}
