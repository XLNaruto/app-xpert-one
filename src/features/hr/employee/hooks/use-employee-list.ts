import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useBanks } from '@/features/master/bank'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId, encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { EMPLOYEE_DEFAULT_SORT } from '../constants'
import { useEmployees } from '../api/use-employees'
import { useDeleteEmployee } from '../api/use-employee-mutations'
import type { Employee } from '../types'

/**
 * Orchestrates the employee list screen: the paged query, navigation into the
 * wizard and the detail view, and the delete flow.
 *
 * **Delete** (`DELETE /user/employees/:id`, `employees:delete`) is a soft delete
 * that frees the plan seat, the primary mobile and the code — for a record that
 * shouldn't exist. Taking someone off strength is still closing their open
 * posting (`POST …/transfers/:serviceId/leave-service`) from the Service History
 * tab, which keeps their history intact.
 */
export function useEmployeeList() {
  const navigate = useNavigate()
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, EMPLOYEE_DEFAULT_SORT)

  const { data, isLoading, isError, error } = useEmployees(params)

  // A row carries `bank_id`, not the bank's name. The master is small and
  // session-stable, so it's read once and turned into a lookup for the column.
  const { data: banks } = useBanks()
  const bankNames = useMemo(
    () => new Map((banks?.items ?? []).map((bank) => [bank.id, bank.bankName])),
    [banks],
  )

  const goToCreate = () => navigate({ to: '/hr/employee/create' })

  /* ── Delete ── */
  const deleteEmployee = useDeleteEmployee()
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null)

  const confirmDelete = () => {
    if (!pendingDelete) return
    const { id, name } = pendingDelete
    deleteEmployee.mutate(id, {
      onSuccess: () => {
        toast.success(`${name || 'Employee'} deleted`)
        setPendingDelete(null)
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't delete the employee.")),
    })
  }

  /**
   * Open the wizard on one employee. The id travels encrypted in `?data=`
   * alongside the tab to open, so nothing about the record shows in the address
   * bar and a refresh comes back to the same step.
   */
  const goToEdit = (id: number, tab?: string) =>
    navigate({
      to: '/hr/employee/create',
      search: { data: tab ? encryptParams({ id, tab }) : encryptId(id) },
    })

  const goToDetail = (id: number) =>
    navigate({ to: '/hr/employee/detail', search: { data: encryptId(id) } })

  /** The printable appointment order for one employee. */
  const goToAppointmentLetter = (id: number) =>
    navigate({ to: '/hr/employee/appointment-letter', search: { data: encryptId(id) } })

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    // Server-side ordering — a header click re-queries instead of sorting the
    // page already on screen.
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToCreate,
    goToEdit,
    goToDetail,
    goToAppointmentLetter,
    pendingDelete,
    askDelete: setPendingDelete,
    cancelDelete: () => setPendingDelete(null),
    confirmDelete,
    isDeleting: deleteEmployee.isPending,
    /**
     * `bank_id` → bank name, empty until the master has loaded. Memoised, so the
     * column definitions can list it as a dependency and rebuild when it fills.
     */
    bankNames,
  }
}
