import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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
  const { data, isLoading, isError, error } = useCompanies()
  const deleteCompany = useDeleteCompany()

  const [pendingDelete, setPendingDelete] = useState<Company | null>(null)

  const goToCreate = () => navigate({ to: '/company/new' })
  const goToDetail = (id: number) =>
    navigate({ to: '/company/$companyId', params: { companyId: String(id) } })
  const goToEdit = (id: number) =>
    navigate({ to: '/company/$companyId/edit', params: { companyId: String(id) } })

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
    rows: data ?? [],
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
