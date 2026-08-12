import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { SHIFT_ROTATION_SORT } from '../constants'
import { useShiftRotationList } from '../hooks/use-shift-rotation-list'
import type { ShiftRotation } from '../types'

/**
 * Shift Rotation — the cycles an employee can be walked through week by week.
 *
 * Each row spells its whole cycle out (`W1 Morning → W2 Night`) rather than
 * counting its weeks: the sequence *is* the rotation, and the shift names come
 * from the shift master read alongside the list, since the rows carry only ids.
 */
export function ShiftRotationListPage() {
  const list = useShiftRotationList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(
    PERMISSIONS.shiftRotations,
  )

  const columns = useMemo<ColumnDef<ShiftRotation>[]>(() => {
    /** `shift_id` → its name, for the cycle chips. */
    const shiftNames = new Map(list.shifts.map((shift) => [shift.id, shift.shiftName]))

    return [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {list.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={canUpdate ? () => list.goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => list.setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: SHIFT_ROTATION_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Rotation Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        id: SHIFT_ROTATION_SORT.cycleLengthWeeks,
        accessorKey: 'cycleLengthWeeks',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span>
            {row.original.cycleLengthWeeks} week
            {row.original.cycleLengthWeeks === 1 ? '' : 's'}
          </span>
        ),
      },
      {
        id: 'weeks',
        header: 'Weeks',
        enableSorting: false,
        meta: { className: 'min-w-72' },
        cell: ({ row }) =>
          row.original.weeks.length === 0 ? (
            <span className="text-muted-foreground">No weeks</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {row.original.weeks.map((week) => (
                <Badge key={week.id} variant="secondary">
                  W{week.weekNumber} ·{' '}
                  {shiftNames.get(week.shiftId) ?? `#${week.shiftId}`}
                </Badge>
              ))}
            </div>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.status ? 'success' : 'secondary'}>
            {row.original.status ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<ShiftRotation>({ createdAt: SHIFT_ROTATION_SORT.createdAt }),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.offset, list.shifts, canUpdate, canDelete])

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Shift Rotation"
        description="A named ring of shifts an employee walks a week at a time — nights one week, mornings the next."
        actions={
          canCreate && (
            <Button onClick={list.goToCreate}>
              <Plus className="size-4" />
              Add Shift Rotation
            </Button>
          )
        }
      />

      {list.isError ? (
        <ScopedDataError
          error={list.error}
          fallback="Couldn't load shift rotations."
          what="shift rotations"
        />
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          searchPlaceholder="Search rotations…"
          itemName="rotations"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={list.limit}
          offset={list.offset}
          total={list.total}
          onPaginationChange={list.onPaginationChange}
          searchValue={list.search}
          onSearchChange={list.setSearch}
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.onSortingChange}
          emptyState={
            <EmptyState
              icon={RefreshCw}
              title={list.search ? 'No matching rotations' : 'No rotations yet'}
              description={
                list.search
                  ? 'Try a different search term.'
                  : 'Build a cycle from the company’s shifts, then assign it to the employees who work it.'
              }
              action={
                list.search
                  ? undefined
                  : canCreate && (
                      <Button onClick={list.goToCreate}>
                        <Plus className="size-4" />
                        Add Shift Rotation
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={list.pendingDelete !== null}
        onOpenChange={(open) => !open && list.setPendingDelete(null)}
        variant="destructive"
        icon={RefreshCw}
        title="Delete shift rotation?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.name}" will be removed. A rotation with employees still assigned to it can't be deleted — move them off it first.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={list.isDeleting}
        keepOpenOnConfirm
        onConfirm={list.confirmDelete}
      />
    </div>
  )
}
