import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Percent, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import {
  PF_RATE_SORT,
  PF_RATE_VALUE_FIELDS,
  PF_RATE_VALUE_SORT_FIELDS,
} from '../constants'
import { formatEffectiveDate, formatPfRateValue } from '../lib/pf-rate-mappers'
import { usePfRateList } from '../hooks/use-pf-rate-list'
import type { PfRate } from '../types'

/** PF rate master — list of rate slabs with add/edit/delete. */
export function PfRateListPage() {
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
  } = usePfRateList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.pfRates)

  const columns = useMemo<ColumnDef<PfRate>[]>(
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
        id: PF_RATE_SORT.effectiveDate,
        accessorKey: 'wef',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Effective Date" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {formatEffectiveDate(row.original.wef)}
          </span>
        ),
      },
      // Every rate/limit column, generated from the one field descriptor the
      // form and the history table also read. Only the four the endpoint can
      // order by offer a sort control.
      ...PF_RATE_VALUE_FIELDS.map<ColumnDef<PfRate>>((field) => {
        const sortId = PF_RATE_VALUE_SORT_FIELDS[field.key]
        return {
          accessorKey: field.key,
          ...(sortId ? { id: sortId } : { enableSorting: false }),
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={field.title} />
          ),
          meta: { className: 'whitespace-nowrap' },
          cell: ({ row }) => formatPfRateValue(row.original[field.key], field.kind),
        }
      }),
      // The API tracks no `updated_at`, and only `created_at` is sortable.
      ...auditColumns<PfRate>({ createdAt: PF_RATE_SORT.createdAt }),
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
        title="PF Rate Setting"
        description="Manage Provident Fund rate slabs by effective date."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add PF Rate
            </Button>
          )
        }
      />

      {/* Search and sort are both server-side, so they span every page. */}
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        searchPlaceholder="Search PF rate…"
        itemName="PF rates"
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
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Percent className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError
                  ? "Couldn't load PF rates"
                  : search
                    ? 'No matching PF rates'
                    : 'No PF rates yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.'
                  : search
                    ? 'Try a different search term.'
                    : 'Add your first PF rate slab to get started.'}
              </p>
            </div>
            {!isError && !search && canCreate && (
              <Button onClick={goToCreate}>
                <Plus className="size-4" />
                Add PF Rate
              </Button>
            )}
          </div>
        }
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Percent}
        title="Delete PF rate?"
        description={
          pendingDelete
            ? `The slab effective ${formatEffectiveDate(pendingDelete.wef)} will be permanently removed.`
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
