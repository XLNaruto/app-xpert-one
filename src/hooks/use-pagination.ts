import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnSort, OnChangeFn, SortingState } from '@tanstack/react-table'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DEFAULT_PAGE_SIZE, type PageParams } from '@/lib/pagination'

/**
 * Limit/offset/sort state for a server-paged list screen: what the query sends
 * and what `<DataTable serverPagination>` reads back. Feature list hooks own one
 * of these and pass `params` straight to their query hook.
 *
 * `defaultSort` is the order the screen opens in, and the order it falls back to
 * when the user clicks a sorted header off. Its `id` is the endpoint's own field
 * name (`effective_date`, `office_name`, …) — the same id the sortable column
 * carries — so a header click needs no translation on the way to the API. Omit
 * it on a screen whose endpoint sorts nothing.
 */
export function usePagination(
  initialLimit = DEFAULT_PAGE_SIZE,
  defaultSort?: ColumnSort,
) {
  const [limit, setLimit] = useState(initialLimit)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>(
    defaultSort ? [defaultSort] : [],
  )

  // Callers pass `defaultSort` as an inline literal, so it's a fresh object
  // every render — hold it in a ref to keep the handler below stable.
  const defaultSortRef = useRef(defaultSort)
  defaultSortRef.current = defaultSort

  // Typing shouldn't fire a request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300)

  // A different search is a different result set — go back to its first page.
  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch])

  const onPaginationChange = useCallback((next: { limit: number; offset: number }) => {
    setLimit(next.limit)
    setOffset(next.offset)
  }, [])

  const onSortingChange = useCallback<OnChangeFn<SortingState>>((updater) => {
    setSorting((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // Clicking a sorted header a third time clears it, which would leave the
      // list in whatever order the server happens to return — fall back to the
      // screen's default instead.
      const fallback = defaultSortRef.current
      return next.length ? next : fallback ? [fallback] : []
    })
    // A re-sort reorders every page, so page 3 of the old order is meaningless.
    setOffset(0)
  }, [])

  const params = useMemo<PageParams>(() => {
    const [active] = sorting
    return {
      limit,
      offset,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(active ? { sort: active.id, sortBy: active.desc ? 'desc' : 'asc' } : {}),
    }
  }, [limit, offset, debouncedSearch, sorting])

  return {
    limit,
    offset,
    /** What the query hook sends — debounced, so it's request-ready. */
    params,
    /** Raw search text for the input (undebounced). */
    search,
    setSearch,
    onPaginationChange,
    /** Controlled sorting for `<DataTable manualSorting>`. */
    sorting,
    onSortingChange,
  }
}
