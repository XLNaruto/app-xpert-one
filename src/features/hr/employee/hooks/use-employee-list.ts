import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId, encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { EMPLOYEE_DEFAULT_SORT } from '../constants'
import { useEmployees } from '../api/use-employees'

/**
 * Orchestrates the employee list screen: the paged query and navigation into the
 * wizard and the detail view.
 *
 * The list has no activate/deactivate action and no Active/Inactive column. The
 * API exposes no `DELETE /user/employees/:id` — an employee is never removed,
 * because payroll, leave and attendance history all point at the row — and taking
 * someone off strength means closing their open posting
 * (`POST …/transfers/:serviceId/leave-service`), which is done from the Service
 * History tab where the leaving date and reason are chosen. A list row couldn't
 * drive that anyway: `GET /user/employees` answers the person and their completion
 * flags but not their current posting, so showing live status here would mean one
 * detail request per row.
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
  }
}
