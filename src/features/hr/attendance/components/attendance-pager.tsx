import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

interface AttendancePagerProps {
  limit: number
  offset: number
  /** Rows across every page, on the side being shown. */
  total: number
  onPaginationChange: (next: { limit: number; offset: number }) => void
  /** Noun for the summary line — "departments", "employees". */
  itemName: string
  pageSizeOptions: number[]
}

/**
 * Build a compact page list with ellipses, e.g. [1, 2, 3, 4, 5, '…', 16].
 * Same window as `<DataTablePagination>` so both footers read identically.
 */
function pageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('ellipsis')
  pages.push(total)
  return pages
}

/**
 * The pager for both attendance screens.
 *
 * Its own rather than `<DataTablePagination>`, which drives a TanStack table
 * instance: neither screen is a `<DataTable>` — one is a grid of cards, the
 * other a list of rows — so there is no table object to read page state off.
 * The paging contract is the app's usual one all the same: server-side
 * `limit`/`offset`, with `total` counting every page, and the footer is laid
 * out to match the generic one row for row.
 *
 * There is no "All": both endpoints cap `limit` at 100 and a company can hold
 * tens of thousands of employees, so a size the API would refuse doesn't belong
 * in the selector.
 */
export function AttendancePager({
  limit,
  offset,
  total,
  onPaginationChange,
  itemName,
  pageSizeOptions,
}: AttendancePagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const page = Math.floor(offset / limit) + 1
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(total, offset + limit)

  const goToPage = (next: number) =>
    onPaginationChange({ limit, offset: (next - 1) * limit })

  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:items-center">
      {/* Left: summary */}
      <p className="text-sm text-muted-foreground sm:justify-self-start">
        Showing <span className="font-medium tabular-nums text-foreground">{from}</span> to{' '}
        <span className="font-medium tabular-nums text-foreground">{to}</span> of{' '}
        <span className="font-medium tabular-nums text-foreground">{total}</span> {itemName}
      </p>

      {/* Controls + page size share one row on mobile; `contents` restores the
          3-column grid on sm+ so each lands in its own column. */}
      <div className="flex items-center justify-between sm:contents">
        {/* Center: page controls — hidden when everything fits on one page. */}
        {pageCount > 1 ? (
          <div className="flex items-center gap-1 sm:justify-self-center">
            <Button
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer rounded-sm border-border/50"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>

            {pageList(page, pageCount).map((p, i) =>
              p === 'ellipsis' ? (
                <span
                  key={`e-${i}`}
                  className="px-1.5 text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    'size-8 cursor-pointer rounded-sm border-border/50 text-xs tabular-nums',
                    p !== page && 'font-normal',
                  )}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer rounded-sm border-border/50"
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => goToPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : (
          <div aria-hidden="true" />
        )}

        {/* Right: page size */}
        <div className="sm:justify-self-end">
          <Combobox
            className="w-17 border-border/50"
            align="end"
            searchable={false}
            value={String(limit)}
            /* A different page size re-slices the list — start again at the
               first page rather than land mid-way through it. */
            onChange={(value) => onPaginationChange({ limit: Number(value), offset: 0 })}
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
