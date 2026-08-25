import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isForbiddenError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS, useCan } from '@/features/permissions'
import { IP_ACCESS_MODE_POLL_MS } from '../constants'
import { fetchIpAccessMode } from './ip-address-api'

/**
 * GET /user/ip-addresses/mode — the company's access mode and its list counts,
 * which together are the list screen's header.
 *
 * Server state, mounted globally like `useMyRole()` but *polled*, not frozen for
 * the session: it re-asks on every app load and once a minute after. The mode
 * itself rarely moves, and a write to it invalidates `ipAddress.all` anyway — the
 * interval is about the other half of this endpoint's answer, whether this
 * network is still admitted. An administrator barring an address (or the user
 * moving onto a barred one) has to reach an open tab without a manual reload, so
 * the poll is what puts the overlay up within 30s instead of on the next click.
 *
 * Mounted once globally from the dashboard layout — see
 * {@link useIpAccessModeGlobal} — so the answer is warm before the IP screen
 * renders, and so a network the server has barred (`RESTRICTED_IP`) is met by the
 * `RestrictedIp` overlay on entering the app rather than only once the user
 * happens to open Administration → IP Access Control.
 *
 * Two things keep the global mount from spending a request that can only fail:
 * the endpoint is guarded by `ip-addresses:read`, which is also what the screen
 * itself is gated on — so the query only ever runs for someone already entitled
 * to the header; and it is company-scoped —
 * asking before a company is active would throw `NO_ACTIVE_COMPANY` client-side.
 */
export function useIpAccessMode() {
  const { can } = useCan()
  // The mode is per company; `activeCompanyId()` refuses without one.
  const hasCompany = useAuthStore((s) => s.user?.companyId != null)

  return useQuery({
    queryKey: queryKeys.ipAddress.mode(),
    queryFn: fetchIpAccessMode,
    enabled: hasCompany && can(`${PERMISSIONS.ipAddresses}:read`),
    // Re-checked every 30s, and on load / on returning to the tab. The
    // matching staleTime keeps a screen mounting mid-interval from firing its own
    // request — the poll is the only thing that refetches.
    refetchInterval: IP_ACCESS_MODE_POLL_MS,
    staleTime: IP_ACCESS_MODE_POLL_MS,
    // A 403 is the server's final answer — retrying it only delays the screen
    // that answers it (the header hides, or the overlay takes over).
    retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
  })
}

/** Kept as the mount-it-once alias the dashboard layout reads. */
export const useIpAccessModeGlobal = useIpAccessMode
