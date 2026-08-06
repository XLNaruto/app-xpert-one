import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
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
 * how much of the eight-step record is filled in, so a half-entered employee is
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
        description="Add employees and complete their eight-step record."
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
    </div>
  )
}
