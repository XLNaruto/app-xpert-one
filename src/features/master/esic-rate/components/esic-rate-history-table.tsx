import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { ESIC_RATE_VALUE_FIELDS } from '../constants'
import {
  formatEffectiveDate,
  formatEsicRateValue,
  formatMonth,
} from '../lib/esic-rate-mappers'
import type { EsicRate } from '../types'

/**
 * Read-only log of previously saved slabs, shown under the form so whoever is
 * keying a new rate can see what it supersedes without leaving the screen.
 */
export function EsicRateHistoryTable({
  rows,
  isLoading,
}: {
  rows: EsicRate[]
  isLoading?: boolean
}) {
  const columns = useMemo<ColumnDef<EsicRate>[]>(
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
      ...ESIC_RATE_VALUE_FIELDS.map<ColumnDef<EsicRate>>((field) => ({
        accessorKey: field.key,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={field.title} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatEsicRateValue(row.original[field.key], field.kind),
      })),
      {
        accessorKey: 'contributionEndPeriod1',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contribution Period 1" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.contributionEndPeriod1),
      },
      {
        accessorKey: 'contributionEndPeriod2',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contribution Period 2" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.contributionEndPeriod2),
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
      emptyMessage="No earlier ESIC rates yet."
    />
  )
}
