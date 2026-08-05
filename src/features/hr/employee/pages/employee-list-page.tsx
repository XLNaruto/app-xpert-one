import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, UserRoundX, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { formatDate } from '@/lib/utils'
import { EMPLOYEE_SORT } from '../constants'
import { useEmployeeList } from '../hooks/use-employee-list'
import {
  EmployeeIdentityCell,
  EmployeeProgressCell,
  EmployeeRowActions,
} from '../components/employee-cells'
import type { Employee } from '../types'

/**
 * Employee Management — the module's entry point.
 *
 * A row is one person plus their current posting, and the Progress column says
 * how much of the nine-step record is filled in, so a half-entered employee is
 * visible at a glance rather than only once you open them.
 *
 * `GET /user/employees` searches the name, the employee code and either mobile
 * number server-side, and sorts by name, code or either audit stamp — those four
 * are the only sortable headers, and each carries the API's own field name as its
 * column id so a click reaches `?sort=` untranslated.
 */
export function EmployeeListPage() {
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
    isForbidden,
    forbiddenMessage,
    goToCreate,
    goToEdit,
    goToDetail,
    pendingDeactivate,
    deactivateReason,
    setDeactivateReason,
    startDeactivate,
    cancelDeactivate,
    confirmDeactivate,
    isLoadingTarget,
    canDeactivate,
    alreadyLeftOn,
    targetJoiningDate,
    isDeactivating,
  } = useEmployeeList()

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{offset + row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <EmployeeRowActions
            onView={() => goToDetail(row.original.id)}
            onEdit={() => goToEdit(row.original.id)}
            onDeactivate={() => startDeactivate(row.original)}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: EMPLOYEE_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        meta: { className: 'min-w-56' },
        cell: ({ row }) => <EmployeeIdentityCell employee={row.original} />,
      },
      {
        id: 'progress',
        header: 'Progress',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => <EmployeeProgressCell employee={row.original} />,
      },
      {
        id: 'mobile',
        accessorKey: 'mobileNumber1',
        header: 'Mobile',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.mobileNumber1 || '—',
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email || '—'}</span>
        ),
      },
      {
        id: 'birthDate',
        header: 'Date of Birth',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.birthDate ? formatDate(row.original.birthDate) : '—',
      },
      // The endpoint sorts by either audit stamp, so both headers keep the control.
      ...auditColumns<Employee>({
        createdAt: EMPLOYEE_SORT.createdAt,
        updatedAt: EMPLOYEE_SORT.updatedAt,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offset],
  )

  // Reading the list was refused — show the 403 screen, not a broken table.
  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Employee Management"
        description="Add employees and complete their nine-step record."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add Employee
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load employees."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search by name, code or mobile…"
          itemName="employees"
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
              icon={UsersRound}
              title="No employees yet"
              description="Add your first employee to start building the register."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add Employee
                </Button>
              }
            />
          }
        />
      )}

      {/*
        Deactivate closes the open posting (`…/leave-service`) — the API has no
        employee delete, and this is what takes someone off strength. The reason
        is required by the endpoint, so the dialog can't be confirmed without one.
      */}
      <ConfirmDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => !open && cancelDeactivate()}
        variant="destructive"
        icon={UserRoundX}
        title="Deactivate this employee?"
        description={
          pendingDeactivate ? (
            <>
              <strong className="text-foreground">
                {pendingDeactivate.name || 'This employee'}
              </strong>{' '}
              will be marked as having left today
              {targetJoiningDate
                ? ` — their posting since ${formatDate(targetJoiningDate)} is closed`
                : ''}
              . The record and its history stay intact, and a new posting can be opened
              later from the Transfer History tab.
            </>
          ) : undefined
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        loading={isDeactivating}
        confirmDisabled={
          isLoadingTarget || !canDeactivate || deactivateReason.trim() === ''
        }
        keepOpenOnConfirm
        onConfirm={confirmDeactivate}
      >
        {/*
          The list row doesn't carry the posting — only the detail read does — so
          the dialog reads it and says plainly when there's nothing left to close.
        */}
        {isLoadingTarget ? (
          <p className="text-sm text-muted-foreground">Checking the current posting…</p>
        ) : !canDeactivate ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            {alreadyLeftOn
              ? `This employee already left on ${formatDate(alreadyLeftOn)} — there's no open posting to close.`
              : "This employee has no open posting, so there's nothing to close."}
          </p>
        ) : (
          <Field label="Reason for leaving" required>
            <Textarea
              value={deactivateReason}
              onChange={(event) => setDeactivateReason(event.target.value)}
              placeholder="e.g. Resigned, contract ended, absconded"
              rows={3}
            />
          </Field>
        )}
      </ConfirmDialog>
    </div>
  )
}
