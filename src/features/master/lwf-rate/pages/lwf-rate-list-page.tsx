import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { HandCoins, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { LWF_LABELS } from '../constants'
import { formatAmount, formatEffectiveDate, formatMonth } from '../lib/lwf-rate-mappers'
import { useLwfRateList } from '../hooks/use-lwf-rate-list'
import type { LwfRate } from '../types'

/** LWF rate master — one row per state revision, with add/edit/delete. */
export function LwfRateListPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useLwfRateList()

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
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={() => goToEdit(row.original.id)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'wef',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="LWF Wage Effective Date" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {formatEffectiveDate(row.original.wef)}
          </span>
        ),
      },
      {
        accessorKey: 'stateName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'month',
        header: LWF_LABELS.month,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        accessorKey: 'employeeContribution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee LWF Contribution" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.employeeContribution),
      },
      {
        accessorKey: 'employerContribution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employer LWF Contribution" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.employerContribution),
      },
      ...auditColumns<LwfRate>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="LWF Rate Setting"
        description="Manage Labour Welfare Fund contributions by state and effective date."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add LWF Rate
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load LWF rates."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search LWF rate…"
          itemName="LWF rates"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={HandCoins}
              title="No LWF rates yet"
              description="Add your first Labour Welfare Fund contribution to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add LWF Rate
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={HandCoins}
        title="Delete LWF rate?"
        description={
          pendingDelete
            ? `The ${pendingDelete.stateName} rate effective ${formatEffectiveDate(pendingDelete.wef)} will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
