import type { ColumnDef } from '@tanstack/react-table'
import { TableRowActions } from '@/components/common/table-row-actions'
import { DataTableColumnHeader } from '@/components/data-table'
import type { Department } from '../types'

interface DepartmentColumnActions {
  onEdit: (record: Department) => void
  onDelete: (record: Department) => void
}

/** Column definitions for the department master list. */
export function departmentColumns({
  onEdit,
  onDelete,
}: DepartmentColumnActions): ColumnDef<Department>[] {
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
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <TableRowActions
          onEdit={() => onEdit(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    },
    {
      accessorKey: 'departmentName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.departmentName}</span>
      ),
    },
    {
      accessorKey: 'departmentCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.departmentCode}</span>
      ),
    },
    {
      accessorKey: 'branch',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
    },
    {
      accessorKey: 'monthStartDate',
      header: 'Month Start Date',
    },
  ]
}
