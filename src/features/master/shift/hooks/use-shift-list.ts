import { useState } from 'react'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { SHIFT_DEFAULT_SORT, SHIFT_PAGE_SIZE } from '../constants'
import { useShifts } from '../api/use-shifts'
import { useDeleteShift } from '../api/use-shift-mutations'
import type { Shift } from '../types'

/**
 * The shift list that sits under the form on the company screen's Shift tab:
 * the paged query, which row the form is editing and the delete flow. The
 * component consumes this and only renders.
 *
 * The company's own default shift is not set from here — a default is chosen
 * per department, on the department screen's Shift tab.
 *
 * `companyId` is the company on screen rather than the session's active one —
 * the company master edits any company, so the tab reads that record's shifts.
 * Until it's known (a company being created has no id yet) the query stays idle.
 */
export function useShiftList(companyId?: number) {
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(SHIFT_PAGE_SIZE, SHIFT_DEFAULT_SORT)

  const { data, isLoading, isError, error } = useShifts(params, companyId)
  const deleteShift = useDeleteShift()

  /** The row the form above the list is editing, or `null` while it's adding. */
  const [editing, setEditing] = useState<Shift | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Shift | null>(null)

  const confirmDelete = () => {
    if (!pendingDelete) return
    const removed = pendingDelete
    deleteShift.mutate(removed.id, {
      onSuccess: () => {
        toast.success('Shift deleted')
        setPendingDelete(null)
        // The form was editing the row that just went — put it back to adding,
        // or Save would PATCH a record that no longer exists.
        if (editing?.id === removed.id) setEditing(null)
      },
      // A shift still in use answers 409 with the reason, which is what to show.
      onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete shift')),
    })
  }

  // A 403 isn't a broken screen, it's a missing permission — the tab shows the
  // server's reason instead of a generic error line.
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
    // Server-side ordering — a header click re-queries instead of sorting the
    // page on screen.
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    editing,
    setEditing,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteShift.isPending,
  }
}
