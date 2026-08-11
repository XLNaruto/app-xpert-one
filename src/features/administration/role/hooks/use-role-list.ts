import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ROLE_DEFAULT_SORT } from '../constants'
import { useRoles } from '../api/use-roles'
import { useDeleteRole } from '../api/use-role-mutations'
import type { RoleListRow } from '../types'

/**
 * Orchestrates the Roles & Permissions screen: the paged list, navigation to the
 * create/edit builder and the delete flow. The page consumes this and only
 * renders.
 *
 * Search, paging and sorting are all server-side, so a header click or a search
 * term re-queries rather than reordering the page on screen.
 */
export function useRoleList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, ROLE_DEFAULT_SORT)

  const { data, isLoading, isError, error } = useRoles(params)
  const removeRole = useDeleteRole()

  const [pendingDelete, setPendingDelete] = useState<RoleListRow | null>(null)

  const goToCreate = () => navigate({ to: '/administration/role/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/administration/role/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeRole.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Role deleted')
        setPendingDelete(null)
      },
      // A role still held by a live user answers 409 with the count, which is
      // exactly what the person deleting it needs to read.
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't delete the role.")),
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
    isDeleting: removeRole.isPending,
  }
}
