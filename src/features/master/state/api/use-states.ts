import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchStates } from './state-api'

/** GET /states — the state master list. */
export function useStates() {
  return useQuery({
    queryKey: queryKeys.state.list(),
    queryFn: fetchStates,
  })
}
