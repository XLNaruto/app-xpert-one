import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { ALLOWANCE_DEDUCTION_LABELS, TYPE_LABELS } from '../constants'
import { useAllowanceDeductionList } from '../hooks/use-allowance-deduction-list'
import type { AllowanceDeduction } from '../types'

/** Allowance & deduction master — list with add/edit/delete. */
export function AllowanceDeductionListPage() {
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
  } = useAllowanceDeductionList()

  const columns = useMemo<ColumnDef<AllowanceDeduction>[]>(
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
        accessorKey: 'type',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={ALLOWANCE_DEDUCTION_LABELS.type}
          />
        ),
        cell: ({ row }) => TYPE_LABELS[row.original.type],
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={ALLOWANCE_DEDUCTION_LABELS.name}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'shortName',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={ALLOWANCE_DEDUCTION_LABELS.shortName}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.shortName}</span>
        ),
      },
      ...auditColumns<AllowanceDeduction>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Allowance & Deduction"
        description="Manage your allowance and deduction master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add Allowance / Deduction
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load records."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="name"
          searchPlaceholder="Search name…"
          itemName="records"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Wallet}
              title="No records yet"
              description="Create your first allowance or deduction to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add Allowance / Deduction
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
        icon={Wallet}
        title="Delete record?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently removed.`
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
