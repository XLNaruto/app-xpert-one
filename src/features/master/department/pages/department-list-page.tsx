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
import { DEPARTMENT_SORT } from '../constants'
import { useDepartmentList } from '../hooks/use-department-list'
import type { Department } from '../types'

/** Department master — list with add/edit/delete. */
export function DepartmentListPage() {
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
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useDepartmentList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.departments)

  const columns = useMemo<ColumnDef<Department>[]>(
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
        id: DEPARTMENT_SORT.departmentName,
        accessorKey: 'departmentName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Department Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.departmentName}
          </span>
        ),
      },
      {
        id: DEPARTMENT_SORT.departmentCode,
        accessorKey: 'departmentCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.departmentCode || '—'}</span>
        ),
      },
      {
        // The endpoint doesn't sort on the branch — the name is joined in from
        // the branch master, so the header renders without the control.
        accessorKey: 'branchName',
        header: 'Branch',
        enableSorting: false,
      },
      {
        accessorKey: 'monthStartDay',
        header: 'Month Start Date',
        enableSorting: false,
        cell: ({ row }) => row.original.monthStartDay ?? '—',
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<Department>({ createdAt: DEPARTMENT_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  // Reading the master was refused — show the 403 screen, not an error line.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Department"
        description="Manage your department master records."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add New Department
            </Button>
          )
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load departments."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search departments…"
          itemName="departments"
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
              title={search ? 'No matching departments' : 'No departments yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Create your first department to get started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={goToCreate}>
                        <Plus className="size-4" />
                        Add New Department
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
        title="Delete department?"
        description={
          pendingDelete
            ? `"${pendingDelete.departmentName}" will be permanently removed.`
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
