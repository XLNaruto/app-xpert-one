import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DEFAULT_PAGE_SIZE, type PageParams } from '@/lib/pagination'

/**
 * Limit/offset state for a server-paged list screen: what the query sends and
 * what `<DataTable serverPagination>` reads back. Feature list hooks own one of
 * these and pass `params` straight to their query hook.
 */
export function usePagination(initialLimit = DEFAULT_PAGE_SIZE) {
  const [limit, setLimit] = useState(initialLimit)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')

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

  const params = useMemo<PageParams>(
    () => ({
      limit,
      offset,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [limit, offset, debouncedSearch],
  )

  return {
    limit,
    offset,
    /** What the query hook sends — debounced, so it's request-ready. */
    params,
    /** Raw search text for the input (undebounced). */
    search,
    setSearch,
    onPaginationChange,
  }
}
