import { FileSpreadsheet } from 'lucide-react'
import type { ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { REPORT_PAGE_SIZE, REPORT_PAGE_SIZE_OPTIONS } from '../constants'

/**
 * How a report is read once it's on screen: the search box, the order, and the
 * page. Every one of the twelve takes exactly this, so it's one prop bag rather
 * than twelve identical prop lists.
 *
 * All three are SERVER-side. A report is a page of a month-wide aggregation, so
 * filtering or sorting the rows already fetched would answer a question about
 * this page rather than about the report — and a register's "first twenty by net
 * pay" has to mean the first twenty of the month.
 */
export interface ReportTableProps {
  isLoading: boolean
  limit: number
  offset: number
  /** Rows matching the filter across every page. */
  total: number
  onPaginationChange: (params: { limit: number; offset: number }) => void
  searchValue: string
  onSearchChange: (value: string) => void
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  /** What this type's search box matches on — it differs per endpoint. */
  searchPlaceholder: string
  /** Noun for the footer summary and the empty state. */
  itemName: string
}

/**
 * The table every report type renders into.
 *
 * A type supplies only its own columns and rows; paging, ordering, the search
 * box and the empty state are identical across all twelve and live here. The
 * columns stay with each type — they're the only thing that actually differs.
 */
export function ReportTable<TRow>({
  columns,
  rows,
  isLoading,
  limit,
  offset,
  total,
  onPaginationChange,
  searchValue,
  onSearchChange,
  sorting,
  onSortingChange,
  searchPlaceholder,
  itemName,
}: { columns: ColumnDef<TRow>[]; rows: TRow[] } & ReportTableProps) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      itemName={itemName}
      pageSize={REPORT_PAGE_SIZE}
      pageSizeOptions={REPORT_PAGE_SIZE_OPTIONS}
      serverPagination
      limit={limit}
      offset={offset}
      total={total}
      onPaginationChange={onPaginationChange}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      manualSorting
      sorting={sorting}
      onSortingChange={onSortingChange}
      emptyState={
        <EmptyState
          icon={FileSpreadsheet}
          title={searchValue ? 'No matching records' : 'Nothing to report'}
          description={
            searchValue
              ? 'Try a different name, code or number.'
              : `No ${itemName} matched these filters. The report reads only months already processed — run the month from Calculate Salary first.`
          }
        />
      }
    />
  )
}
