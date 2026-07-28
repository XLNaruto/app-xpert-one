import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { LWF_LABELS } from '../constants'
import { formatAmount, formatEffectiveDate, formatMonth } from '../lib/lwf-rate-mappers'
import type { LwfRate } from '../types'

/**
 * Read-only log of the selected state's earlier rates, shown under the form so
 * whoever is keying a new contribution can see what it supersedes without
 * leaving the screen.
 */
export function LwfRateHistoryTable({
  rows,
  isLoading,
}: {
  rows: LwfRate[]
  isLoading?: boolean
}) {
  const columns = useMemo<ColumnDef<LwfRate>[]>(
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
      {
        accessorKey: 'month',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={LWF_LABELS.month} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        accessorKey: 'employeeContribution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={LWF_LABELS.employeeContribution} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.employeeContribution),
      },
      {
        accessorKey: 'employerContribution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={LWF_LABELS.employerContribution} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.employerContribution),
      },
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
      emptyMessage="No earlier LWF rates for this state yet."
    />
  )
}
