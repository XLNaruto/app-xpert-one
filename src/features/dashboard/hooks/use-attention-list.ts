import { useCallback, useMemo, useState } from 'react'
import { usePagination } from '@/hooks/use-pagination'
import { ANY_VALUE, ATTENTION_PAGE_SIZE, RECONCILIATION_SIGNAL } from '../constants'
import { useDashboardAttention } from '../api/use-dashboard-panels'
import type { DashboardQuery } from '../lib/dashboard-query'
import type { AttentionSignal } from '../types'

/**
 * The worklist — an offset-paged list, with two things that make it unlike every
 * other list screen in the app.
 *
 * **It is not window-scoped.** Every signal is measured AS OF NOW: a contract
 * expiring next week is the same problem whether the user is looking at last
 * month or this one. So it takes the POPULATION half of the filter and the card
 * shows no date range — otherwise users would expect the list to move when they
 * change the dates.
 *
 * **It is never re-sorted here.** Rows arrive ordered by how MANY things are
 * wrong, then by employee id, done in SQL — so `total` and the page always
 * agree. A client-side sort would reorder the page in hand and break the
 * ordering across pages, which is why the table is mounted without sorting.
 */

export function useAttentionList(populationQuery: DashboardQuery) {
  // No `defaultSort`: the endpoint takes no sort, and the order it applies is
  // the point of the screen.
  const pagination = usePagination(ATTENTION_PAGE_SIZE)
  const [signal, setSignal] = useState<AttentionSignal | ''>(ANY_VALUE)

  const { limit, offset, params } = pagination

  const query = useMemo<DashboardQuery>(
    () => ({
      ...populationQuery,
      limit,
      offset,
      ...(params.search ? { term: params.search } : {}),
      ...(signal ? { signal } : {}),
    }),
    [populationQuery, limit, offset, params.search, signal],
  )

  const result = useDashboardAttention(query)

  // A different signal is a different result set — back to its first page.
  const changeSignal = useCallback(
    (next: AttentionSignal | '') => {
      setSignal(next)
      pagination.onPaginationChange({ limit, offset: 0 })
    },
    [pagination, limit],
  )

  const reset = useCallback(() => {
    setSignal(ANY_VALUE)
    pagination.setSearch('')
    pagination.onPaginationChange({ limit, offset: 0 })
  }, [pagination, limit])

  return {
    ...result,
    ...pagination,
    signal,
    setSignal: changeSignal,
    reset,
    items: result.data?.items ?? [],
    /** The size of the WORKLIST, not of the workforce. */
    total: result.data?.total ?? 0,
    /** Whether any narrowing is applied — drives the empty state's wording. */
    isNarrowed: Boolean(signal) || Boolean(params.search),
  }
}

/**
 * A second, one-row read of the worklist narrowed to `no_posting`, purely for
 * its `total`.
 *
 * That signal is the reconciliation one: those employees hold no posting, so
 * they are excluded from every headcount on the screen. Naming the count on the
 * workforce card and linking to the list is the honest fix for a headcount tile
 * that disagrees with the employee LIST screen — a different count would not be.
 */
export function useNoPostingCount(populationQuery: DashboardQuery) {
  const query = useMemo<DashboardQuery>(
    () => ({
      ...populationQuery,
      limit: 1,
      offset: 0,
      signal: RECONCILIATION_SIGNAL,
    }),
    [populationQuery],
  )

  const result = useDashboardAttention(query)
  return result.data?.total ?? 0
}
