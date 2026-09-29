import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId, encryptParams } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS, useCan, useResourceAccess } from '@/features/permissions'
import { SOP_GROUP_DEFAULT_SORT } from '../constants'
import { useDeleteSopGroup, useSopGroups } from '../api/use-sop-groups'
import type { SopGroupRow } from '../types'

/** SOP Tasks: the group list, navigation, the checklist preview and delete. */
export function useSopGroupList() {
  const navigate = useNavigate()
  const pagination = usePagination(DEFAULT_PAGE_SIZE, SOP_GROUP_DEFAULT_SORT)
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)
  const { data, isLoading, isError, error } = useSopGroups(pagination.params)
  const remove = useDeleteSopGroup()
  const access = useResourceAccess(PERMISSIONS.sopGroups)
  const { can } = useCan()

  const [preview, setPreview] = useState<SopGroupRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SopGroupRow | null>(null)

  const confirmDelete = () => {
    if (!pendingDelete) return
    remove.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('SOP group deleted')
        setPendingDelete(null)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return {
    ...pagination,
    rows: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
    companyId,
    access,
    /** SOP Assignments is its own resource — the links to it follow that grant. */
    canViewAssignments: can(`${PERMISSIONS.sopAssignments}:list`),
    goToCreate: () => navigate({ to: '/office-task/sop-group/create' }),
    goToEdit: (id: number) =>
      navigate({ to: '/office-task/sop-group/create', search: { data: encryptId(id) } }),
    /** Straight to the Assign Employees tab of that group. */
    goToAssign: (id: number) =>
      navigate({
        to: '/office-task/sop-group/create',
        search: { data: encryptParams({ id, tab: 'assign' }) },
      }),
    /** Every assignment, or just one group's. */
    viewAssignments: (groupId?: number) =>
      navigate({
        to: '/office-task/sop-assignment',
        search: groupId === undefined ? {} : { data: encryptParams({ groupId }) },
      }),
    preview,
    setPreview,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: remove.isPending,
  }
}
