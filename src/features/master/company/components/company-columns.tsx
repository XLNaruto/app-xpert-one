import type { ColumnDef } from '@tanstack/react-table'
import { TableRowActions } from '@/components/common/table-row-actions'
import { DataTableColumnHeader } from '@/components/data-table'
import type { Company } from '../types'

interface CompanyColumnActions {
  onView: (company: Company) => void
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
}

/** Column definitions for the company list table. */
export function companyColumns({
  onView,
  onEdit,
  onDelete,
}: CompanyColumnActions): ColumnDef<Company>[] {
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
          onView={() => onView(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    },
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Name" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.companyName}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'companyCode',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.companyCode}</span>
      ),
    },
    {
      accessorKey: 'establishYear',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Est. Year" />
      ),
    },
    {
      accessorKey: 'state',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => (
        <span>
          {[row.original.city, row.original.state].filter(Boolean).join(', ')}
        </span>
      ),
    },
    {
      accessorKey: 'mobile1',
      header: 'Mobile',
    },
  ]
}
