import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarHeart, CalendarPlus, CalendarRange } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { FilterBar } from '@/components/common/filter-bar'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { formatDate } from '@/lib/utils'
import { ScopedDataError } from '@/features/company'
import { HOLIDAY_LABELS, HOLIDAY_SORT } from '../constants'
import { useHolidayList } from '../hooks/use-holiday-list'
import type { Holiday } from '../types'

/** Holiday master — list with add/edit/delete. */
export function HolidayListPage() {
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    accountingYear,
    changeAccountingYear,
    yearOptions,
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    goToYear,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useHolidayList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.holidays)

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
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: HOLIDAY_SORT.holidayName,
        accessorKey: 'holidayName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={HOLIDAY_LABELS.holidayName} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.holidayName}</span>
        ),
      },
      {
        id: HOLIDAY_SORT.fromDate,
        accessorKey: 'fromDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={HOLIDAY_LABELS.fromDate} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatDate(row.original.fromDate),
      },
      {
        id: HOLIDAY_SORT.toDate,
        accessorKey: 'toDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={HOLIDAY_LABELS.toDate} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatDate(row.original.toDate),
      },
      {
        // Not a sort field on the API — the year filter above narrows by it.
        id: 'accountingYear',
        accessorKey: 'accountingYear',
        enableSorting: false,
        header: HOLIDAY_LABELS.accountingYear,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.accountingYear ? (
            <Badge variant="outline">FY {row.original.accountingYear}</Badge>
          ) : (
            '—'
          ),
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<Holiday>({ createdAt: HOLIDAY_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="Holidays"
        description="Manage your holiday master records."
        actions={
          // Holidays are added a year at a time; the single form is edit-only.
          canCreate && (
            <Button onClick={goToYear}>
              <CalendarPlus className="size-4" />
              Add Year's Holidays
            </Button>
          )
        }
      />

      {isError ? (
        <ScopedDataError
          error={error}
          fallback="Couldn't load holidays."
          what="holidays"
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search holiday…"
          itemName="holidays"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          // The year picker sits beside the search box rather than in the
          // panel — it's the filter this screen is looked at through.
          toolbar={
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: 'Search holiday…' }}
              leading={
                <div className="w-full sm:w-44">
                  <Combobox
                    icon={CalendarRange}
                    options={yearOptions}
                    value={accountingYear}
                    onChange={changeAccountingYear}
                    searchable={false}
                    triggerClassName="h-10"
                  />
                </div>
              }
              onReset={() => setSearch('')}
            />
          }
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          emptyState={
            <EmptyState
              icon={CalendarHeart}
              title={
                search
                  ? 'No matching holidays'
                  : accountingYear
                    ? `No holidays for ${accountingYear}`
                    : 'No holidays yet'
              }
              description={
                search
                  ? 'Try a different search term.'
                  : accountingYear
                    ? "Add this year's holidays in one go."
                    : "Add a year's holidays to get started."
              }
              action={
                search
                  ? undefined
                  : canCreate && (
                      <Button onClick={goToYear}>
                        <CalendarPlus className="size-4" />
                        Add Year's Holidays
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
