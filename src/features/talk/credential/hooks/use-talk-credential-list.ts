import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useMyCompanies } from '@/features/company'
import { ALL_COMPANIES, TALK_CREDENTIAL_DEFAULT_SORT } from '../constants'
import { useTalkCredentials } from '../api/use-talk-credentials'
import { useDeleteTalkCredential } from '../api/use-talk-credential-mutations'
import type { TalkCredential } from '../types'

/**
 * Orchestrates the Talk Credential screen: the paged list, the company filter,
 * navigation to the issue/edit form and the delete flow. The page consumes this
 * and only renders.
 *
 * Search, paging and sorting are all server-side, so a header click or a search
 * term re-queries rather than reordering the page on screen. `search` matches
 * the LOGIN ADDRESS alone — not the employee's name, which the endpoint doesn't
 * search — and the placeholder says so.
 *
 * The company filter is server-side too, and it matches EITHER kind of grant: a
 * credential reaches a company through a whole-company chip or through a single
 * department inside it.
 */
export function useTalkCredentialList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, TALK_CREDENTIAL_DEFAULT_SORT)

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

  const { data, isLoading, isError, error } = useTalkCredentials(
    params,
    companyFilter ? Number(companyFilter) : undefined,
  )
  const removeCredential = useDeleteTalkCredential()

  const [pendingDelete, setPendingDelete] = useState<TalkCredential | null>(null)

  /** Filtering is a different result set, so it starts at its own first page. */
  const changeCompanyFilter = (value: string) => {
    setCompanyFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }

  const resetFilters = () => {
    setSearch('')
    changeCompanyFilter(ALL_COMPANIES)
  }

  const goToCreate = () => navigate({ to: '/talk/credential/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/talk/credential/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeCredential.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Talk credential deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't delete the Talk credential.")),
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
    resetFilters,
    isLoading,
    isError: isError && !isForbidden,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: removeCredential.isPending,
  }
}
