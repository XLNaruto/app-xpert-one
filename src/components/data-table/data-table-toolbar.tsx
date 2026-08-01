import type { Table } from '@tanstack/react-table'
import { FilterBar } from '@/components/common/filter-bar'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  /** Column id to filter with the search box. Omit to filter across all columns. */
  searchColumn?: string
  searchPlaceholder?: string
  /**
   * Controlled search text. Supply both and the term is owned by the caller
   * (server-side search, so it spans every page); omit and the box filters the
   * rows the table already holds.
   */
  value?: string
  onChange?: (value: string) => void
}

/**
 * Search/filter toolbar. Sends the term to the caller when controlled,
 * otherwise filters a single column (`searchColumn`) or falls back to the
 * table-wide global filter. Renders the shared `FilterBar` (search-only — no
 * facets) so every list screen reads the same.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder = 'Search...',
  value: controlledValue,
  onChange,
}: DataTableToolbarProps<TData>) {
  const controlled = onChange != null
  const column = searchColumn ? table.getColumn(searchColumn) : undefined

  const value = controlled
    ? (controlledValue ?? '')
    : searchColumn
      ? ((column?.getFilterValue() as string) ?? '')
      : ((table.getState().globalFilter as string) ?? '')

  const setValue = (next: string) => {
    if (controlled) {
      onChange(next)
      return
    }
    if (searchColumn) column?.setFilterValue(next)
    else table.setGlobalFilter(next)
  }

  return (
    <FilterBar
      search={{ value, onChange: setValue, placeholder: searchPlaceholder }}
      onReset={() => setValue('')}
    />
  )
}
