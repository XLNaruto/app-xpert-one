import { useState } from 'react'
import { ALL_PAGE_SIZE } from '@/components/data-table'
import { usePagination } from '@/hooks/use-pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingChanges } from '../api/use-setting-changes'
import type { SettingChangeStatus, SettingKey } from '../schemas'

/**
 * The Settings screen's History tab: one server page of booked changes, with
 * a server-side search and the setting and status filters. The order is the
 * endpoint's own (newest `effective_from` first) — it takes no sort.
 */
export function useSettingChangeHistory() {
  const companyId = useAuthStore((s) => s.user?.companyId ?? null)
  const { params, limit, offset, onPaginationChange, search, setSearch } =
    usePagination(ALL_PAGE_SIZE)

  /** '' is "any", which the API gets as no parameter at all. */
  const [settingKeyFilter, setSettingKeyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isError, error } = useSettingChanges(companyId, params, {
    settingKey: (settingKeyFilter || undefined) as SettingKey | undefined,
    status: (statusFilter || undefined) as SettingChangeStatus | undefined,
  })

  /** A filter is a different result set, so it starts at its own first page. */
  const changeSettingKeyFilter = (value: string) => {
    setSettingKeyFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }
  const changeStatusFilter = (value: string) => {
    setStatusFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }
  const resetFilters = () => {
    setSettingKeyFilter('')
    setStatusFilter('')
    setSearch('')
    onPaginationChange({ limit, offset: 0 })
  }

  return {
    rows: data?.items ?? [],
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    settingKeyFilter,
    changeSettingKeyFilter,
    statusFilter,
    changeStatusFilter,
    resetFilters,
    isLoading,
    isError,
    error,
  }
}
