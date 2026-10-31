import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Info, MapPin, Plus, ShieldAlert, Trash2, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { auditColumns, DataTable, DataTableColumnHeader, rowNumber } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { formatDate } from '@/lib/utils'
import { ScopedDataError } from '@/features/company'
import {
  EMPLOYEE_SORT,
  EMPLOYEE_STATUS_FILTER,
  GEO_FENCE_HINT,
  type EmployeeStatusFilter,
} from '../constants'
import { useEmployeeList } from '../hooks/use-employee-list'
import { useEmployeeFaces } from '../hooks/use-employee-faces'
import { EmployeeFacesDialog } from '../components/employee-faces-dialog'
import { EmployeeExitDialog } from '../components/employee-exit-dialog'
import { useEmployeeExit } from '../hooks/use-employee-exit'
import { useEmployeeRejoin } from '../hooks/use-employee-rejoin'
import { EmployeeRejoinDialog } from '../components/employee-rejoin-dialog'
import {
  EmployeeGeoFenceCell,
  EmployeeIdentityCell,
  EmployeeRowActions,
} from '../components/employee-cells'
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
    status,
    changeStatus,
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
    goToAppointmentLetter,
    pendingDelete,
    askDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    geoFencePending,
    geoFenceConfirm,
    askToggleGeoFence,
    cancelToggleGeoFence,
    confirmGeoFence,
    bankNames,
  } = useEmployeeList()

  // Which of this screen's actions this role may see.
  const { canCreate, canView, canUpdate, canDelete } = useResourceAccess(
    PERMISSIONS.employees,
  )

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

  // "Exit Employee" — closes the row's open posting from a dialog.
  const exit = useEmployeeExit()

  // "Rejoin" — a new spell of service for an exited row. Saving needs
  // `employees:create`; the dialog asks `GET …/rejoin` whether it's allowed.
  const rejoin = useEmployeeRejoin()

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row, table }) => (
          <span className="text-sm text-muted-foreground">{rowNumber(row, table)}</span>
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
            // Reads the record only, so viewing the employee is enough to issue it.
            onAppointmentLetter={
              canView ? () => goToAppointmentLetter(row.original.id) : undefined
            }
            onDelete={canDelete ? () => askDelete(row.original) : undefined}
            onExit={
              canUpdate && exit.canExit(row.original) ? () => exit.open(row.original) : undefined
            }
            onRejoin={
              canCreate && row.original.exit
                ? () => rejoin.open({ id: row.original.id, name: row.original.name })
                : undefined
            }
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
      // Whether the employee app makes this person punch inside the site's fence.
      // Seen with `employees:read`, switched with `employees:update` — never the
      // geo-fence codes, which are for drawing the fence. Not sortable or
      // filterable: the API offers neither for it.
      ...(canView || canUpdate
        ? [
            {
              id: 'geoFence',
              header: () => (
                <span className="inline-flex items-center gap-1">
                  Geo-fence
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label="Geo-fence — more information"
                        className="inline-flex cursor-help text-muted-foreground/70 transition-colors hover:text-primary"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64 text-pretty font-normal normal-case">
                      {GEO_FENCE_HINT}
                    </TooltipContent>
                  </Tooltip>
                </span>
              ),
              enableSorting: false,
              meta: { className: 'w-px whitespace-nowrap' },
              cell: ({ row }) => (
                <EmployeeGeoFenceCell
                  employee={row.original}
                  pending={geoFencePending.get(row.original.id)}
                  // An exited employee can't punch, so their switch is read-only.
                  onChange={
                    canUpdate && !row.original.exit
                      ? (enabled) => askToggleGeoFence(row.original, enabled)
                      : undefined
                  }
                />
              ),
            } satisfies ColumnDef<Employee>,
          ]
        : []),
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
    [bankNames, geoFencePending, canView, canCreate, canUpdate, canDelete],
  )

  return (
    <div>
      <PageHeader
        title="Employee Management"
        description="Add Employees and Complete Their Eight-Step Record."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add Employee
            </Button>
          )
        }
      />

      {/* Active = a running service in the company; De-active = relieved or
          transferred away. */}
      <Tabs
        className="mb-4"
        value={status}
        onValueChange={(v) => changeStatus(v as EmployeeStatusFilter)}
      >
        <TabsList>
          {EMPLOYEE_STATUS_FILTER.map((o) => (
            <TabsTrigger key={o.value} value={o.value}>
              {o.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Reading the list was refused — a role can hold employees:read/update (a
          supervisor's toggle) without employees:list. Say so in place of the
          table rather than hiding the screen or showing an empty register. */}
      {isForbidden ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Access to the Employee List"
          description={forbiddenMessage}
        />
      ) : isError ? (
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
          searchPlaceholder="Search…"
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
              title="No Employees Yet"
              description="Add Your First Employee to Start Building the Register."
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

      <EmployeeExitDialog exit={exit} />

      <EmployeeRejoinDialog rejoin={rejoin} />

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
        title="Delete Registered Faces?"
        description={
          clearEmployee
            ? `All ${clearEmployee.faces.length} face image${
                clearEmployee.faces.length === 1 ? '' : 's'
              } for ${clearEmployee.name} will be removed and their face de-registered. They will need to register their face again in the mobile app.`
            : undefined
        }
        confirmLabel="Delete Faces"
        loading={isDeletingFaces}
        keepOpenOnConfirm
        onConfirm={confirmDeleteFaces}
      />

      {/* The geo-fence switch asks before saving; the row then shows its loader
          until the server answers. */}
      <ConfirmDialog
        open={geoFenceConfirm !== null}
        onOpenChange={(open) => !open && cancelToggleGeoFence()}
        icon={MapPin}
        title={geoFenceConfirm?.enabled ? 'Turn On Geo-fence?' : 'Turn Off Geo-fence?'}
        description={
          geoFenceConfirm
            ? geoFenceConfirm.enabled
              ? `${geoFenceConfirm.employee.name || 'This employee'} will be able to mark attendance only inside the site's geo-fence. If no fence is drawn for the site yet, this has no effect.`
              : `${geoFenceConfirm.employee.name || 'This employee'} will be able to mark attendance from anywhere.`
            : undefined
        }
        confirmLabel={geoFenceConfirm?.enabled ? 'Turn On' : 'Turn Off'}
        onConfirm={confirmGeoFence}
      />

      {/* A soft delete: the seat, primary mobile and code are freed, the employee
          is signed out of the app and dropped from attendance devices. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
        variant="destructive"
        icon={Trash2}
        title="Delete Employee?"
        description={
          pendingDelete
            ? `${pendingDelete.name || 'This employee'}${pendingDelete.code ? ` (${pendingDelete.code})` : ''} will be removed. Their plan seat, primary mobile number and employee code are freed, they are signed out of the app, and attendance devices drop them. To record an exit instead, close their posting from Service History.`
            : undefined
        }
        confirmLabel="Delete Employee"
        loading={isDeleting}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
