import type { ColumnDef } from '@tanstack/react-table'
import { TableRowActions } from '@/components/common/table-row-actions'
import { DataTableColumnHeader } from '@/components/data-table'
import type { DistrictRecord } from '../types'

interface DistrictColumnActions {
  onEdit: (record: DistrictRecord) => void
  onDelete: (record: DistrictRecord) => void
}

/** Column definitions for the district master list. */
export function districtColumns({
  onEdit,
  onDelete,
}: DistrictColumnActions): ColumnDef<DistrictRecord>[] {
  return [
    {
      id: 'serial',
      header: '#',
      meta: { className: 'w-px whitespace-nowrap text-muted-foreground' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.index + 1}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="text-xs font-medium uppercase">Actions</span>,
      meta: { className: 'w-px whitespace-nowrap w-40 min-w-40 max-w-40' },
      cell: ({ row }) => (
        <TableRowActions
          onEdit={() => onEdit(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    },
    {
      accessorKey: 'districtName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="District Name" />,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.districtName}</span>
      ),
    },
    {
      accessorKey: 'state',
      header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
    },
  ]
}
