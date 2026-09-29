import type { ColumnDef } from '@tanstack/react-table'
import { rowNumber } from '@/components/data-table'

export function serialColumn<TRow>(): ColumnDef<TRow> {
  return {
    id: 'serial',
    header: 'Sr No.',
    enableSorting: false,
    meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
    cell: ({ row, table }) => (
      <span className="text-sm text-muted-foreground tabular-nums">{rowNumber(row, table)}</span>
    ),
  }
}
