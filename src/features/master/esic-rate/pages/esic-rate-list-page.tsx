import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { HeartPulse, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import {
  ESIC_RATE_SORT,
  ESIC_RATE_VALUE_FIELDS,
  ESIC_RATE_VALUE_SORT_FIELDS,
  esicRoundingLabel,
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

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.esicRates)

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
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
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
      {
        /* The filing convention this rate is applied under — the difference
           between billing ₹105 and ₹104.23 on the same contribution. Not
           sortable: the endpoint doesn't order by it. */
        accessorKey: 'roundingMode',
        enableSorting: false,
        header: 'Rounding',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => esicRoundingLabel(row.original.roundingMode),
      },
      // The API tracks no `updated_at`, and only `created_at` is sortable.
      ...auditColumns<EsicRate>({ createdAt: ESIC_RATE_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="ESIC Rate Setting"
        description="Manage Employees' State Insurance Rate Slabs by Effective Date."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add ESIC Rate
            </Button>
          )
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't Load ESIC Rates."}
        </p>
      ) : (
        /* Search and sort are both server-side, so they span every page. */
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search ESIC Rate…"
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
              title={search ? 'No Matching ESIC Rates' : 'No ESIC Rates Yet'}
              description={
                search
                  ? 'Try a Different Search Term.'
                  : 'Add Your First ESIC Rate Slab to Get Started.'
              }
              action={
                search
                  ? undefined
                  : canCreate && (
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
        title="Delete ESIC Rate?"
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
