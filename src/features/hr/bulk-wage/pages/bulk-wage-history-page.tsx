import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  useBulkWageHistoryList,
  HISTORY_PAGE_SIZE_OPTIONS,
} from '../hooks/use-bulk-wage-history-list'
import { BulkWageHistoryGrid } from '../components/bulk-wage-history-grid'

/**
 * Wage Structure History — the read-only twin of Bulk Update Wage.
 *
 * The bulk screen shows one row per designation, opened on what it is paid
 * today, and saving it writes a new version across the payroll. This screen
 * opens that up: the same forty columns in the same order, but a designation is
 * a block and every version it has ever been paid on is a row underneath it,
 * newest first.
 *
 * Nothing here is editable. A version is corrected from the designation master's
 * own Wage Structure tab, one designation at a time — a bulk screen has no
 * business rewriting a month that has already been paid.
 *
 * Paged over the designations, the way the endpoint pages: a title always
 * arrives with its complete history rather than half of it.
 */
export function BulkWageHistoryPage() {
  const navigate = useNavigate()
  const list = useBulkWageHistoryList()

  return (
    <>
      <PageHeader
        title="Wage Structure History"
        description="Every designation of the company with every wage version it has been paid on — read only."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/hr/bulk-wage' })}
          >
            <ArrowLeft className="size-4" />
            Back to Bulk Update Wage
          </Button>
        }
      />

      <div className="rounded-xl border border-border">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Designation Wise Wage History
              </h3>
              <p className="text-xs text-muted-foreground">
                One block per designation, one row per effective month. A version
                applied from its month onward until the one above it superseded it.
              </p>
            </div>
          </div>
        </div>

        <HistoryBody list={list} />

        {/* ── Footer: the pager ── */}
        <Pager list={list} />
      </div>
    </>
  )
}

/** The grid, or what stands in for it while there's nothing to show. */
function HistoryBody({ list }: { list: ReturnType<typeof useBulkWageHistoryList> }) {
  /* An owner signs in with no company until one is picked for the session. */
  if (list.companyId === null) {
    return (
      <EmptyState
        title="No company selected"
        description="Select a company for this session to read its wage structure history."
      />
    )
  }
  if (list.isLoading) {
    return (
      <p className="px-4 py-10 text-center text-xs text-muted-foreground">
        Loading the wage structure history…
      </p>
    )
  }
  if (list.isError) {
    return (
      <p className="px-4 py-10 text-center text-xs text-destructive">
        {list.error instanceof Error
          ? list.error.message
          : "Couldn't load the wage structure history."}
      </p>
    )
  }
  if (list.designations.length === 0) {
    return (
      <EmptyState
        title="No designations yet"
        description="This company has no designations, so there is no wage history to show. Add them under Master → Designation first."
      />
    )
  }

  /*
    Flush against the card — the grid brings its own gridlines and a pinned
    header, so padding here would only float it off the edges and read as a
    second frame inside the first.
  */
  return <BulkWageHistoryGrid designations={list.designations} heads={list.heads} />
}

/**
 * Paging, over designations rather than versions — `total` counts titles, which
 * is what the endpoint pages by.
 *
 * Hand-rolled rather than `<DataTablePagination>`: that one drives a TanStack
 * table instance, and this screen is a hand-built grid with no table behind it.
 */
function Pager({ list }: { list: ReturnType<typeof useBulkWageHistoryList> }) {
  const { limit, offset, total } = list
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(total, offset + limit)
  const hasPrevious = offset > 0
  const hasNext = offset + limit < total

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground tabular-nums">{from}</span>{' '}
        to <span className="font-medium text-foreground tabular-nums">{to}</span> of{' '}
        <span className="font-medium text-foreground tabular-nums">{total}</span>{' '}
        {total === 1 ? 'designation' : 'designations'}
        {list.isFetching && <span className="ml-2">· Loading…</span>}
      </p>

      <div className="flex items-center gap-2">
        <Combobox
          className="w-17 border-border/50"
          align="end"
          searchable={false}
          value={String(limit)}
          /* A different page size is a different first page — start it over. */
          onChange={(value) =>
            list.onPaginationChange({ limit: Number(value), offset: 0 })
          }
          options={HISTORY_PAGE_SIZE_OPTIONS.map((size) => ({
            label: String(size),
            value: String(size),
          }))}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Previous page"
          disabled={!hasPrevious}
          onClick={() =>
            list.onPaginationChange({ limit, offset: Math.max(0, offset - limit) })
          }
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Next page"
          disabled={!hasNext}
          onClick={() => list.onPaginationChange({ limit, offset: offset + limit })}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
