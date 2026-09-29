import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useSopGroupOptions } from '@/features/office-task/sop-group'
import { SOP_ASSIGNMENT_DEFAULT_SORT } from '../constants'
import { useSopAssignments } from '../api/use-sop-assignments'
import { useAssignmentActions } from './use-assignment-actions'
import type { SopAssignmentFilters } from '../types'

/**
 * SOP assignments — opened from SOP Tasks' "View Assignments", optionally
 * narrowed to one group. Assigning happens on the group's Assign tab.
 */
export function useSopAssignmentList(initialGroupId?: number) {
  const navigate = useNavigate()
  const pagination = usePagination(DEFAULT_PAGE_SIZE, SOP_ASSIGNMENT_DEFAULT_SORT)
  const [filters, setFilters] = useState<SopAssignmentFilters>({
    groupId: initialGroupId !== undefined ? String(initialGroupId) : '',
    status: 'all',
  })
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)
  const { data, isLoading, isError, error } = useSopAssignments(filters, pagination.params)
  const groups = useSopGroupOptions()
  const actions = useAssignmentActions()
  const access = useResourceAccess(PERMISSIONS.sopAssignments)

  const changeFilter = (patch: Partial<SopAssignmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    pagination.onPaginationChange({ limit: pagination.limit, offset: 0 })
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
    filters,
    changeFilter,
    resetFilters: () => {
      pagination.setSearch('')
      changeFilter({ groupId: '', status: 'all' })
    },
    groupOptions: [
      { label: 'All SOP groups', value: '' },
      ...(groups.data ?? []).map((g) => ({ label: g.name, value: String(g.id) })),
    ],
    actions,
    goToGroups: () => navigate({ to: '/office-task/sop-group' }),
    goToDetail: (id: number) =>
      navigate({ to: '/office-task/sop-assignment/detail', search: { data: encryptId(id) } }),
  }
}
