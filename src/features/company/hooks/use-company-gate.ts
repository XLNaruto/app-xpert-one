import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLogout } from '@/features/auth'
import { useAuthStore } from '@/stores/auth-store'
import { useMyCompanies } from '../api/use-my-companies'
import { useSelectCompany } from '../api/use-select-company'

/**
 * Controller for the post-login company gate. Owns which company is highlighted
 * and the confirm/sign-out actions. Every login goes through it, single-company
 * accounts included: the selection is what scopes the session's token, so it is
 * always confirmed explicitly — a lone company is simply pre-highlighted, one
 * click from Confirm.
 *
 * The gate component consumes this and only renders.
 */
export function useCompanyGate() {
  const navigate = useNavigate()
  const { companies, requiresSelection } = useMyCompanies()
  const selectCompany = useSelectCompany()
  const logout = useLogout()
  const lastSelectedId = useAuthStore((s) => s.user?.lastSelectedCompanyId ?? null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Pre-highlight a choice so Confirm is one click: the account's only company
  // when it has just one, otherwise the company it last worked in (a hint, not
  // a selection — the gate still asks every login). Applied once, when the list
  // arrives: an id the caller no longer belongs to is ignored, and a manual pick
  // afterwards is never overwritten.
  const preselected = useRef(false)
  useEffect(() => {
    if (preselected.current || companies.length === 0) return
    preselected.current = true
    if (companies.length === 1) {
      setSelectedId(companies[0].id)
      return
    }
    if (lastSelectedId != null && companies.some((c) => c.id === lastSelectedId))
      setSelectedId(lastSelectedId)
  }, [lastSelectedId, companies])

  // Mirror the topbar's sign-out: clear the session, then send the user to the
  // login screen. Without the explicit navigate the modal stays put after the
  // auth state clears.
  const handleLogout = () =>
    logout.mutate(undefined, { onSettled: () => navigate({ to: '/login' }) })

  return {
    /** Whether the gate should block the app at all. */
    open: requiresSelection,
    companies,
    selectedId,
    select: setSelectedId,
    confirm: () => selectedId != null && selectCompany.mutate(selectedId),
    busy: selectCompany.isPending || logout.isPending,
    isPending: selectCompany.isPending,
    isLoggingOut: logout.isPending,
    error: selectCompany.isError ? selectCompany.error : null,
    logout: handleLogout,
  }
}
