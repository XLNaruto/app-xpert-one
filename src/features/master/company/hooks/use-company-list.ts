import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useCompanies } from '../api/use-companies'
import { useDeleteCompany } from '../api/use-company-mutations'
import type { Company } from '../types'

/**
 * Orchestrates the company master list screen: the list query, navigation to
 * the detail/create/edit screens and the delete flow. The page consumes this
 * and only renders.
 */
export function useCompanyList() {
  const navigate = useNavigate()
  const { params, limit, offset, search, setSearch, onPaginationChange } =
    usePagination()
  const { data, isLoading, isError, error } = useCompanies(params)
  const deleteCompany = useDeleteCompany()

  const [pendingDelete, setPendingDelete] = useState<Company | null>(null)

  const goToCreate = () => navigate({ to: '/master/company/create' })
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
        toast.success('Company deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete company'),
    })
  }

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    isLoading,
    isError,
    error,
    goToCreate,
    goToDetail,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteCompany.isPending,
  }
}
