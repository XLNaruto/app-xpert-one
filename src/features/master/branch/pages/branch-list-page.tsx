import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { BRANCH_SORT } from '../constants'
import { useBranchList } from '../hooks/use-branch-list'
import type { Branch } from '../types'

/** Branch master — the list screen with view/edit/delete row actions. */
export function BranchListPage() {
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
    isForbidden,
    forbiddenMessage,
    goToCreate,
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useBranchList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canView, canDelete } = useResourceAccess(
    PERMISSIONS.branches,
  )

  const columns = useMemo<ColumnDef<Branch>[]>(
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
            onView={canView ? () => goToDetail(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: BRANCH_SORT.branchName,
        accessorKey: 'branchName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Branch Name" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.branchName}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.addressLine1 || '—'}
            </span>
          </div>
        ),
      },
      {
        id: BRANCH_SORT.city,
        accessorKey: 'city',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Location" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const parts = [row.original.city, row.original.stateName].filter(
            (part) => part && part !== '—',
          )
          return <span>{parts.length ? parts.join(', ') : '—'}</span>
        },
      },
      {
        accessorKey: 'pinCode',
        enableSorting: false,
        header: 'Pin Code',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.pinCode || '—',
      },
      {
        accessorKey: 'mobile1',
        enableSorting: false,
        header: 'Mobile',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.mobile1 || '—',
      },
      {
        accessorKey: 'gstNumber',
        enableSorting: false,
        header: 'GST Number',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.gstNumber || '—'}</span>
        ),
      },
      // Only `created_at` is sortable on this endpoint.
      ...auditColumns<Branch>({ createdAt: BRANCH_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canView, canDelete],
  )

  // Reading the master was refused (`{ code: 'FORBIDDEN' }`) — show the 403
  // screen with the server's reason instead of the table and its Add button.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Branch"
        description="Manage your branch master records."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add New Branch
            </Button>
          )
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load branches."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search branches…"
          itemName="branches"
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
              icon={Building}
              title="No branches yet"
              description="Create your first branch to get started."
              action={
                canCreate && (
                  <Button onClick={goToCreate}>
                    <Plus className="size-4" />
                    Add New Branch
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
        icon={Building}
        title="Delete branch?"
        description={
          pendingDelete
            ? `"${pendingDelete.branchName}" will be permanently removed.`
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
