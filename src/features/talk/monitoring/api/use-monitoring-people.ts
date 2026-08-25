import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchMonitoringPeople } from './talk-monitoring-api'

/**
 * GET /user/talk/monitoring/people — the account's Talk directory.
 *
 * `search` is the SERVER's: it reaches the endpoint, which matches it against
 * the person's name across the whole account, so a match is found wherever it
 * sits rather than only among rows this client is holding. Pass it debounced —
 * every distinct term is its own request and its own cache entry.
 *
 * What the pane still resolves itself are the three segments (All / Employees /
 * Admins) and their counts, because the endpoint has no filter for
 * `is_employee` — which is why this reads the matched set in full rather than a
 * page of it. See `fetchMonitoringPeople`.
 *
 * Held for five minutes: who holds a Talk identity changes when a credential is
 * issued or revoked, not while somebody is reading a thread.
 */
export function useMonitoringPeople(search?: string) {
  return useQuery({
    queryKey: queryKeys.talkMonitoring.people(search),
    queryFn: () => fetchMonitoringPeople(search),
    // Keep the previous matches on screen while the next term loads, so the
    // pane doesn't blank out between keystrokes.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
