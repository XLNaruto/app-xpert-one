import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Network, Plus, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FilterBar } from '@/components/common/filter-bar'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import {
  IP_ADDRESS_LABELS,
  IP_ADDRESS_SORT,
  IP_ADDRESS_TYPE_FILTERS,
} from '../constants'
import { ipAddressTypeLabel } from '../lib/ip-address-mappers'
import { useIpAddressList } from '../hooks/use-ip-address-list'
import { useIpAccessModeSwitch } from '../hooks/use-ip-access-mode-switch'
import { IpAccessModeCard } from '../components/ip-access-mode-card'
import { IpAddressFormDialog } from '../components/ip-address-form-dialog'
import type { IpAddress } from '../types'

/**
 * IP access control — the company's mode plus its allow/block lists, with
 * add/edit/delete.
 */
export function IpAddressListPage() {
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
    typeFilter,
    changeTypeFilter,
    resetFilters,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    formOpen,
    setFormOpen,
    editing,
    openCreate,
    openEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useIpAddressList()

  const access = useIpAccessModeSwitch()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.ipAddresses)

  const columns = useMemo<ColumnDef<IpAddress>[]>(
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
            onEdit={canUpdate ? () => openEdit(row.original) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: IP_ADDRESS_SORT.ipAddresses,
        accessorKey: 'ipAddresses',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={IP_ADDRESS_LABELS.ipAddresses} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          // An address is read character by character — a monospace face is
          // what makes `10.0.0.0/8` and `10.0.0.08` tell themselves apart.
          <span className="font-mono text-sm font-medium text-foreground">
            {row.original.ipAddresses}
          </span>
        ),
      },
      {
        id: IP_ADDRESS_SORT.type,
        accessorKey: 'type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={IP_ADDRESS_LABELS.type} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge
            variant={row.original.type === 'ALLOWED' ? 'success' : 'destructive'}
          >
            {ipAddressTypeLabel(row.original.type)}
          </Badge>
        ),
      },
      ...auditColumns<IpAddress>({
        createdAt: IP_ADDRESS_SORT.createdAt,
        updatedAt: IP_ADDRESS_SORT.updatedAt,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  // Only the LIST being refused (`{ code: 'FORBIDDEN' }`) empties the screen —
  // that's the read the page exists for. The mode header is a separate right
  // (`ip-addresses:read`): a role holding `list` alone belongs on this screen,
  // so its 403 hides the card (see `IpAccessModeCard`) instead of the entries.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="IP Access Control"
        description="Decide which networks can reach the panel for this company."
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add IP Address
            </Button>
          )
        }
      />

      <IpAccessModeCard access={access} canUpdate={canUpdate} />

      {isError ? (
        <ScopedDataError
          error={error}
          fallback="Couldn't load IP addresses."
          what="IP addresses"
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          itemName="IP addresses"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Search IP address…',
              }}
              facets={[
                {
                  key: 'type',
                  label: IP_ADDRESS_LABELS.type,
                  icon: ShieldCheck,
                  value: typeFilter,
                  onChange: changeTypeFilter,
                  options: IP_ADDRESS_TYPE_FILTERS,
                  // '' is "both lists" — the API simply gets no `type`.
                  clearValue: '',
                },
              ]}
              onReset={resetFilters}
            />
          }
          emptyState={
            <EmptyState
              icon={Network}
              title="No IP addresses yet"
              description="Add an address or a CIDR range to start controlling who can reach the panel."
              action={
                canCreate && (
                  <Button onClick={openCreate}>
                    <Plus className="size-4" />
                    Add IP Address
                  </Button>
                )
              }
            />
          }
        />
      )}

      <IpAddressFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Network}
        title="Remove IP address?"
        description={
          pendingDelete
            ? `"${pendingDelete.ipAddresses}" will be removed from the ${ipAddressTypeLabel(
                pendingDelete.type,
              ).toLowerCase()} list.`
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
