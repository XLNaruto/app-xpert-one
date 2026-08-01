import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useAllowanceDeductions } from '../api/use-allowance-deductions'
import { useDeleteAllowanceDeduction } from '../api/use-allowance-deduction-mutations'
import type { AllowanceDeduction } from '../types'

/**
 * Orchestrates the allowance / deduction master list screen: the list query,
 * navigation to the create/edit screens and the delete flow. The page consumes
 * this and only renders.
 */
export function useAllowanceDeductionList() {
  const navigate = useNavigate()
  const { params, limit, offset, search, setSearch, onPaginationChange } =
    usePagination()
  const { data, isLoading, isError, error } = useAllowanceDeductions(params)
  const deleteRecord = useDeleteAllowanceDeduction()

  const [pendingDelete, setPendingDelete] = useState<AllowanceDeduction | null>(null)

  const goToCreate = () => navigate({ to: '/master/allowance-deduction/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: '/master/allowance-deduction/create',
      search: { data: encryptId(id) },
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteRecord.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Record deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete record'),
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
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteRecord.isPending,
  }
}
