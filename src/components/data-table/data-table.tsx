import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ALL_PAGE_SIZE, DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra classes for this column's header + cells (e.g. `w-px whitespace-nowrap` to shrink to content). */
    className?: string
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Show pulsing skeleton rows instead of data (initial fetch). */
  isLoading?: boolean
  /** How many skeleton rows to render while loading (defaults to `pageSize`). */
  skeletonRows?: number
  /** Optional empty-state message (used when `emptyState` is not given). */
  emptyMessage?: string
  /** Rich empty-state block rendered in place of `emptyMessage`. */
  emptyState?: ReactNode
  /** Render a compact table without pagination footer. */
  hidePagination?: boolean
  /** Column id to scope the search box to. Omit for a table-wide search. */
  searchColumn?: string
  /** Show the built-in search box with this placeholder. */
  searchPlaceholder?: string
  /** Custom toolbar rendered above the table (replaces the built-in search). */
  toolbar?: ReactNode
  /** Initial rows per page. Defaults to `DEFAULT_PAGE_SIZE`. */
  pageSize?: number
  /** Page-size choices; pass to show a "N / page" selector in the footer. */
  pageSizeOptions?: number[]
  /** Noun for the footer summary ("Showing 1 to 10 of 42 salesmen"). */
  itemName?: string
  /** Cap the table body height; enables vertical scroll with a sticky header. */
  maxHeight?: string
  className?: string
  /**
   * Server-side pagination, expressed the way the API pages: `limit` + `offset`.
   * When true, `data` is the current page (not sliced client-side) — supply
   * `limit`, `offset`, `total`, and `onPaginationChange`. Pair it with
   * `usePagination()` in the feature's list hook.
   */
  serverPagination?: boolean
  /** Rows per page — the `limit` sent to the API (required when server-paged). */
  limit?: number
  /** Rows skipped — the `offset` sent to the API (required when server-paged). */
  offset?: number
  /** Total rows matching the query across all pages — drives the pager. */
  total?: number
  /** Called with the next `{ limit, offset }` when the user pages or resizes. */
  onPaginationChange?: (params: { limit: number; offset: number }) => void
  /**
   * Controlled search text. Supply both to filter server-side (the term is sent
   * with the page request); omit to let the toolbar filter loaded rows itself.
   */
  searchValue?: string
  onSearchChange?: (value: string) => void
  /**
   * Server-side sorting. When true, `data` is shown in server order; supply
   * `sorting` + `onSortingChange` so header clicks re-query rather than sort
   * the current page only.
   */
  manualSorting?: boolean
  /** Controlled sorting state (required when `manualSorting`). */
  sorting?: SortingState
  /** Sorting change handler (required when `manualSorting`). */
  onSortingChange?: OnChangeFn<SortingState>
  /**
   * Infinite-scroll ("All") support. When `onLoadMore` is supplied, the table
   * watches its scroll container and calls it as the user nears the bottom,
   * provided `hasMore` is true and a fetch isn't already in flight. Pair with a
   * feature hook that appends each batch to `data`. Only active while the page
   * size is `ALL_PAGE_SIZE`; the numeric pager is hidden and a loading row shows.
   */
  onLoadMore?: () => void
  /** Whether another batch remains to load (drives the scroll trigger). */
  hasMore?: boolean
  /** Whether the next batch is currently loading (shows a bottom loading row). */
  isFetchingMore?: boolean
}

