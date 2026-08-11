import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import {
  ALLOWANCE_DEDUCTION_LABELS,
  ALLOWANCE_DEDUCTION_SORT,
  TYPE_LABELS,
} from '../constants'
import { useAllowanceDeductionList } from '../hooks/use-allowance-deduction-list'
import type { AllowanceDeduction } from '../types'

/** Allowance & deduction master — list with add/edit/delete. */
export function AllowanceDeductionListPage() {
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
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

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.payComponents)

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
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // The endpoint can't order by type, so this header stays plain text.
        accessorKey: 'type',
        enableSorting: false,
        header: ALLOWANCE_DEDUCTION_LABELS.type,
        cell: ({ row }) => TYPE_LABELS[row.original.type],
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: ALLOWANCE_DEDUCTION_SORT.name,
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
        id: ALLOWANCE_DEDUCTION_SORT.shortName,
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
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<AllowanceDeduction>({
        createdAt: ALLOWANCE_DEDUCTION_SORT.createdAt,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="Allowance & Deduction"
        description="Manage your allowance and deduction master records."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add Allowance / Deduction
            </Button>
          )
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
          searchPlaceholder="Search short code or name…"
          itemName="records"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          emptyState={
            <EmptyState
              icon={Wallet}
              title={search ? 'No matching records' : 'No records yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Create your first allowance or deduction to get started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={goToCreate}>
                        <Plus className="size-4" />
                        Add Allowance / Deduction
                      </Button>
                    )
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
