import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId, encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { EMPLOYEE_DEFAULT_SORT } from '../constants'
import { useEmployee, useEmployees } from '../api/use-employees'
import { useLeaveEmployeeService } from '../api/use-employee-step-mutations'
import { todayIso, toFormDate } from '../lib/employee-dates'
import type { Employee } from '../types'

/**
 * Orchestrates the employee list screen: the paged query, navigation into the
 * wizard and the detail view, and the deactivate flow.
 *
 * **On deactivating rather than deleting.** The API exposes no `DELETE
 * /user/employees/:id` — an employee is never removed, because payroll, leave and
 * attendance history all point at the row. What it offers instead is closing the
 * open posting (`POST …/transfers/:serviceId/leave-service`): with no posting open
 * the employee is off strength, which is what "deactivate" means here.
 *
 * **Why the dialog reads the employee again.** `GET /user/employees` answers the
 * person and their completion flags but *not* their current posting — only
 * `GET /user/employees/:id` carries `service`. Closing a posting needs its id, so
 * the one record is read when the dialog opens rather than pretending a list row
 * knows it. That's also why the table has no live Active/Inactive column: it would
 * mean one detail request per row.
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

  /** The employee whose posting is being closed, and the reason for it. */
  const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  // The posting to close lives on the detail read, not on the list row.
  const target = useEmployee(pendingDeactivate?.id ?? Number.NaN)
  const targetService = target.data?.service ?? null
  const openServiceId =
    targetService && !targetService.leavingDate ? targetService.id : undefined

  const leaveService = useLeaveEmployeeService(pendingDeactivate?.id ?? Number.NaN)

  const goToCreate = () => navigate({ to: '/hr/employee/create' })

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

  const startDeactivate = (employee: Employee) => {
    setDeactivateReason('')
    setPendingDeactivate(employee)
  }

  const cancelDeactivate = () => {
    setPendingDeactivate(null)
    setDeactivateReason('')
  }

  const confirmDeactivate = () => {
    const employee = pendingDeactivate
    if (!employee || openServiceId === undefined) return

    leaveService.mutate(
      {
        serviceId: openServiceId,
        // Today is the natural leaving date from a list row; a back-dated exit
        // belongs in the Transfer History tab, where the date is chosen.
        values: { leavingDate: todayIso(), leavingReason: deactivateReason.trim() },
      },
      {
        onSuccess: () => {
          toast.success(`${employee.name || 'Employee'} deactivated`)
          cancelDeactivate()
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to deactivate')),
      },
    )
  }

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

    pendingDeactivate,
    deactivateReason,
    setDeactivateReason,
    startDeactivate,
    cancelDeactivate,
    confirmDeactivate,
    /** Reading the posting to close — the dialog waits for it. */
    isLoadingTarget: pendingDeactivate !== null && target.isLoading,
    /** True once a still-open posting has been found to close. */
    canDeactivate: openServiceId !== undefined,
    /** When the employee has already left, the date they left on. */
    alreadyLeftOn:
      targetService && targetService.leavingDate
        ? toFormDate(targetService.leavingDate)
        : '',
    /** The posting being closed, for the dialog's copy. */
    targetJoiningDate: targetService ? toFormDate(targetService.joiningDate) : '',
    isDeactivating: leaveService.isPending,
  }
}
