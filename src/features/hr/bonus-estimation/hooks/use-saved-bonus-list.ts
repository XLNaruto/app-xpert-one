import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePagination } from '@/hooks/use-pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { BONUS_MAX_LIMIT, BONUS_PAGE_SIZE } from '../constants'
import { useSavedBonuses } from '../api/use-bonus-estimation'
import type { SavedBonusFilters } from '../schemas'
import type { SavedBonusRow } from '../types'

interface UseSavedBonusListOptions {
  filters: SavedBonusFilters | null
  /** Whether this view is the one on screen — the other must not read. */
  active: boolean
}

/**
 * The Saved Bonus side: what has been COMMITTED for the range, one line per
 * employee.
 *
 * Read-only. A committed bonus is money already declared against a closed month,
 * and the months under it carry the base as it stood AT SAVE TIME — so there is
 * nothing here to revise, and reprocessing a month afterwards can't rewrite it
 * either.
 *
 * The months come back whole with each employee (a line expands to at most the
 * length of the range), so opening one is a local expansion rather than a second
 * request.
 */
export function useSavedBonusList({ filters, active }: UseSavedBonusListOptions) {
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange: setPagination,
  } = usePagination(BONUS_PAGE_SIZE)

  /** "All" arrives as a negative limit; this endpoint caps `limit` at 500. */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPagination(next.limit < 0 ? { limit: BONUS_MAX_LIMIT, offset: 0 } : next),
    [setPagination],
  )

  const list = useSavedBonuses(active ? filters : null, params)

  /** Whose months are open — `null` when none are. One at a time. */
  const [openEmployeeId, setOpenEmployeeId] = useState<number | null>(null)

  /* A new range is a different result set: first page, nothing expanded. */
  const limitRef = useRef(limit)
  limitRef.current = limit
  useEffect(() => {
    setOpenEmployeeId(null)
    setPagination({ limit: limitRef.current, offset: 0 })
  }, [filters, setPagination])

  const rows = useMemo(() => list.data?.items ?? [], [list.data])

  const openEmployee = useMemo<SavedBonusRow | null>(
    () => rows.find((row) => row.employeeId === openEmployeeId) ?? null,
    [rows, openEmployeeId],
  )

  const isForbidden = isForbiddenError(list.error)

  return {
    rows,
    range: list.data?.range ?? null,
    total: list.data?.total ?? 0,

    isLoading: list.isLoading,
    isFetching: list.isFetching,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    search,
    setSearch,
    limit,
    offset,
    onPaginationChange,

    openEmployee,
    openMonths: useCallback((employeeId: number) => setOpenEmployeeId(employeeId), []),
    closeMonths: useCallback(() => setOpenEmployeeId(null), []),
  }
}
