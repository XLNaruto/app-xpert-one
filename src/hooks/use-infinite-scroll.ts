import { useEffect, useRef } from 'react'

/**
 * Fire `onLoadMore` when a sentinel element scrolls into view.
 *
 * The scroll-list counterpart to `usePagination()`: where a data table asks for
 * the next page with a pager, a sidebar asks for it by reaching its end. Attach
 * the returned ref to an empty element after the last row (or before the first,
 * for a list that grows upward).
 *
 * `enabled` should be the query's own `hasNextPage && !isFetchingNextPage`, so
 * the observer can't queue a second request for a page already in flight.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  enabled,
  onLoadMore,
  rootMargin = '200px',
}: {
  enabled: boolean
  onLoadMore: () => void
  /** How far ahead of the sentinel to start loading. */
  rootMargin?: string
}) {
  const sentinelRef = useRef<T | null>(null)

  // Held in a ref so a caller passing an inline arrow doesn't tear the observer
  // down and rebuild it on every render.
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !enabled) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMoreRef.current()
      },
      { rootMargin },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return sentinelRef
}
