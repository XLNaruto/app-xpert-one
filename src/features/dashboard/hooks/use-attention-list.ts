import { useCallback, useMemo, useState } from 'react'
import { ALL_PAGE_SIZE } from '@/components/data-table'
import { usePagination } from '@/hooks/use-pagination'
import { ANY_VALUE, ATTENTION_PAGE_SIZE, RECONCILIATION_SIGNAL } from '../constants'
import {
  useDashboardAttention,
  useDashboardAttentionInfinite,
} from '../api/use-dashboard-panels'
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
 *
 * **"All" is a scroll, not a request.** The footer's "All" sets the pager's
 * `ALL_PAGE_SIZE` sentinel, which as a `limit` the endpoint would reject — it
 * caps `limit` at 100. So that sentinel switches this hook onto an infinite
 * query that appends 100 rows per scroll to the bottom, and the paged query is
 * disabled while it does. Only one of the two is ever in flight.
 */

export function useAttentionList(populationQuery: DashboardQuery) {
  // No `defaultSort`: the endpoint takes no sort, and the order it applies is
  // the point of the screen.
  const pagination = usePagination(ATTENTION_PAGE_SIZE)
  const [signal, setSignal] = useState<AttentionSignal | ''>(ANY_VALUE)

  const { limit, offset, params } = pagination

  /** The footer is on "All" — page by scroll rather than by pager. */
  const isAll = limit === ALL_PAGE_SIZE

  /** The narrowing, without the page: what both reads have in common. */
  const filterQuery = useMemo<DashboardQuery>(
    () => ({
      ...populationQuery,
      ...(params.search ? { term: params.search } : {}),
      ...(signal ? { signal } : {}),
    }),
    [populationQuery, params.search, signal],
  )

  const query = useMemo<DashboardQuery>(
    () => ({ ...filterQuery, limit, offset }),
    [filterQuery, limit, offset],
  )

  const paged = useDashboardAttention(query, !isAll)
  // No `limit`/`offset` here — the batches carry them, so the whole scroll sits
  // under one cache key.
  const scrolled = useDashboardAttentionInfinite(filterQuery, isAll)

  const result = isAll ? scrolled : paged

  /** The batches, flattened in arrival order — which is the server's order. */
  const items = useMemo(
    () =>
      isAll
        ? (scrolled.data?.pages.flatMap((page) => page.items) ?? [])
        : (paged.data?.items ?? []),
    [isAll, scrolled.data, paged.data],
  )

  /**
   * The worklist's size. In scroll mode it comes off the LAST batch: every batch
   * answers the same `total`, and the newest one is the least stale.
   */
  const total = isAll
    ? (scrolled.data?.pages.at(-1)?.total ?? 0)
    : (paged.data?.total ?? 0)

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
    items,
    /** The size of the WORKLIST, not of the workforce. */
    total,

    /** Whether the footer is on "All" — the table scrolls its body when it is. */
    isAll,
    /** Infinite-scroll wiring for `<DataTable>`; inert outside "All". */
    hasMore: isAll && scrolled.hasNextPage,
    isFetchingMore: isAll && scrolled.isFetchingNextPage,
    loadMore: () => {
      if (isAll && scrolled.hasNextPage && !scrolled.isFetchingNextPage) {
        void scrolled.fetchNextPage()
      }
    },
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
