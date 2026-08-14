import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchTalkCredential, fetchTalkCredentials } from './talk-credential-api'

/**
 * GET /user/talk-credentials — the account's Talk logins, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. `companyId` is
 * the screen's filter, not the session's tenant: omit it for every credential of
 * the account.
 */
export function useTalkCredentials(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.talkCredential.list(params, companyId),
    queryFn: () => fetchTalkCredentials(params, companyId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/talk-credentials/:id — one credential, as the edit form loads it. */
export function useTalkCredential(id: number) {
  return useQuery({
    queryKey: queryKeys.talkCredential.detail(id),
    queryFn: () => fetchTalkCredential(id),
    enabled: Number.isFinite(id),
  })
}
