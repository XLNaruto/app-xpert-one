import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { SLAB_LABELS } from '../constants'
import {
  formatAmount,
  formatEffectiveDate,
  formatMonth,
  formatSalaryRange,
} from '../lib/pt-rate-mappers'
import type { PtRateSlabRow } from '../types'

/**
 * Read-only log of the selected state's earlier slabs, shown under the form so
 * whoever is keying a new rate can see what it supersedes without leaving the
 * screen. One row per band, newest effective date first.
 */
export function PtRateHistoryTable({
  rows,
  isLoading,
}: {
  rows: PtRateSlabRow[]
  isLoading?: boolean
}) {
  const columns = useMemo<ColumnDef<PtRateSlabRow>[]>(
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
        id: 'salaryRange',
        accessorFn: (row) => row.minSalary,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Salary Range" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatSalaryRange(row.original),
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={SLAB_LABELS.amount} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.amount),
      },
      {
        accessorKey: 'month',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={SLAB_LABELS.month} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        accessorKey: 'gender',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={SLAB_LABELS.gender} />
        ),
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'minAge',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={SLAB_LABELS.minAge} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.minAge ?? '—',
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      itemName="slabs"
      pageSize={5}
      pageSizeOptions={[5, 10, 25]}
      emptyMessage="No earlier PT rates for this state yet."
    />
  )
}
