import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Briefcase, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { formatCurrency } from '@/lib/utils'
import { SALARY_TYPE_LABELS } from '../constants'
import { useDesignationList } from '../hooks/use-designation-list'
import type { Designation } from '../types'

/** The acts a designation is covered by, as list badges. */
function applicableActs(designation: Designation): string[] {
  return [
    designation.pfActApplicable && 'PF',
    designation.esicActApplicable && 'ESIC',
    designation.ptActApplicable && 'PT',
    designation.lwfActApplicable && 'LWF',
    designation.overtimeApplicable && 'OT',
  ].filter(Boolean) as string[]
}

/** Designation master — list with add/edit/delete. */
export function DesignationListPage() {
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
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useDesignationList()

  const columns = useMemo<ColumnDef<Designation>[]>(
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
        accessorKey: 'designationName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Designation Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.designationName}
          </span>
        ),
      },
      {
        accessorKey: 'salaryType',
        header: 'Salary Type',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const salaryType = row.original.salaryType
          if (!salaryType) return '—'
          return SALARY_TYPE_LABELS[salaryType] ?? salaryType
        },
      },
      {
        accessorKey: 'basicPay',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Basic Pay" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatCurrency(row.original.basicPay),
      },
      {
        id: 'workingDays',
        header: 'Working Days',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.workingDayCalculationType === 'Fixed'
            ? (row.original.workingDays ?? '—')
            : `Calculated · ${row.original.weeklyOff ?? '—'} off`,
      },
      {
        id: 'acts',
        header: 'Applicable Acts',
        cell: ({ row }) => {
          const acts = applicableActs(row.original)
          if (acts.length === 0)
            return <span className="text-sm text-muted-foreground">None</span>
          return (
            <span className="flex flex-wrap gap-1">
              {acts.map((act) => (
                <Badge key={act}>{act}</Badge>
              ))}
            </span>
          )
        },
      },
      {
        id: 'heads',
        header: 'Heads',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.allowances.length} allowance ·{' '}
            {row.original.deductions.length} deduction
          </span>
        ),
      },
      ...auditColumns<Designation>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Designation"
        description="Manage your designation master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add New Designation
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load designations."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search designations…"
          itemName="designations"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          emptyState={
            <EmptyState
              icon={Briefcase}
              title="No designations yet"
              description="Create your first designation to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add New Designation
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
        icon={Briefcase}
        title="Delete designation?"
        description={
          pendingDelete
            ? `"${pendingDelete.designationName}" will be permanently removed.`
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
