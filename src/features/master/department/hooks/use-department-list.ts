import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useDepartments } from '../api/use-departments'
import { useDeleteDepartment } from '../api/use-department-mutations'
import type { Department } from '../types'

/**
 * Orchestrates the department master list screen: the list query, navigation to
 * the create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useDepartmentList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useDepartments()
  const deleteDepartment = useDeleteDepartment()

  const [pendingDelete, setPendingDelete] = useState<Department | null>(null)

  const goToCreate = () => navigate({ to: '/master/department/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/department/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDepartment.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Department deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete department'),
    })
  }

  return {
    rows: data ?? [],
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteDepartment.isPending,
  }
}
