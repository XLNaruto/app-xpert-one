import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  Building2,
  Crown,
  Globe2,
  Mail,
  MessageSquare,
  Plus,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FilterBar } from '@/components/common/filter-bar'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { getApiErrorMessage } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ADMIN_USER_SORT } from '../constants'
import { roleLabel } from '../lib/admin-user-mappers'
import { useAdminUserList } from '../hooks/use-admin-user-list'
import type { AdminUser } from '../types'

/**
 * The account's web-panel users — everyone who can sign in.
 *
 * Account-scoped rather than tenant-scoped: the list opens on every user of the
 * account, account OWNERS included, and the company filter narrows it. Narrowing
 * drops the owners, who belong to no company at all.
 */
export function AdminUserListPage() {
  const list = useAdminUserList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.users)

  const columns = useMemo<ColumnDef<AdminUser>[]>(
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
            onEdit={canUpdate ? () => list.goToEdit(row.original.id) : undefined}
            // The API refuses to delete your own row, and an owner is
            // provisioned by the platform — removing one could leave the
            // account with none. Neither offers the action rather than
            // offering a button that 400s.
            onDelete={
              canDelete &&
              !row.original.isOwner &&
              row.original.id !== list.currentUserId
                ? () => list.setPendingDelete(row.original)
                : undefined
            }
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: ADMIN_USER_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {row.original.id === list.currentUserId && (
              <Badge variant="secondary" className="text-[10px] uppercase">
                You
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: ADMIN_USER_SORT.email,
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            {row.original.email}
          </span>
        ),
      },
      {
        id: 'mobile_number',
        accessorKey: 'mobileNumber',
        header: 'Mobile',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.mobileNumber || '—'}
          </span>
        ),
      },
      {
        id: 'role_name',
        accessorKey: 'roleName',
        header: 'Role',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.isOwner ? (
            <Badge variant="default" className="gap-1">
              <Crown className="size-3" />
              Account owner
            </Badge>
          ) : (
            <span className="text-sm text-foreground">{roleLabel(row.original)}</span>
          ),
      },
      {
        id: 'company',
        header: 'Company',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { companyId } = row.original
          // An owner belongs to the account rather than to any one company.
          if (companyId === null)
            return <span className="text-sm text-muted-foreground">—</span>
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              {list.companyNames.get(companyId) ?? `#${companyId}`}
            </span>
          )
        },
      },
      {
        // The list carries the two reach SCALARS only — the named company and
        // Talk lists cost two joins per row, so they come from the detail read.
        id: 'access_level',
        accessorKey: 'accessLevel',
        header: 'Scope',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.accessLevel === 'GLOBAL' ? (
            <Badge variant="default" className="gap-1">
              <Globe2 className="size-3" />
              All companies
            </Badge>
          ) : (
            <Badge variant="secondary">Selected companies</Badge>
          ),
      },
      {
        id: 'talk_enabled',
        accessorKey: 'talkEnabled',
        header: 'Talk',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.talkEnabled ? (
            <Badge variant="success" className="gap-1">
              <MessageSquare className="size-3" />
              Enabled
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.status === 'active' ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<AdminUser>({ createdAt: ADMIN_USER_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.offset, list.currentUserId, list.companyNames, canUpdate, canDelete],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Users"
        description="The people who can sign in to this account. Their role decides what they may do; their scope decides which companies they may do it in."
        actions={
          canCreate && (
            <Button onClick={list.goToCreate}>
              <Plus className="size-4" />
              Add User
            </Button>
          )
        }
      />

      {list.isError ? (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{getApiErrorMessage(list.error, "Couldn't load users.")}</span>
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          itemName="users"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={list.limit}
          offset={list.offset}
          total={list.total}
          onPaginationChange={list.onPaginationChange}
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.onSortingChange}
          toolbar={
            <FilterBar
              search={{
                value: list.search,
                onChange: list.setSearch,
                placeholder: 'Search by name, email or mobile…',
              }}
              facets={[
                {
                  key: 'company',
                  label: 'Company',
                  icon: Building2,
                  value: list.companyFilter,
                  onChange: list.changeCompanyFilter,
                  options: list.companyOptions,
                  // '' is every company — the API simply gets no `company_id`,
                  // which is also the only view that includes the owners.
                  clearValue: '',
                  searchPlaceholder: 'Search companies',
                },
              ]}
              onReset={list.resetFilters}
            />
          }
          emptyState={
            <EmptyState
              icon={UsersRound}
              title={list.search ? 'No matching users' : 'No users yet'}
              description={
                list.search
                  ? 'Try a different search term.'
                  : 'Add the people who need to sign in, and give each one a role to decide what they can reach.'
              }
              action={
                list.search
                  ? undefined
                  : canCreate && (
                      <Button onClick={list.goToCreate}>
                        <Plus className="size-4" />
                        Add User
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
        icon={UsersRound}
        title="Delete user?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.name}" will be removed and signed out immediately. Their email address stays reserved, so the same person cannot be added again under it.`
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
