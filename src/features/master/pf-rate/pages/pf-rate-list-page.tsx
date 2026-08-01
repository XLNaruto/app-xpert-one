import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Percent, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PF_RATE_VALUE_FIELDS } from '../constants'
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
            onEdit={() => goToEdit(row.original.id)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
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
      // form and the history table also read.
      ...PF_RATE_VALUE_FIELDS.map<ColumnDef<PfRate>>((field) => ({
        accessorKey: field.key,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={field.title} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatPfRateValue(row.original[field.key], field.kind),
      })),
      ...auditColumns<PfRate>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add PF Rate
          </Button>
        }
      />

      {/*
        No search box: `/user/pf-rates` takes only `limit`/`offset`, and with
        the list server-paged a client-side box would filter the current page
        alone. It comes back when the endpoint accepts a search term.
      */}
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="PF rates"
        pageSizeOptions={[5,10, 25, 50]}
        serverPagination
        limit={limit}
        offset={offset}
        total={total}
        onPaginationChange={onPaginationChange}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Percent className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load PF rates" : 'No PF rates yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.'
                  : 'Add your first PF rate slab to get started.'}
              </p>
            </div>
            {!isError && (
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
