import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ALL_PAGE_SIZE } from '@/components/data-table'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { COMPANY_DEFAULT_SORT } from '../constants'
import { useCompanies } from '../api/use-companies'
import { useCompanyLimit } from '../api/use-company-limit'
import { companyLimitMessage } from '../lib/company-mappers'
import { useDeleteCompany } from '../api/use-company-mutations'
import type { Company } from '../types'

/**
 * Orchestrates the company master list screen: the list query, navigation to
 * the detail/create/edit screens and the delete flow. The page consumes this
 * and only renders.
 */
export function useCompanyList() {
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
  } = usePagination(ALL_PAGE_SIZE, COMPANY_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useCompanies(params)
  const deleteCompany = useDeleteCompany()
  // The plan's company allowance (`GET /user/companies/limit`).
  const { data: companyLimit } = useCompanyLimit()

  const [pendingDelete, setPendingDelete] = useState<Company | null>(null)

  /*
   * The plan caps how many companies the account may hold. When the API says
   * one more can't be created (limit used up, or no active plan), Add stops
   * here with a toast instead of opening a form the save would reject. Until
   * the limit has loaded, Add goes through — `POST` runs the same check.
   */
  const goToCreate = () => {
    if (companyLimit && !companyLimit.canCreate) {
      toast.error(
        companyLimit.hasActivePlan ? 'Company Limit Reached' : 'No Active Plan',
        { description: companyLimitMessage(companyLimit) },
      )
      return
    }
    navigate({ to: '/master/company/create' })
  }
  // Detail and edit reuse the same screens as create; the raw id travels
  // encrypted in `?data=` so it's never exposed in the address bar.
  const goToDetail = (id: number) =>
    navigate({ to: '/master/company/detail', search: { data: encryptId(id) } })
  const goToEdit = (id: number) =>
    navigate({ to: '/master/company/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteCompany.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Company Deleted')
        setPendingDelete(null)
      },
      /*
       * A 409 means something still depends on the record (the API names what
       * and how many) — its message is shown as-is. The dialog closes and the
       * row stays: nothing is removed until the API answers 204.
       */
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to Delete Company')
        setPendingDelete(null)
      },
    })
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
    // page on screen.
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToCreate,
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteCompany.isPending,
  }
}
