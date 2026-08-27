import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useCompanyStore } from '@/stores/company-store'
import { listPathForScopedRoute } from '../lib/company-scope-redirect'

/**
 * Everything that has to happen to the screen underneath when the active
 * company changes. Mounted once in the dashboard shell rather than wired into
 * the switcher, so it covers every path that can change the tenant — the topbar
 * dropdown, the post-login gate, a rehydrated session.
 *
 * Two things are wrong with a screen the instant the tenant moves:
 *
 *  1. **The record it is pointed at.** A detail / create / edit page reaches its
 *     record through an encrypted `?data=` token minted under the old company,
 *     which the new one doesn't own — so those fall back to the module's list.
 *
 *  2. **Everything the screen is still holding.** A screen that stays put keeps
 *     its React state, and any of it that names a record — the designation on
 *     Calculate Salary, a branch filter, a half-filled form — is now an id from
 *     the previous tenant. The queries refetch (the switch invalidates them) but
 *     the *selection* doesn't, so a combobox is left holding a designation that
 *     isn't in the new company's master and can only print the bare id back.
 *
 * The second is what `scopeKey` answers, and it is deliberately not solved field
 * by field: there is no list of "the tenant-scoped pieces of state", every screen
 * would have to remember to join it, and one that forgot would fail silently.
 * Keying the routed subtree on the company throws **all** of it away at once —
 * every `useState`, every react-hook-form — and the screen re-mounts and re-reads
 * as if it had just been opened under the new company, which is exactly what it
 * now is.
 *
 * The key only moves on a real switch between two companies. The first resolve
 * after login (null → id) must not remount, or every screen would mount twice
 * and fire its first read twice.
 */
export function useCompanyScope() {
  const router = useRouter()
  const companyId = useCompanyStore((s) => s.selectedCompanyId)
  const previousId = useRef(companyId)
  /** Bumped once per switch — the routed subtree's remount key. */
  const [scopeKey, setScopeKey] = useState(0)

  useEffect(() => {
    const previous = previousId.current
    previousId.current = companyId

    // Only a switch between two real companies counts — the first resolve after
    // login (null → id) must leave the user where they are.
    if (previous == null || companyId == null || previous === companyId) return

    setScopeKey((key) => key + 1)

    const listPath = listPathForScopedRoute(router.state.matches)
    if (!listPath) return

    // `listPath` comes from the route tree itself, so it's a real route — but
    // it's a plain string, which the typed `to` union can't narrow.
    router.navigate({ to: listPath as never, replace: true })
  }, [companyId, router])

  return scopeKey
}
