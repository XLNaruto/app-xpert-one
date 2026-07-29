import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useLeaveTypes } from '../api/use-leave-types'
import { useDeleteLeaveType } from '../api/use-leave-type-mutations'
import type { LeaveType } from '../types'

/**
 * Orchestrates the leave type master list screen: the list query, navigation to
 * the create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useLeaveTypeList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useLeaveTypes()
  const deleteLeaveType = useDeleteLeaveType()

  const [pendingDelete, setPendingDelete] = useState<LeaveType | null>(null)

  const goToCreate = () => navigate({ to: '/master/leave-type/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/leave-type/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteLeaveType.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Leave type deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete leave type'),
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
    isDeleting: deleteLeaveType.isPending,
  }
}
