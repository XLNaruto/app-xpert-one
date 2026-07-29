import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchLeaveType } from './leave-type-api'

/** GET /leave-types/:id — a single leave type record. */
export function useLeaveType(id: number) {
  return useQuery({
    queryKey: queryKeys.leaveType.detail(id),
    queryFn: () => fetchLeaveType(id),
    enabled: Number.isFinite(id),
  })
}
