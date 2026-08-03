import { ApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'

/**
 * The company the session has active, for the endpoints that scope themselves
 * explicitly (`?company_id=` on reads, `company_id` in a create body) rather
 * than deriving the tenant from the bearer token.
 *
 * Called from a feature's `api/` layer, never from a component — a request made
 * before a company is selected would come back a bare 400 on the missing
 * parameter, so this fails first with something a screen can actually show.
 */
export function activeCompanyId(what: string): number {
  const companyId = useAuthStore.getState().user?.companyId
  if (companyId == null) {
    throw new ApiError(`Select a company before managing ${what}.`)
  }
  return companyId
}
