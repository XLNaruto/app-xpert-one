import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { KeyRound, Plus, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { ROLE_SORT } from '../constants'
import { useRoleList } from '../hooks/use-role-list'
import type { RoleListRow } from '../types'

export function RoleListPage() {
  const list = useRoleList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.roles)

  const columns = useMemo<ColumnDef<RoleListRow>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {list.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            // A system role is seeded server-side — it can be read, never edited
            // or deleted, so it simply offers no actions.
            onEdit={
              canUpdate && !row.original.isSystem
                ? () => list.goToEdit(row.original.id)
                : undefined
            }
            onDelete={
              canDelete && !row.original.isSystem
                ? () => list.setPendingDelete(row.original)
                : undefined
            }
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: ROLE_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {row.original.isSystem && (
              <Badge variant="secondary" className="text-[10px] uppercase">
                System
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'permission_count',
        accessorKey: 'permissionCount',
        header: 'Permissions',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <KeyRound className="size-3.5" />
            <span className="tabular-nums">{row.original.permissionCount}</span>
          </span>
        ),
      },
      // No Scope or Talk column: a role carries the permission codes and
      // nothing else now — the reach is per USER, and the Users list shows it.
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<RoleListRow>({ createdAt: ROLE_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.offset, canUpdate, canDelete],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Create roles and control exactly which screens each one can open, and what it can do there."
        actions={
          canCreate && (
            <Button onClick={list.goToCreate}>
              <Plus className="size-4" />
              Create Role
            </Button>
          )
        }
      />

      {list.isError ? (
        <ScopedDataError
          error={list.error}
          fallback="Couldn't load roles."
          what="roles"
        />
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          searchPlaceholder="Search roles…"
          itemName="roles"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={list.limit}
          offset={list.offset}
          total={list.total}
          onPaginationChange={list.onPaginationChange}
          searchValue={list.search}
          onSearchChange={list.setSearch}
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.onSortingChange}
          emptyState={
            <EmptyState
              icon={ShieldCheck}
              title={list.search ? 'No matching roles' : 'No roles yet'}
              description={
                list.search
                  ? 'Try a different search term.'
                  : 'A role decides which screens a user can open and what they can do there. Create one to start handing out access.'
              }
              action={
                list.search
                  ? undefined
                  : canCreate && (
                      <Button onClick={list.goToCreate}>
                        <Plus className="size-4" />
                        Create Role
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={list.pendingDelete !== null}
        onOpenChange={(open) => !open && list.setPendingDelete(null)}
        variant="destructive"
        icon={ShieldCheck}
        title="Delete role?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.name}" will be removed. Users still on this role have to be moved to another one first.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={list.isDeleting}
        keepOpenOnConfirm
        onConfirm={list.confirmDelete}
      />
    </div>
  )
}
