import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchStates } from './state-api'

/**
 * GET /states — the state master list.
 *
 * `enabled` holds the request back for a screen that only needs the master
 * once something is opened — the whole master is several pages, so a screen
 * that may never show a state dropdown shouldn't pay for one on mount.
 */
export function useStates({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.state.list(),
    queryFn: fetchStates,
    enabled,
  })
}
