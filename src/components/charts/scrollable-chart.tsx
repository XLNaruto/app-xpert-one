import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

/**
 * A chart that keeps a FLOOR under each data point and scrolls sideways rather
 * than squeezing.
 *
 * `ResponsiveContainer` alone divides the card's width by however many points
 * came back, so a wide period or a long list of departments compresses until the
 * bars are hairlines and the axis silently drops most of its labels. Here the
 * inner track is `count * minPerItem` wide at minimum — under that many points
 * nothing changes (it still fills the card), and over it the card scrolls and
 * every point keeps its own room.
 *
 * `minWidth` (not `width`) is what preserves the fill-the-card case, and the
 * container measures that inner track, so the chart itself never knows it is
 * inside a scroller.
 */
export function ScrollableChart({
  count,
  minPerItem,
  height,
  children,
}: {
  /** Data points on the category/time axis. */
  count: number
  /** The narrowest a single point may get before the card starts scrolling. */
  minPerItem: number
  height: number
  children: ReactElement
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div style={{ minWidth: Math.max(0, count) * minPerItem }}>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
