import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { HandCoins, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { formatAmount } from '@/lib/currency'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { LWF_LABELS, LWF_RATE_SORT } from '../constants'
import { formatEffectiveDate, formatMonth } from '../lib/lwf-rate-mappers'
import { useLwfRateList } from '../hooks/use-lwf-rate-list'
import type { LwfRate } from '../types'

/** LWF rate master — one row per state revision, with add/edit/delete. */
export function LwfRateListPage() {
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
    isForbidden,
    forbiddenMessage,
  } = useLwfRateList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.lwfRates)

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
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: LWF_RATE_SORT.effectiveDate,
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
        id: LWF_RATE_SORT.state,
        accessorKey: 'stateName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        meta: { className: 'whitespace-nowrap' },
      },
      {
        id: LWF_RATE_SORT.month,
        accessorKey: 'month',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={LWF_LABELS.month} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        id: LWF_RATE_SORT.employeeContribution,
        accessorKey: 'employeeContribution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee LWF Contribution" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.employeeContribution),
      },
      {
        id: LWF_RATE_SORT.employerContribution,
        accessorKey: 'employerContribution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employer LWF Contribution" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatAmount(row.original.employerContribution),
      },
      // The API tracks no `updated_at`, and only `created_at` is sortable.
      ...auditColumns<LwfRate>({ createdAt: LWF_RATE_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  // Reading the master was refused (`{ code: 'FORBIDDEN' }`) — show the 403
  // screen with the server's reason instead of the table and its Add button.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="LWF Rate Setting"
        description="Manage Labour Welfare Fund contributions by state and effective date."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add LWF Rate
            </Button>
          )
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load LWF rates."}
        </p>
      ) : (
        /* Search and sort are both server-side, so they span every page. */
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search LWF rate…"
          itemName="LWF rates"
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
              icon={HandCoins}
              title={search ? 'No matching LWF rates' : 'No LWF rates yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Add your first Labour Welfare Fund contribution to get started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={goToCreate}>
                        <Plus className="size-4" />
                        Add LWF Rate
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
