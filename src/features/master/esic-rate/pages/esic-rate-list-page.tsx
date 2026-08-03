import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { HeartPulse, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import {
  ESIC_RATE_SORT,
  ESIC_RATE_VALUE_FIELDS,
  ESIC_RATE_VALUE_SORT_FIELDS,
} from '../constants'
import {
  formatEffectiveDate,
  formatEsicRateValue,
  formatMonth,
} from '../lib/esic-rate-mappers'
import { useEsicRateList } from '../hooks/use-esic-rate-list'
import type { EsicRate } from '../types'

/** ESIC rate master — list of rate slabs with add/edit/delete. */
export function EsicRateListPage() {
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
  } = useEsicRateList()

  const columns = useMemo<ColumnDef<EsicRate>[]>(
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
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: ESIC_RATE_SORT.effectiveDate,
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
      // form also reads. Only the four the endpoint can order by offer a sort
      // control.
      ...ESIC_RATE_VALUE_FIELDS.map<ColumnDef<EsicRate>>((field) => {
        const sortId = ESIC_RATE_VALUE_SORT_FIELDS[field.key]
        return {
          accessorKey: field.key,
          ...(sortId ? { id: sortId } : { enableSorting: false }),
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={field.title} />
          ),
          meta: { className: 'whitespace-nowrap' },
          cell: ({ row }) => formatEsicRateValue(row.original[field.key], field.kind),
        }
      }),
      {
        accessorKey: 'contributionEndPeriod1',
        enableSorting: false,
        header: 'Contribution Period 1',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.contributionEndPeriod1),
      },
      {
        accessorKey: 'contributionEndPeriod2',
        enableSorting: false,
        header: 'Contribution Period 2',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatMonth(row.original.contributionEndPeriod2),
      },
      // The API tracks no `updated_at`, and only `created_at` is sortable.
      ...auditColumns<EsicRate>({ createdAt: ESIC_RATE_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="ESIC Rate Setting"
        description="Manage Employees' State Insurance rate slabs by effective date."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add ESIC Rate
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load ESIC rates."}
        </p>
      ) : (
        /* Search and sort are both server-side, so they span every page. */
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search ESIC rate…"
          itemName="ESIC rates"
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
              icon={HeartPulse}
              title={search ? 'No matching ESIC rates' : 'No ESIC rates yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Add your first ESIC rate slab to get started.'
              }
              action={
                search ? undefined : (
                  <Button onClick={goToCreate}>
                    <Plus className="size-4" />
                    Add ESIC Rate
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
        icon={HeartPulse}
        title="Delete ESIC rate?"
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
