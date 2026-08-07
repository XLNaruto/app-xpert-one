import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { SALARY_PAGE_SIZE_OPTIONS } from '../constants'

interface SalaryPagerProps {
  limit: number
  offset: number
  /** Rows on the side being shown, across every page. */
  total: number
  onPaginationChange: (next: { limit: number; offset: number }) => void
}

/**
 * The register's pager.
 *
 * Its own rather than `<DataTablePagination>`, which drives a TanStack table
 * instance — the register is a hand-laid form grid with pinned columns and a
 * grand-total row, not a `<DataTable>`, so there is no table object to read the
 * page state off. The paging contract is the app's usual one all the same:
 * server-side `limit`/`offset`, with `total` counting every page.
 *
 * There is no "All" option. The save endpoint takes 500 rows and the register
 * caps `limit` at 200, so a page is also the unit a payroll run is committed in.
 */
export function SalaryPager({ limit, offset, total, onPaginationChange }: SalaryPagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const page = Math.floor(offset / limit) + 1
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(total, offset + limit)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground tabular-nums">{from}</span> to{' '}
        <span className="font-medium text-foreground tabular-nums">{to}</span> of{' '}
        <span className="font-medium text-foreground tabular-nums">{total}</span> employees
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows</span>
          <Combobox
            value={String(limit)}
            /* A different page size re-slices the register — start again at the
               first page rather than land mid-way through a run. */
            onChange={(value) => onPaginationChange({ limit: Number(value), offset: 0 })}
            options={SALARY_PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            searchable={false}
            className="w-20"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPaginationChange({ limit, offset: Math.max(0, offset - limit) })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-1 text-xs tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPaginationChange({ limit, offset: offset + limit })}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