/**
 * The ONE generic data table for every list screen (CLAUDE.md rule #7).
 * Feature screens supply `columns` + `data`; do not rebuild tables per feature.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  skeletonRows,
  emptyMessage = 'No results.',
  emptyState,
  hidePagination = false,
  searchColumn,
  searchPlaceholder,
  toolbar,
  pageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions,
  itemName,
  maxHeight,
  className,
  serverPagination = false,
  limit,
  offset = 0,
  total,
  onPaginationChange,
  searchValue,
  onSearchChange,
  manualSorting = false,
  sorting: sortingProp,
  onSortingChange,
  onLoadMore,
  hasMore = false,
  isFetchingMore = false,
}: DataTableProps<TData, TValue>) {
  // Sorting + pagination can be controlled by the caller (server-side) or fall
  // back to internal state (client-side). Controlled props win when supplied.
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const sorting = sortingProp ?? internalSorting

  // TanStack pages by index; the API pages by offset. Convert at this boundary
  // so features only ever deal in limit/offset.
  const serverPaginationState = useMemo<PaginationState>(() => {
    const size = limit ?? pageSize
    return {
      pageIndex: size > 0 ? Math.floor(offset / size) : 0,
      pageSize: size,
    }
  }, [limit, offset, pageSize])

  const pagination = serverPagination ? serverPaginationState : internalPagination

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (!serverPagination) {
      setInternalPagination(updater)
      return
    }
    const next = typeof updater === 'function' ? updater(pagination) : updater
    onPaginationChange?.({
      limit: next.pageSize,
      offset: next.pageSize > 0 ? next.pageIndex * next.pageSize : 0,
    })
  }

  // Deleting the last row of the last page (or a search narrowing the result
  // set) can leave the offset past the end — step back to the final page
  // instead of showing an empty table with a pager that says otherwise.
  useEffect(() => {
    if (!serverPagination || total == null || total === 0) return
    const size = limit ?? pageSize
    if (size > 0 && offset >= total) {
      onPaginationChange?.({ limit: size, offset: Math.floor((total - 1) / size) * size })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPagination, total, offset, limit])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    manualPagination: serverPagination,
    manualSorting,
    // The API sorts by a single `sort` field, so a shift-click mustn't build a
    // second sort the request has nowhere to put.
    enableMultiSort: !manualSorting,
    rowCount: serverPagination ? total : undefined,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel:
      hidePagination || serverPagination ? undefined : getPaginationRowModel(),
  })

  const showSearch = searchColumn != null || searchPlaceholder != null
  // Hide the pagination footer when there's nothing to page through.
  const hasRows = table.getRowModel().rows.length > 0
  const isEmpty = !isLoading && !hasRows

  // Infinite ("All") mode: active only when the caller wires up `onLoadMore`
  // AND the current page size is the "All" sentinel.
  const isInfinite = onLoadMore != null && pagination.pageSize === ALL_PAGE_SIZE

  // Scroll container ref + near-bottom detection that drives `onLoadMore`.
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  const maybeLoadMore = useCallback(() => {
    const el = scrollRef.current
    if (!el || !isInfinite || !hasMore || isFetchingMore) return
    // Trigger when within ~150px of the bottom so the next batch is ready
    // before the user hits the very end.
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreRef.current?.()
    }
  }, [isInfinite, hasMore, isFetchingMore])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isInfinite) return
    el.addEventListener('scroll', maybeLoadMore)
    // Content shorter than the viewport never scrolls — kick a check so the
    // next batch still loads until the container fills or data runs out.
    maybeLoadMore()
    return () => el.removeEventListener('scroll', maybeLoadMore)
  }, [isInfinite, maybeLoadMore])

  // Visible width of the scroll container, tracked so the empty state can be
  // as wide as what the user actually sees (see the empty row below).
  const [viewportWidth, setViewportWidth] = useState<number>()

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isEmpty) return
    const observer = new ResizeObserver(() => setViewportWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [isEmpty])

  return (
    <div className={cn('w-full space-y-4', className)}>
      {toolbar ??
        (showSearch && (
          <DataTableToolbar
            table={table}
            searchColumn={searchColumn}
            searchPlaceholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        ))}

      <div className="rounded-xl border border-border/50 bg-card shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]">
        <div className={cn('overflow-hidden', hidePagination || !hasRows ? 'rounded-xl' : 'rounded-t-xl')}>
        <Table maxHeight={maxHeight} containerRef={scrollRef}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({
                length: skeletonRows ?? (pageSize > 0 ? pageSize : 10),
              }).map((_, r) => (
                <TableRow key={`skeleton-${r}`} className="hover:bg-transparent">
                  {columns.map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full max-w-35" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="[&:last-child_td]:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.columnDef.meta?.className}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {isInfinite && isFetchingMore ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length}
                      className="border-0 py-4 text-center text-sm text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading more…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : null}
              </>
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="border-0 p-0">
                  {/*
                    A spanning <td> is as wide as the widest row, so on a
                    horizontally scrollable table centred content lands
                    off-screen. Pinning the block to the scroll container's
                    left edge at its visible width keeps it centred on screen.
                  */}
                  <div
                    className={cn(
                      'sticky left-0',
                      viewportWidth == null && 'w-full',
                      emptyState
                        ? undefined
                        : 'flex h-28 items-center justify-center text-sm text-muted-foreground',
                    )}
                    style={viewportWidth != null ? { width: viewportWidth } : undefined}
                  >
                    {emptyState ?? emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {!hidePagination && hasRows && (
          <div className="border-t border-border px-4 py-3">
            <DataTablePagination
              table={table}
              itemName={itemName}
              pageSizeOptions={pageSizeOptions}
              infinite={isInfinite}
              loadedCount={table.getRowModel().rows.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}
