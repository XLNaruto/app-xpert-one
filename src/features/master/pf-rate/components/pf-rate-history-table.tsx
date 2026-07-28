import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PF_RATE_VALUE_FIELDS } from '../constants'
import { formatEffectiveDate, formatPfRateValue } from '../lib/pf-rate-mappers'
import type { PfRate } from '../types'

/**
 * Read-only log of previously saved slabs, shown under the form so whoever is
 * keying a new rate can see what it supersedes without leaving the screen.
 */
export function PfRateHistoryTable({
  rows,
  isLoading,
}: {
  rows: PfRate[]
  isLoading?: boolean
}) {
  const columns = useMemo<ColumnDef<PfRate>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: 'wef',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Effective Date" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {formatEffectiveDate(row.original.wef)}
          </span>
        ),
      },
      ...PF_RATE_VALUE_FIELDS.map<ColumnDef<PfRate>>((field) => ({
        accessorKey: field.key,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={field.title} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatPfRateValue(row.original[field.key], field.kind),
      })),
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      itemName="records"
      pageSize={5}
      pageSizeOptions={[5, 10, 25]}
      emptyMessage="No earlier PF rates yet."
    />
  )
}
