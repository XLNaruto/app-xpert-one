import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLogout } from '@/features/auth'
import { useMyCompanies } from '../api/use-my-companies'
import { useSelectCompany } from '../api/use-select-company'

/**
 * Controller for the post-login company gate. Owns which company is highlighted,
 * the confirm/sign-out actions, and the single-company shortcut: when the caller
 * belongs to exactly one company there's nothing to choose, so the selection is
 * submitted for them and the gate only shows a brief "preparing" state.
 *
 * The gate component consumes this and only renders.
 */
export function useCompanyGate() {
  const navigate = useNavigate()
  const { companies, requiresSelection } = useMyCompanies()
  const selectCompany = useSelectCompany()
  const logout = useLogout()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Exactly one company — resolve it without asking. Fired once: a failure
  // surfaces as an error with a Retry rather than retrying in a loop.
  const autoSelected = useRef(false)
  const only = companies.length === 1 ? companies[0] : undefined
  useEffect(() => {
    if (!requiresSelection || !only || autoSelected.current) return
    autoSelected.current = true
    selectCompany.mutate(only.id)
  }, [requiresSelection, only, selectCompany])

  // Mirror the topbar's sign-out: clear the session, then send the user to the
  // login screen. Without the explicit navigate the modal stays put after the
  // auth state clears.
  const handleLogout = () =>
    logout.mutate(undefined, { onSettled: () => navigate({ to: '/login' }) })

  return {
    /** Whether the gate should block the app at all. */
    open: requiresSelection,
    companies,
    /** True while the sole company is being resolved — render a loader, not a list. */
    isResolvingOnly: only != null,
    selectedId,
    select: setSelectedId,
    confirm: () => selectedId != null && selectCompany.mutate(selectedId),
    retry: () => only != null && selectCompany.mutate(only.id),
    busy: selectCompany.isPending || logout.isPending,
    isPending: selectCompany.isPending,
    isLoggingOut: logout.isPending,
    error: selectCompany.isError ? selectCompany.error : null,
    logout: handleLogout,
  }
}
