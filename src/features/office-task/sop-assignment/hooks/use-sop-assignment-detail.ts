import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { shiftIso, todayIso } from '@/features/office-task/common'
import {
  useSopAssignment,
  useSopAssignmentItems,
  useSopAssignmentRuns,
} from '../api/use-sop-assignments'
import { useAssignmentActions } from './use-assignment-actions'
import type { SopRunRange } from '../types'

/** The last seven days, today included — where the detail screen opens. */
const defaultRunRange = (): SopRunRange => ({ from: shiftIso(todayIso(), -6), to: todayIso() })

/** One assignment's screen — the record, its runs over a date range, Stop / Delete. */
export function useSopAssignmentDetail(id?: number) {
  const navigate = useNavigate()
  const detail = useSopAssignment(id)
  const items = useSopAssignmentItems(id)
  const access = useResourceAccess(PERMISSIONS.sopAssignments)
  const goToList = () => navigate({ to: '/office-task/sop-assignment' })
  // A restart after a gap is a NEW assignment — always follow the id the API answers.
  const actions = useAssignmentActions(goToList, (started) => {
    if (started !== id) navigate({ to: '/office-task/sop-assignment/detail', search: { data: encryptId(started) } })
  })

  const [range, setRange] = useState<SopRunRange>(defaultRunRange)
  const pagination = usePagination()
  const runs = useSopAssignmentRuns(id, range, pagination.params)

  return {
    assignment: detail.data,
    isLoading: id !== undefined && detail.isLoading,
    notFound: id === undefined || detail.isError,
    error: detail.error,
    access,
    items: {
      rows: items.data ?? [],
      isLoading: items.isLoading,
      error: items.error,
    },
    actions,
    goToList,
    runs: {
      rows: runs.data?.items ?? [],
      total: runs.data?.total ?? 0,
      isLoading: runs.isLoading,
      error: runs.error,
      range,
      /** A new window is a new result set — back to its first page. */
      changeRange: (patch: Partial<SopRunRange>) => {
        setRange((r) => ({ ...r, ...patch }))
        pagination.onPaginationChange({ limit: pagination.limit, offset: 0 })
      },
      resetFilters: () => {
        pagination.setSearch('')
        setRange(defaultRunRange())
        pagination.onPaginationChange({ limit: pagination.limit, offset: 0 })
      },
      search: pagination.search,
      setSearch: pagination.setSearch,
      limit: pagination.limit,
      offset: pagination.offset,
      onPaginationChange: pagination.onPaginationChange,
    },
  }
}
