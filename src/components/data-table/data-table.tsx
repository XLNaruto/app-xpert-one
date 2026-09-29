import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowData,
  type Table as TanStackTable,
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
import {
  ALL_PAGE_SIZE,
  DataTablePagination,
  INFINITE_BATCH_SIZE,
} from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra classes for this column's header + cells (e.g. `w-px whitespace-nowrap` to shrink to content). */
    className?: string
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    /**
     * Position of `data[0]` in the full list: the page offset when paged, 0 in
     * "All" mode (where `data` holds every batch loaded so far). Read it through
     * `rowNumber()` rather than adding the list hook's `offset` yourself.
     */
    rowOffset?: number
  }
}

/**
 * A row's 1-based serial number in the whole list, for "Sr No." columns:
 * `cell: ({ row, table }) => rowNumber(row, table)`. Correct on every page and
 * in "All" mode, where the hook's `offset` is the latest batch's rather than 0.
 */
export function rowNumber<TData>(row: Row<TData>, table: TanStackTable<TData>) {
  return (table.options.meta?.rowOffset ?? 0) + row.index + 1
}

/**
 * Body height cap for every table that shows a pager. The header sticks and the
 * rows scroll inside, which is also what lets "All" load as the user scrolls.
 * Pass `maxHeight` to override it.
 */
export const DEFAULT_TABLE_MAX_HEIGHT = 'max(20rem, calc(100dvh - 18rem))'

/** One batch of rows loaded in "All" mode, and the offset it was requested at. */
interface RowBatch<T> {
  offset: number
  rows: T[]
}

