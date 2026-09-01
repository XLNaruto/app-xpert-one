import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Building2, KeyRound, Mail, Plus, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FilterBar } from '@/components/common/filter-bar'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn, formatDateTime } from '@/lib/utils'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { TALK_CREDENTIAL_SORT } from '../constants'
import { employeeLabel } from '../lib/talk-credential-mappers'
import { useTalkCredentialList } from '../hooks/use-talk-credential-list'
import type { TalkCredential } from '../types'

/**
 * The account's Talk logins — one per employee who may chat.
 *
 * EMPLOYEE credentials only: a back-office user's Talk access is part of their
 * panel login and is edited on the Users screen instead. Account-scoped rather
 * than tenant-scoped, and the company filter narrows to the credentials that
 * reach a company by EITHER kind of grant — a whole company or one department
 * inside it.
 */
export function TalkCredentialListPage() {
  const list = useTalkCredentialList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.talkCredentials)

  const columns = useMemo<ColumnDef<TalkCredential>[]>(
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
            onDelete={canDelete ? () => list.setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        id: 'employee_name',
        accessorKey: 'employeeName',
        header: 'Employee',
        // The endpoint sorts by `email`, `created_at` and `updated_at` only.
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-medium',
                // A deleted employee's placeholder reads as secondary, not as
                // a person.
                row.original.employeeName
                  ? 'text-foreground'
                  : 'italic text-muted-foreground',
              )}
            >
              {employeeLabel(row.original)}
            </span>
            {/* The credential outlives the employee — the row has to stay
                visible in order to be revoked. */}
            {!row.original.employeeName && (
              <Badge variant="secondary" className="text-[10px] uppercase">
                Deleted
              </Badge>
            )}
          </div>
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: TALK_CREDENTIAL_SORT.email,
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Talk login" />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            {row.original.email}
            {/* How the credential STARTED, not a live link — the API clears the
                flag as soon as an edit moves the address or rotates the
                password, so a row without it was typed or has since diverged. */}
            {row.original.isSameAsPanelCreds && (
              <Badge variant="secondary" className="text-[10px] uppercase">
                Panel
              </Badge>
            )}
          </span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === 'active' ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      {
        id: 'last_login_at',
        accessorKey: 'lastLoginAt',
        header: 'Last sign-in',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.lastLoginAt ? (
              formatDateTime(row.original.lastLoginAt)
            ) : (
              <span className="text-muted-foreground">Never</span>
            )}
          </span>
        ),
      },
      ...auditColumns<TalkCredential>({
        createdAt: TALK_CREDENTIAL_SORT.createdAt,
        updatedAt: TALK_CREDENTIAL_SORT.updatedAt,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.offset, canUpdate, canDelete],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Talk Credential"
        description="Each employee's own Talk login — the address they sign in with, and the companies and departments they may talk to."
        actions={
          canCreate && (
            <Button onClick={list.goToCreate}>
              <Plus className="size-4" />
              Issue Credential
            </Button>
          )
        }
      />

      {list.isError ? (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{getApiErrorMessage(list.error, "Couldn't load Talk credentials.")}</span>
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          itemName="credentials"
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
                // The endpoint matches the ADDRESS only — not the employee's
                // name — so the box says what it can actually find.
                placeholder: 'Search by login address…',
              }}
              facets={[
                {
                  key: 'company',
                  label: 'Company',
                  icon: Building2,
                  value: list.companyFilter,
                  onChange: list.changeCompanyFilter,
                  options: list.companyOptions,
                  // '' is every company — the API simply gets no `company_id`.
                  clearValue: '',
                  searchPlaceholder: 'Search companies',
                },
              ]}
              onReset={list.resetFilters}
            />
          }
          emptyState={
            <EmptyState
              icon={KeyRound}
              title={list.search ? 'No matching credentials' : 'No Talk credentials yet'}
              description={
                list.search
                  ? 'Try a different login address.'
                  : 'Issue an employee their Talk login, then choose the companies and departments it reaches.'
              }
              action={
                list.search
                  ? undefined
                  : canCreate && (
                      <Button onClick={list.goToCreate}>
                        <Plus className="size-4" />
                        Issue Credential
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
        icon={UserRound}
        title="Delete Talk credential?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.email}" will stop working and its grants are removed. The address is RELEASED, so the same employee can be issued a new credential under it — to suspend the login instead and keep it recoverable, edit it and set the status to Inactive.`
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
