import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { OFFICE_ADDRESS_SORT } from '../constants'
import { useOfficeAddressList } from '../hooks/use-office-address-list'
import type { OfficeAddress, OfficeAddressScreen } from '../types'

/**
 * The office address master — one row per office, with add/edit/delete. All five
 * screens (PF, ESIC, LWF, Factory, Employment Exchange) render this; `screen`
 * carries the copy, routes and `office_for` that make it one of them.
 */
export function OfficeAddressListPage({ screen }: { screen: OfficeAddressScreen }) {
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
  } = useOfficeAddressList(screen)

  const columns = useMemo<ColumnDef<OfficeAddress>[]>(
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
        id: OFFICE_ADDRESS_SORT.officeCode,
        accessorKey: 'officeCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Office Code" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.officeCode || '—'}
          </span>
        ),
      },
      {
        id: OFFICE_ADDRESS_SORT.officeName,
        accessorKey: 'officeName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Office Name" />
        ),
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'email',
        enableSorting: false,
        header: 'Email',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.email || '—',
      },
      {
        accessorKey: 'stateName',
        enableSorting: false,
        header: 'State',
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'districtName',
        enableSorting: false,
        header: 'District',
        meta: { className: 'whitespace-nowrap' },
      },
      {
        id: OFFICE_ADDRESS_SORT.city,
        accessorKey: 'city',
        header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.city || '—',
      },
      // Only PF classifies its offices, so the column follows the form field.
      ...(screen.hasOfficeType
        ? [
            {
              accessorKey: 'officeType',
              enableSorting: false,
              header: 'Office Type',
              meta: { className: 'whitespace-nowrap' },
              cell: ({ row }) => row.original.officeType || '—',
            } satisfies ColumnDef<OfficeAddress>,
          ]
        : []),
      // The API tracks no `updated_at`, and only `created_at` is sortable.
      ...auditColumns<OfficeAddress>({ createdAt: OFFICE_ADDRESS_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screen.hasOfficeType],
  )

  // Reading the master was refused (`{ code: 'FORBIDDEN' }`) — show the 403
  // screen with the server's reason instead of the table and its Add button.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  const addLabel = `Add ${screen.shortLabel}`

  return (
    <div>
      <PageHeader
        title={screen.title}
        description={screen.description}
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            {addLabel}
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : `Couldn't load ${screen.recordsLabel}.`}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder={`Search ${screen.shortLabel}…`}
          itemName={screen.recordsLabel}
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
              icon={screen.icon}
              title={search ? `No matching ${screen.recordsLabel}` : screen.emptyTitle}
              description={
                search ? 'Try a different search term.' : screen.emptyDescription
              }
              action={
                search ? undefined : (
                  <Button onClick={goToCreate}>
                    <Plus className="size-4" />
                    {addLabel}
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
        icon={screen.icon}
        title={`Delete ${screen.shortLabel}?`}
        description={
          pendingDelete
            ? `${pendingDelete.officeName}${pendingDelete.officeCode ? ` (${pendingDelete.officeCode})` : ''} will be permanently removed.`
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
