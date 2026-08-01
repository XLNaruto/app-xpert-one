import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useCompanyList } from '../hooks/use-company-list'
import type { Company } from '../types'

/** Company master — the list screen with view/edit/delete row actions. */
export function CompanyListPage() {
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    isLoading,
    isError,
    error,
    goToCreate,
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useCompanyList()

  const columns = useMemo<ColumnDef<Company>[]>(
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
            onView={() => goToDetail(row.original.id)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'companyName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company Name" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.companyName}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'companyCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.companyCode}</span>
        ),
      },
      {
        accessorKey: 'establishYear',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Est. Year" />,
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <span>{[row.original.city, row.original.state].filter(Boolean).join(', ')}</span>
        ),
      },
      {
        accessorKey: 'mobile1',
        header: 'Mobile',
      },
      ...auditColumns<Company>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Company"
        description="Manage your company master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add New Company
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load companies."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search companies…"
          itemName="companies"
          pageSizeOptions={[10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No companies yet"
              description="Create your first company to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add New Company
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Building2}
        title="Delete company?"
        description={
          pendingDelete
            ? `"${pendingDelete.companyName}" will be permanently removed.`
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
