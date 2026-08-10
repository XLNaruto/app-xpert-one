import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { WEEKOFF_POLICY_DEFAULT_SORT } from '../constants'
import { useWeekoffPolicies } from '../api/use-weekoff-policies'
import { useDeleteWeekoffPolicy } from '../api/use-weekoff-policy-mutations'
import { useWeekoffPolicyDefault } from './use-weekoff-policy-default'
import type { WeekoffPolicy } from '../types'

/**
 * Orchestrates the week-off policy master: the paged list, navigation to the
 * create/edit screen, the delete flow and the set/clear-default dialog. The page
 * consumes this and only renders.
 *
 * Search, paging and sorting are all server-side, so a header click or a search
 * term re-queries rather than reordering the page on screen.
 */
export function useWeekoffPolicyList() {
  const navigate = useNavigate()
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, WEEKOFF_POLICY_DEFAULT_SORT)

  const { data, isLoading, isError, error } = useWeekoffPolicies(params)
  const deletePolicy = useDeleteWeekoffPolicy()
  const pinDefault = useWeekoffPolicyDefault()

  const [pendingDelete, setPendingDelete] = useState<WeekoffPolicy | null>(null)

  const goToCreate = () => navigate({ to: '/master/weekoff-policy/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/weekoff-policy/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deletePolicy.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Week-off policy deleted')
        setPendingDelete(null)
      },
      // A policy still pointed at answers 409 with the reason, which is what to show.
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't delete the week-off policy.")),
    })
  }

  // A 403 isn't a broken screen, it's a missing permission.
  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
    isLoading,
    isError: isError && !isForbidden,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deletePolicy.isPending,
    /** The set/clear-default dialog's own state and writes. */
    pinDefault,
  }
}
