import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useBranches } from '@/features/master/branch'
import { DEPARTMENT_DEFAULT_SORT } from '../constants'
import { useDepartments } from '../api/use-departments'
import { useDeleteDepartment } from '../api/use-department-mutations'
import { withBranchNames } from '../lib/department-mappers'
import type { Department } from '../types'

/**
 * Orchestrates the department master list screen: the list query, navigation to
 * the create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useDepartmentList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, DEPARTMENT_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useDepartments(params)
  const deleteDepartment = useDeleteDepartment()

  // The endpoint sends `branch_id` alone, so the Branch column is resolved
  // against the branch master.
  const branches = useBranches()
  const rows = useMemo(
    () => withBranchNames(data?.items ?? [], branches.data?.items ?? []),
    [data, branches.data],
  )

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

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    rows,
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
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteDepartment.isPending,
  }
}
