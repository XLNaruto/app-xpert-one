import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLeaveTypes } from './leave-type-api'

/** GET /leave-types — the leave type master list. */
export function useLeaveTypes() {
  return useQuery({
    queryKey: queryKeys.leaveType.list(),
    queryFn: fetchLeaveTypes,
  })
}
