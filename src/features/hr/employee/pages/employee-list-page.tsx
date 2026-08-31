import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { formatDate } from '@/lib/utils'
import { ScopedDataError } from '@/features/company'
import { EMPLOYEE_SORT } from '../constants'
import { useEmployeeList } from '../hooks/use-employee-list'
import { useEmployeeFaces } from '../hooks/use-employee-faces'
import { EmployeeFacesDialog } from '../components/employee-faces-dialog'
import { EmployeeIdentityCell, EmployeeRowActions } from '../components/employee-cells'
import type { Employee } from '../types'

/**
 * Employee Management — the module's entry point.
 *
 * A row is one person: who they are, how to reach them, and the actions menu into
 * their record. How far through the eight-step wizard they are isn't shown here —
 * the detail screen and the wizard's own nav carry that.
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
    bankNames,
  } = useEmployeeList()

  // Which of this screen's actions this role may see.
  const { canCreate, canView, canUpdate } = useResourceAccess(PERMISSIONS.employees)

  // The faces dialog reads the row out of `rows`, so a clear is reflected in it.
  const {
    facesEmployee,
    openFaces,
    closeFaces,
    clearEmployee,
    askClearFaces,
    cancelClearFaces,
    confirmDeleteFaces,
    isDeletingFaces,
  } = useEmployeeFaces(rows)

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
            onView={canView ? () => goToDetail(row.original.id) : undefined}
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            // Straight to step 8 — the posting register, where an exit is recorded.
            onServiceHistory={
              canUpdate ? () => goToEdit(row.original.id, 'transfers') : undefined
            }
            faceCount={row.original.faces.length}
            onViewFaces={canView ? () => openFaces(row.original) : undefined}
            // Clearing faces edits the employee record rather than removing it.
            onDeleteFaces={canUpdate ? () => askClearFaces(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: EMPLOYEE_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => <EmployeeIdentityCell employee={row.original} />,
      },
      {
        id: 'mobile',
        accessorKey: 'mobileNumber1',
        header: 'Phone Number',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.mobileNumber1 || '—',
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        enableSorting: false,
        meta: { className: 'min-w-64 whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email || '—'}</span>
        ),
      },
      {
        id: 'birthDate',
        header: 'DOB',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.birthDate ? formatDate(row.original.birthDate) : '—',
      },
      // The statutory and bank identifiers, straight off the row — they're
      // columns of the employee record, so no extra read is needed for them.
      {
        id: 'aadharNumber',
        header: 'Aadhaar No',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.kyc.aadharNumber || '—',
      },
      {
        id: 'uanNumber',
        header: 'UAN Number',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.kyc.uanNumber || '—',
      },
      {
        id: 'pfNumber',
        header: 'PF Number',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.kyc.pfNumber || '—',
      },
      {
        id: 'esicNumber',
        header: 'ESIC Number',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.kyc.esicNumber || '—',
      },
      {
        id: 'bankName',
        header: 'Bank Name',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // The row holds `bank_id`; the name comes from the bank master, which the
        // list hook loads once.
        cell: ({ row }) => {
          const { bankId } = row.original.kyc
          return (bankId ? bankNames.get(bankId) : '') || '—'
        },
      },
      {
        id: 'bankAccountNumber',
        header: 'Account Number',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.kyc.bankAccountNumber || '—',
      },
      {
        id: 'ifscCode',
        header: 'IFSC Code',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.kyc.ifscCode || '—',
      },
      // The endpoint sorts by either audit stamp, so both headers keep the control.
      ...auditColumns<Employee>({
        createdAt: EMPLOYEE_SORT.createdAt,
        updatedAt: EMPLOYEE_SORT.updatedAt,
      }),
    ],
    // `bankNames` arrives after the first render, so the Bank Name column has to
    // be rebuilt when it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offset, bankNames, canView, canUpdate],
  )

  // Reading the list was refused — show the 403 screen, not a broken table.
  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Employee Management"
        description="Add employees and complete their eight-step record."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add Employee
            </Button>
          )
        }
      />

      {isError ? (
        <ScopedDataError
          error={error}
          fallback="Couldn't load employees."
          what="employees"
        />
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
                canCreate ? (
                  <Button onClick={goToCreate}>
                    <Plus className="size-4" />
                    Add Employee
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      <EmployeeFacesDialog
        employee={facesEmployee}
        onClose={closeFaces}
        onClearFaces={() => facesEmployee && askClearFaces(facesEmployee)}
        isClearing={isDeletingFaces}
      />

      {/* Reached from the row menu or from inside the dialog. The API de-registers
          the face and purges every image in one call, so the confirm names the
          count and spells out that the employee has to register again. */}
      <ConfirmDialog
        open={clearEmployee !== null}
        onOpenChange={(open) => !open && cancelClearFaces()}
        variant="destructive"
        icon={Trash2}
        title="Delete registered faces?"
        description={
          clearEmployee
            ? `All ${clearEmployee.faces.length} face image${
                clearEmployee.faces.length === 1 ? '' : 's'
              } for ${clearEmployee.name} will be removed and their face de-registered. They will need to register their face again in the mobile app.`
            : undefined
        }
        confirmLabel="Delete faces"
        loading={isDeletingFaces}
        keepOpenOnConfirm
        onConfirm={confirmDeleteFaces}
      />
    </div>
  )
}
