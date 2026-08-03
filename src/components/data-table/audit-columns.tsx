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
 * Which audit columns a server-sorted table can order by, and under which API
 * field name — e.g. `{ createdAt: 'created_at' }`. On those tables a header the
 * endpoint can't sort must not offer the control, so anything left out here
 * renders as plain text.
 */
export interface AuditSortFields {
  updatedAt?: string
  createdAt?: string
}

/**
 * The two trailing audit columns shared by every list table — "Updated" then
 * "Created", each showing the timestamp with the responsible user below it.
 * Spread these in last: `...auditColumns<Branch>()`.
 *
 * Pass `serverSort` on a `manualSorting` table: each column then takes its API
 * field name as its column id, and the ones the endpoint can't sort lose their
 * sort control. Omit it on client-sorted tables — both columns stay sortable.
 */
export function auditColumns<T extends AuditFields>(
  serverSort?: AuditSortFields,
): ColumnDef<T>[] {
  /** `id` + `enableSorting` for one audit column under the current mode. */
  const sortProps = (field: keyof AuditSortFields) => {
    if (!serverSort) return {}
    const sortId = serverSort[field]
    return sortId ? { id: sortId } : { enableSorting: false }
  }

  return [
    {
      accessorKey: 'updatedAt',
      ...sortProps('updatedAt'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => (
        <AuditStack at={row.original.updatedAt} by={row.original.updatedBy} />
      ),
    },
    {
      accessorKey: 'createdAt',
      ...sortProps('createdAt'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => (
        <AuditStack at={row.original.createdAt} by={row.original.createdBy} />
      ),
    },
  ]
}
