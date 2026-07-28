import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from './data-table-column-header'
import { formatDateTime } from '@/lib/utils'
import type { AuditFields } from '@/types/audit'

/** Stacked audit cell — timestamp on top, the person who did it underneath. */
function AuditStack({ at, by }: { at: string | null; by: string | null }) {
  if (!at && !by) return <span className="text-muted-foreground">—</span>
  return (
    <div className="leading-tight">
      <span className="block text-sm text-foreground">{formatDateTime(at)}</span>
      <span className="block text-sm font-semibold text-foreground">{by || '—'}</span>
    </div>
  )
}

/**
 * The two trailing audit columns shared by every list table — "Updated" then
 * "Created", each showing the timestamp with the responsible user below it.
 * Spread these in last: `...auditColumns<Branch>()`.
 */
export function auditColumns<T extends AuditFields>(): ColumnDef<T>[] {
  return [
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => (
        <AuditStack at={row.original.updatedAt} by={row.original.updatedBy} />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => (
        <AuditStack at={row.original.createdAt} by={row.original.createdBy} />
      ),
    },
  ]
}
