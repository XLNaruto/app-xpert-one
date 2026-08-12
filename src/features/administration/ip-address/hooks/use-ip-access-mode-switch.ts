import { useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useIpAccessMode } from '../api/use-ip-access-mode'
import { useUpdateIpAccessMode } from '../api/use-ip-address-mutations'
import type { IpAccessMode } from '../schemas'

/**
 * The access mode header on the list screen, and the switch behind it.
 *
 * Flipping the mode changes who can reach the panel at all, including the person
 * flipping it — so it goes through a confirmation rather than a bare toggle. The
 * `RESTRICTED`-with-an-empty-allow-list case is refused by the server (409); the
 * button is disabled for it up front too, since the answer is knowable from the
 * counts already on screen.
 */
export function useIpAccessModeSwitch() {
  const { data, isLoading, isError, error } = useIpAccessMode()
  const updateMode = useUpdateIpAccessMode()

  /** The mode the confirmation is asking about, or `null` while it's shut. */
  const [pendingMode, setPendingMode] = useState<IpAccessMode | null>(null)

  const mode = data?.mode ?? 'PUBLIC'
  const allowedCount = data?.allowedCount ?? 0
  const blockedCount = data?.blockedCount ?? 0

  /** The mode the switch would move to — there are only the two. */
  const nextMode: IpAccessMode = mode === 'PUBLIC' ? 'RESTRICTED' : 'PUBLIC'

  /**
   * Locking down with nothing on the allow list would admit nobody, so the
   * server refuses it — don't offer the move in the first place.
   */
  const wouldLockEveryoneOut = nextMode === 'RESTRICTED' && allowedCount === 0

  const confirmSwitch = () => {
    if (!pendingMode) return
    updateMode.mutate(pendingMode, {
      onSuccess: () => {
        toast.success(
          pendingMode === 'RESTRICTED'
            ? 'Access restricted to the allowed list'
            : 'Access opened to every network except the blocked list',
        )
        setPendingMode(null)
      },
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't change the IP access mode.")),
    })
  }

  return {
    mode,
    allowedCount,
    blockedCount,
    nextMode,
    wouldLockEveryoneOut,
    isLoading,
    isError,
    /**
     * Whether there's a mode to show at all. It's false while the role lacks
     * `ip-addresses:read` — the query never runs then, and `mode`/the counts
     * below are only their defaults, which would read as fact on screen.
     */
    hasMode: data !== undefined,
    /**
     * The read was refused, not broken — the right was never held, or was taken
     * away while the screen was open. The page answers it with the 403 screen,
     * so it can't be confused with the mode simply failing to load.
     */
    isForbidden: isForbiddenError(error),
    forbiddenMessage: isForbiddenError(error) ? getApiErrorMessage(error) : undefined,
    pendingMode,
    startSwitch: () => setPendingMode(nextMode),
    cancelSwitch: () => setPendingMode(null),
    confirmSwitch,
    isSwitching: updateMode.isPending,
  }
}
