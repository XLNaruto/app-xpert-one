import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchMyProfile } from './profile-api'

/**
 * GET /user/me — the current account, its subscription and its usage. Cached
 * for a minute: the topbar reads it on every screen, and none of it moves
 * within a session except through an action that invalidates it.
 */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: fetchMyProfile,
    staleTime: 60 * 1000,
  })
}
