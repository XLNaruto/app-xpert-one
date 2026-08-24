import type { ColumnDef } from '@tanstack/react-table'

export function serialColumn<TRow>(offset: number): ColumnDef<TRow> {
  return {
    id: 'serial',
    header: 'Sr No.',
    enableSorting: false,
    meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">{offset + row.index + 1}</span>
    ),
  }
}
