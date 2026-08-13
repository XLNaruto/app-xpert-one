import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryTile {
  label: string
  value: string
  icon?: LucideIcon
  /** Draws the tile as the one that matters on this tab. */
  tone?: 'default' | 'warning' | 'success'
}

/**
 * The counters over the whole filter — not the page.
 *
 * That distinction is the reason these come from the response's `totals` rather
 * than being summed from the rows on screen: a tile that moved with the pager
 * would say nothing about how much of the month is still outstanding, which is
 * the only question this strip is here to answer.
 */
export function PaySalarySummary({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn(
            'rounded-xl border px-4 py-3',
            tile.tone === 'warning'
              ? 'border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
              : tile.tone === 'success'
                ? 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                : 'border-border bg-card',
          )}
        >
          <p className="text-xs text-muted-foreground">{tile.label}</p>
          <p
            className={cn(
              'mt-1 inline-flex items-center gap-1.5 font-heading text-xl font-semibold tabular-nums',
              tile.tone === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : tile.tone === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-foreground',
            )}
          >
            {tile.icon && <tile.icon className="size-4" />}
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  )
}