/** The same rows in the same order: the array itself or every element matches. */
function sameRows<T>(a: readonly T[], b: readonly T[]) {
  return a === b || (a.length === b.length && a.every((row, i) => row === b[i]))
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
  /**
   * Cap the table body height; enables vertical scroll with a sticky header.
   * Defaults to `DEFAULT_TABLE_MAX_HEIGHT` whenever the pager is shown.
   */
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
   * Infinite-scroll ("All") support. Picking "All" in the footer never fetches
   * every row at once; it loads `INFINITE_BATCH_SIZE` rows and appends the next
   * batch as the user scrolls near the bottom:
   *
   * - **Server-paged tables** do this on their own. The table asks for
   *   `{ limit: 100, offset }` through `onPaginationChange` and keeps each batch
   *   as it arrives, so a feature's plain paged query needs no changes.
   * - **Client-paged tables** already have every row, so they only render 100
   *   more per scroll.
   * - **A caller that supplies `onLoadMore`** takes over: it appends each batch
   *   to `data` itself (e.g. with `useInfiniteQuery`), and the table calls it
   *   while `hasMore` is true and `isFetchingMore` is false.
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

  // --- "All" on a server-paged table --------------------------------------
  // Unless the caller supplies `onLoadMore`, the table fetches "All" itself as
  // a series of 100-row pages. `lazyAll` marks that mode; `batches` holds the
  // pages received so far, in order of offset.
  const lazyServer = serverPagination && onLoadMore == null
  const [lazyAll, setLazyAll] = useState(false)
  const [batches, setBatches] = useState<RowBatch<TData>[]>([])
  // The rows on screen when "All" was picked. The feature's query keeps them
  // as placeholder data until the first batch arrives, and they must not be
  // stored as that batch.
  const entryRowsRef = useRef<TData[] | null>(null)
  // Where those rows sat in the list, so they keep their serial numbers.
  const entryOffsetRef = useRef(0)

  const startLazyAll = () => {
    // If the page on screen already holds every row from the top, it IS the
    // first batch. (A mock store can hand back the very same row objects, so
    // it would otherwise look like placeholder data forever.)
    const holdsAll = offset === 0 && total != null && data.length >= total
    entryRowsRef.current = holdsAll ? null : data
    entryOffsetRef.current = offset
    setBatches(holdsAll ? [{ offset: 0, rows: data }] : [])
    setLazyAll(true)
    onPaginationChange?.({ limit: INFINITE_BATCH_SIZE, offset: 0 })
  }

  const stopLazyAll = () => {
    entryRowsRef.current = null
    setBatches([])
    setLazyAll(false)
  }

  // A caller can open on "All" (limit = ALL_PAGE_SIZE) or change the limit
  // itself; keep the mode in step with the `limit` it actually sends.
  useEffect(() => {
    if (!lazyServer) return
    if (limit === ALL_PAGE_SIZE && !lazyAll) startLazyAll()
    else if (lazyAll && limit !== ALL_PAGE_SIZE && limit !== INFINITE_BATCH_SIZE) stopLazyAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazyServer, limit])

  // Store each batch as it arrives. With `keepPreviousData` the rows for the
  // new offset show up only after a render that still holds the previous rows,
  // so rows matching a batch we already have are treated as the placeholder.
  useEffect(() => {
    if (!lazyAll || isLoading) return
    const here = batches.find((batch) => batch.offset === offset)
    if (here && sameRows(here.rows, data)) {
      // We are back on a batch we already hold (a reset to the top). Drop any
      // batches after it, because they belong to the old scroll.
      if (batches.some((batch) => batch.offset > offset)) {
        setBatches(batches.filter((batch) => batch.offset <= offset))
      }
      return
    }
    // An empty result is never a placeholder, since the rows it would stand
    // in for were non-empty.
    const isPlaceholder =
      data.length > 0 &&
      (batches.some((batch) => sameRows(batch.rows, data)) ||
      (entryRowsRef.current != null && sameRows(entryRowsRef.current, data)))
    if (isPlaceholder) return
    entryRowsRef.current = null
    // A batch at this offset replaces what was there and anything after it,
    // since an earlier offset means the list restarted (search, sort, refetch).
    setBatches([...batches.filter((batch) => batch.offset < offset), { offset, rows: data }])
  }, [lazyAll, isLoading, data, offset, batches])

  // Rows added or removed shift every later offset, so the batches no longer
  // line up. Start the scroll again from the top.
  const prevTotalRef = useRef(total)
  useEffect(() => {
    const prev = prevTotalRef.current
    prevTotalRef.current = total
    if (!lazyAll || prev == null || total == null || prev === total || offset === 0) return
    onPaginationChange?.({ limit: INFINITE_BATCH_SIZE, offset: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const lazyRows = useMemo(() => batches.flatMap((batch) => batch.rows), [batches])
  const lastBatch = batches.at(-1)
  // The table always requests the next batch by moving `offset`, so it is
  // still loading while it holds no batch at the current offset.
  const lazyWaiting = lazyAll && !batches.some((batch) => batch.offset === offset)
  const lazyNextOffset = lastBatch ? lastBatch.offset + lastBatch.rows.length : 0
  const lazyHasMore =
    lazyAll &&
    !lazyWaiting &&
    lastBatch != null &&
    lastBatch.rows.length > 0 &&
    lazyNextOffset < (total ?? 0)

  // Until the first batch lands, keep the previous page on screen.
  const tableData = lazyAll && batches.length > 0 ? lazyRows : data

  // Serial-number base for `rowNumber()`: `data[0]`'s place in the full list.
  const rowOffset = !serverPagination
    ? 0
    : lazyAll
      ? batches.length > 0
        ? 0
        : entryOffsetRef.current
      : offset

  // TanStack pages by index; the API pages by offset. Convert at this boundary
  // so features only ever deal in limit/offset.
  const serverPaginationState = useMemo<PaginationState>(() => {
    if (lazyAll) return { pageIndex: 0, pageSize: ALL_PAGE_SIZE }
    const size = limit ?? pageSize
    return {
      pageIndex: size > 0 ? Math.floor(offset / size) : 0,
      pageSize: size,
    }
  }, [lazyAll, limit, offset, pageSize])

  const pagination = serverPagination ? serverPaginationState : internalPagination

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (!serverPagination) {
      setInternalPagination(updater)
      return
    }
    const next = typeof updater === 'function' ? updater(pagination) : updater
    if (lazyServer && next.pageSize === ALL_PAGE_SIZE) {
      if (!lazyAll) startLazyAll()
      return
    }
    if (lazyAll) stopLazyAll()
    onPaginationChange?.({
      limit: next.pageSize,
      offset: next.pageSize > 0 ? next.pageIndex * next.pageSize : 0,
    })
  }

  // Deleting the last row of the last page (or a search narrowing the result
  // set) can leave the offset past the end — step back to the final page
  // instead of showing an empty table with a pager that says otherwise.
  useEffect(() => {
    // In "All" mode the total effect above restarts the scroll instead.
    if (!serverPagination || lazyAll || total == null || total === 0) return
    const size = limit ?? pageSize
    if (size > 0 && offset >= total) {
      onPaginationChange?.({ limit: size, offset: Math.floor((total - 1) / size) * size })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPagination, lazyAll, total, offset, limit])

  const table = useReactTable({
    data: tableData,
    columns,
    meta: { rowOffset },
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

  // --- "All" on a client-paged table --------------------------------------
  // Every row is already in memory, so "All" renders 100 more per scroll
  // instead of mounting thousands of rows at once. This also sidesteps
  // TanStack's pager, which slices `(0, -1)` for the "All" sentinel.
  const clientAll =
    !serverPagination && !hidePagination && internalPagination.pageSize === ALL_PAGE_SIZE
  const [visibleCount, setVisibleCount] = useState(INFINITE_BATCH_SIZE)

  // Re-sorting or filtering yields a different list, so start again from the top.
  useEffect(() => {
    setVisibleCount(INFINITE_BATCH_SIZE)
  }, [clientAll, sorting, columnFilters, globalFilter])

  const clientAllRows = clientAll ? table.getPrePaginationRowModel().rows : null
  const rows = clientAllRows ? clientAllRows.slice(0, visibleCount) : table.getRowModel().rows

  // Hide the pagination footer when there's nothing to page through.
  const hasRows = rows.length > 0
  const isEmpty = !isLoading && !hasRows

  // Infinite ("All") mode, in whichever of the three variants applies.
  const externalAll = onLoadMore != null && pagination.pageSize === ALL_PAGE_SIZE
  const isInfinite = externalAll || lazyAll || clientAll
  const canLoadMore = externalAll
    ? hasMore
    : lazyAll
      ? lazyHasMore
      : clientAll && clientAllRows != null && visibleCount < clientAllRows.length
  const loadingMore = externalAll ? isFetchingMore : lazyWaiting

  const loadMore = () => {
    if (externalAll) onLoadMore?.()
    else if (lazyAll) onPaginationChange?.({ limit: INFINITE_BATCH_SIZE, offset: lazyNextOffset })
    else if (clientAll) setVisibleCount((count) => count + INFINITE_BATCH_SIZE)
  }

  // Scroll container ref + near-bottom detection that drives `loadMore`.
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  const maybeLoadMore = useCallback(() => {
    const el = scrollRef.current
    if (!el || !isInfinite || !canLoadMore || loadingMore) return
    // Trigger when within ~150px of the bottom so the next batch is ready
    // before the user hits the very end.
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreRef.current()
    }
  }, [isInfinite, canLoadMore, loadingMore])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isInfinite) return
    el.addEventListener('scroll', maybeLoadMore)
    // Content shorter than the viewport never scrolls — kick a check so the
    // next batch still loads until the container fills or data runs out.
    maybeLoadMore()
    return () => el.removeEventListener('scroll', maybeLoadMore)
  }, [isInfinite, maybeLoadMore, rows.length])

  // Visible width of the scroll container, tracked so the empty state and the
  // "Loading more…" row can be as wide as what the user actually sees.
  const [viewportWidth, setViewportWidth] = useState<number>()
  const showLoadingMore = isInfinite && loadingMore
  const needsViewportWidth = isEmpty || showLoadingMore

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !needsViewportWidth) return
    const observer = new ResizeObserver(() => setViewportWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [needsViewportWidth])

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
        <Table
          maxHeight={maxHeight ?? (hidePagination ? undefined : DEFAULT_TABLE_MAX_HEIGHT)}
          containerRef={scrollRef}
        >
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
            ) : rows.length ? (
              <>
                {rows.map((row) => (
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
                {showLoadingMore ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="border-0 p-0">
                      {/* Pinned to the visible width, like the empty state, so
                          it stays centred on a horizontally scrolled table. */}
                      <div
                        className={cn(
                          'sticky left-0 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground',
                          viewportWidth == null && 'w-full',
                        )}
                        style={viewportWidth != null ? { width: viewportWidth } : undefined}
                      >
                        <Loader2 className="size-4 animate-spin" />
                        Loading more…
                      </div>
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
              loadedCount={rows.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}
