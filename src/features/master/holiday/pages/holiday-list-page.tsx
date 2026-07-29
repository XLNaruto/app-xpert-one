import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarHeart, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { formatDate } from '@/lib/utils'
import { HOLIDAY_LABELS } from '../constants'
import { useHolidayList } from '../hooks/use-holiday-list'
import type { Holiday } from '../types'

/** Holiday master — list with add/edit/delete. */
export function HolidayListPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useHolidayList()

  const columns = useMemo<ColumnDef<Holiday>[]>(
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
        accessorKey: 'holidayName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={HOLIDAY_LABELS.holidayName} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.holidayName}</span>
        ),
      },
      {
        accessorKey: 'fromDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={HOLIDAY_LABELS.fromDate} />
        ),
        cell: ({ row }) => formatDate(row.original.fromDate),
      },
      {
        accessorKey: 'toDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={HOLIDAY_LABELS.toDate} />
        ),
        cell: ({ row }) => formatDate(row.original.toDate),
      },
      ...auditColumns<Holiday>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Holidays"
        description="Manage your holiday master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add Holiday
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load holidays."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="holidayName"
          searchPlaceholder="Search holiday…"
          itemName="holidays"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={CalendarHeart}
              title="No holidays yet"
              description="Create your first holiday to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add Holiday
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
        icon={CalendarHeart}
        title="Delete holiday?"
        description={
          pendingDelete
            ? `"${pendingDelete.holidayName}" will be permanently removed.`
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
