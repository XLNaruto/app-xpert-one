import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Briefcase, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { DESIGNATION_SORT } from '../constants'
import { useDesignationList } from '../hooks/use-designation-list'
import type { Designation } from '../types'

/**
 * Designation master — list with add/edit/delete.
 *
 * The titles and nothing else: `GET /user/designations` answers a name and its
 * audit trail, because a designation's pay isn't a property of the record — it's
 * an effective-dated wage structure behind it, which the edit screen's Wage
 * Structure tab reads version by version.
 */
export function DesignationListPage() {
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
  } = useDesignationList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.designations)

  const columns = useMemo<ColumnDef<Designation>[]>(
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
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: DESIGNATION_SORT.designationName,
        accessorKey: 'designationName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Designation Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.designationName}
          </span>
        ),
      },
      // The endpoint sorts by the title or the creation stamp, nothing else.
      ...auditColumns<Designation>({ createdAt: DESIGNATION_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="Designation"
        description="Manage your designation master records."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add New Designation
            </Button>
          )
        }
      />

      {isError ? (
        <ScopedDataError
          error={error}
          fallback="Couldn't load designations."
          what="designations"
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search designations…"
          itemName="designations"
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
              icon={Briefcase}
              title="No designations yet"
              description="Create your first designation to get started."
              action={
                canCreate && (
                  <Button onClick={goToCreate}>
                    <Plus className="size-4" />
                    Add New Designation
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
        icon={Briefcase}
        title="Delete designation?"
        description={
          pendingDelete
            ? `"${pendingDelete.designationName}" will be permanently removed.`
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
