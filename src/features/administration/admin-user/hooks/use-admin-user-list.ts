import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { useMyCompanies } from '@/features/company'
import { ADMIN_USER_DEFAULT_SORT, ALL_COMPANIES } from '../constants'
import { useAdminUsers } from '../api/use-admin-users'
import { useDeleteAdminUser } from '../api/use-admin-user-mutations'
import type { AdminUser } from '../types'

/**
 * Orchestrates the Users screen: the paged list, the company filter, navigation
 * to the create/edit form and the delete flow. The page consumes this and only
 * renders.
 *
 * Search, paging and sorting are all server-side, so a header click or a search
 * term re-queries rather than reordering the page on screen. The company filter
 * is server-side too — and narrowing to one company drops the account OWNERS,
 * who belong to none.
 */
export function useAdminUserList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, ADMIN_USER_DEFAULT_SORT)

  /** '' is every company — which the API gets as no `company_id` at all. */
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES)

  const { companies } = useMyCompanies()
  const companyOptions = useMemo(
    () => [
      { label: 'All companies', value: ALL_COMPANIES },
      ...companies.map((company) => ({ label: company.name, value: String(company.id) })),
    ],
    [companies],
  )

  /** Company names by id, so the list can label a row's company. */
  const companyNames = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  )

  const { data, isLoading, isError, error } = useAdminUsers(
    params,
    companyFilter ? Number(companyFilter) : undefined,
  )
  const removeUser = useDeleteAdminUser()

  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null)

  /**
   * The signed-in user's own id. The API refuses to delete it (and to re-role
   * it), so the row simply offers no delete rather than a button that 400s.
   */
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)

  /** Filtering is a different result set, so it starts at its own first page. */
  const changeCompanyFilter = (value: string) => {
    setCompanyFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }

  const resetFilters = () => {
    setSearch('')
    changeCompanyFilter(ALL_COMPANIES)
  }

  const goToCreate = () => navigate({ to: '/administration/admin-user/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: '/administration/admin-user/create',
      search: { data: encryptId(id) },
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeUser.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('User deleted')
        setPendingDelete(null)
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't delete the user.")),
    })
  }

  // A 403 isn't a broken screen, it's a missing permission.
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
    sorting,
    onSortingChange,
    companyFilter,
    changeCompanyFilter,
    companyOptions,
    companyNames,
    resetFilters,
    isLoading,
    isError: isError && !isForbidden,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    currentUserId,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: removeUser.isPending,
  }
}
