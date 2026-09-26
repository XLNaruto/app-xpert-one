import { useEffect, useRef, type RefObject } from 'react'

/** The attribute the grid's today header carries, for this hook to find. */
export const TODAY_COLUMN_ATTR = 'data-schedule-today'

/**
 * Brings today's column into the middle of the grid's horizontal scroll.
 *
 * It runs once per window (`windowKey` is `from|to`) and only when there are
 * rows to show, so opening the screen, refreshing it or switching back to the
 * current month lands on today, while paging, searching or editing a cell
 * leaves the user's own scroll alone. A window without today does nothing.
 */
export function useScrollToToday(
  wrapperRef: RefObject<HTMLElement | null>,
  windowKey: string,
  ready: boolean,
) {
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!ready || lastKey.current === windowKey) return
    const header = wrapperRef.current
      ?.querySelector(`[${TODAY_COLUMN_ATTR}]`)
      ?.closest('th')
    const container = header?.closest<HTMLElement>('.overflow-auto')
    lastKey.current = windowKey
    if (!header || !container) return

    const cell = header.getBoundingClientRect()
    const box = container.getBoundingClientRect()
    container.scrollTo({
      left: container.scrollLeft + cell.left - box.left - (box.width - cell.width) / 2,
      behavior: 'smooth',
    })
  }, [wrapperRef, windowKey, ready])
}
