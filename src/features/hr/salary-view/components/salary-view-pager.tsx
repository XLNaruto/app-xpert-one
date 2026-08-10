import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { SALARY_VIEW_PAGE_SIZE_OPTIONS } from '../constants'

interface SalaryViewPagerProps {
  limit: number
  offset: number
  /** Stored salaries matching the filters, across every page. */
  total: number
  onPaginationChange: (next: { limit: number; offset: number }) => void
}

/**
 * The long view's pager.
 *
 * Its own rather than `<DataTablePagination>`, which reads its state off a
 * TanStack table instance — the matrix is a hand-laid grid with a spanning
 * header and a pinned column, not a `<DataTable>`, so there is no table object
 * to read. The paging contract is the app's usual one all the same: server-side
 * `limit`/`offset`, with `total` counting every page.
 *
 * There is no "All": the report caps `limit` at 500, and a matrix this wide is
 * read a page at a time anyway.
 */
export function SalaryViewPager({
  limit,
  offset,
  total,
  onPaginationChange,
}: SalaryViewPagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const page = Math.floor(offset / limit) + 1
  const lastOffset = (pageCount - 1) * limit

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Combobox
            value={String(limit)}
            /* A different page size re-slices the report — start again at the
               first page rather than land mid-way through it. */
            onChange={(value) => onPaginationChange({ limit: Number(value), offset: 0 })}
            options={SALARY_VIEW_PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            searchable={false}
            className="w-20"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Total records:{' '}
          <span className="font-medium tabular-nums text-foreground">{total}</span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        <PageButton
          label="First page"
          icon={ChevronsLeft}
          disabled={page <= 1}
          onClick={() => onPaginationChange({ limit, offset: 0 })}
        />
        <PageButton
          label="Previous page"
          icon={ChevronLeft}
          disabled={page <= 1}
          onClick={() =>
            onPaginationChange({ limit, offset: Math.max(0, offset - limit) })
          }
        />
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <PageButton
          label="Next page"
          icon={ChevronRight}
          disabled={page >= pageCount}
          onClick={() => onPaginationChange({ limit, offset: offset + limit })}
        />
        <PageButton
          label="Last page"
          icon={ChevronsRight}
          disabled={page >= pageCount}
          onClick={() => onPaginationChange({ limit, offset: lastOffset })}
        />
      </div>
    </div>
  )
}

function PageButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string
  icon: typeof ChevronLeft
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-8 cursor-pointer rounded-sm border-border/50"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </Button>
  )
}
