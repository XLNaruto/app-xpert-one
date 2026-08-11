import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Landmark, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { PT_RATE_SORT } from '../constants'
import { formatEffectiveDate } from '../lib/pt-rate-mappers'
import { usePtRateList } from '../hooks/use-pt-rate-list'
import type { PtRate } from '../types'

/** PT rate master — one row per state revision, with add/edit/delete. */
export function PtRateListPage() {
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
  } = usePtRateList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.ptRates)

  const columns = useMemo<ColumnDef<PtRate>[]>(
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
        id: PT_RATE_SORT.effectiveDate,
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
      {
        id: PT_RATE_SORT.state,
        accessorKey: 'stateName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
        meta: { className: 'whitespace-nowrap' },
      },
      {
        id: PT_RATE_SORT.detail,
        accessorKey: 'detail',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Detail" />,
        cell: ({ row }) => row.original.detail || '—',
      },
      // The API tracks no `updated_at`, and only `created_at` is sortable.
      ...auditColumns<PtRate>({ createdAt: PT_RATE_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="PT Rate Setting"
        description="Manage Professional Tax slabs by state and effective date."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add PT Rate
            </Button>
          )
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load PT rates."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search PT rate…"
          itemName="PT rates"
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
              icon={Landmark}
              title={search ? 'No matching PT rates' : 'No PT rates yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Add your first Professional Tax slab set to get started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={goToCreate}>
                        <Plus className="size-4" />
                        Add PT Rate
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
        icon={Landmark}
        title="Delete PT rate?"
        description={
          pendingDelete
            ? `The ${pendingDelete.stateName} slabs effective ${formatEffectiveDate(pendingDelete.wef)} will be permanently removed.`
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
