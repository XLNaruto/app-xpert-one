import { useEffect, useRef } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useCompanyStore } from '@/stores/company-store'
import { listPathForScopedRoute } from '../lib/company-scope-redirect'

/**
 * Sends the user back to the module's list page when the active company changes
 * while a tenant-scoped record screen is open (detail, create, edit).
 *
 * Mounted once in the dashboard shell rather than wired into the switcher, so it
 * covers every path that can change the tenant — the topbar dropdown, the
 * post-login gate, a rehydrated session.
 */
export function useCompanyScopeRedirect() {
  const router = useRouter()
  const companyId = useCompanyStore((s) => s.selectedCompanyId)
  const previousId = useRef(companyId)

  useEffect(() => {
    const previous = previousId.current
    previousId.current = companyId

    // Only a switch between two real companies counts — the first resolve after
    // login (null → id) must leave the user where they are.
    if (previous == null || companyId == null || previous === companyId) return

    const listPath = listPathForScopedRoute(router.state.matches)
    if (!listPath) return

    // `listPath` comes from the route tree itself, so it's a real route — but
    // it's a plain string, which the typed `to` union can't narrow.
    router.navigate({ to: listPath as never, replace: true })
  }, [companyId, router])
}
