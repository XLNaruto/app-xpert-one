import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { usePagination } from '@/hooks/use-pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchSelect } from '@/features/master/branch'
import { useDepartmentSelect, type Department } from '@/features/master/department'
import { SCHEDULE_MAX_LIMIT, SCHEDULE_PAGE_SIZE } from '../constants'
import {
  maxWindowEnd,
  monthWindow,
  todayIso,
  windowDates,
} from '../lib/shift-schedule-mappers'
import { useShiftSchedules } from '../api/use-shift-schedules'
import { useShiftScheduleDay } from './use-shift-schedule-day'
import { useShiftScheduleGenerate } from './use-shift-schedule-generate'
import type { ScheduleFilters } from '../types'

/**
 * The Off-Day Schedule screen: its filters, the paged grid, the cell editor and
 * Generate. The page consumes this and only lays out markup.
 *
 * The company is the session's active one. Branch and department are
 * independent filters, but when both are picked the department must sit under
 * the branch — so picking a branch clears the department and lists only that
 * branch's departments. The window opens on the current month and can
 * be any `from`…`to` up to 31 days; the pickers refuse anything wider.
 *
 * Paging and search (`term`, name or code) are server-side; the endpoint sorts
 * nothing, so no header offers to.
 */
export function useShiftScheduleList() {
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const { params, limit, offset, search, setSearch, onPaginationChange: setPage } =
    usePagination(SCHEDULE_PAGE_SIZE)

  /** The table's "All" is a negative limit — the most the endpoint serves. */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPage(next.limit < 0 ? { limit: SCHEDULE_MAX_LIMIT, offset: 0 } : next),
    [setPage],
  )

  const [filters, setFilters] = useState<ScheduleFilters>(() => ({
    branchId: null,
    departmentId: null,
    ...monthWindow(format(new Date(), 'yyyy-MM')),
  }))

  /** A different filter is a different set of employees — back to page one. */
  const updateFilters = (patch: Partial<ScheduleFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPage({ limit, offset: 0 })
  }

  // Another tenant's branches and departments mean nothing here.
  useEffect(() => {
    setFilters((prev) => ({ ...prev, branchId: null, departmentId: null }))
  }, [companyId])

  const setMonth = (month: string) => {
    if (month) updateFilters(monthWindow(month))
  }

  /** Moving `from` drags `to` along whenever the window would break. */
  const setFrom = (from: string) => {
    if (!from) return
    const end = maxWindowEnd(from)
    const to = filters.to < from || filters.to > end ? end : filters.to
    updateFilters({ from, to })
  }

  const setTo = (to: string) => {
    if (to) updateFilters({ to })
  }

  const setBranchId = (branchId: number | null) =>
    updateFilters({ branchId, departmentId: null })

  const setDepartmentId = (departmentId: number | null) => updateFilters({ departmentId })

  const branches = useBranchSelect({
    selected: filters.branchId === null ? undefined : String(filters.branchId),
    enabled: companyId !== null,
  })

  /*
    `/user/departments` can't filter by branch, and the paged select maps its
    rows once — so each department's branch is noted as its row is mapped, and
    the options are narrowed to the picked branch afterwards.
  */
  const [branchOf] = useState(() => new Map<string, number | null>())
  const departmentOption = useCallback(
    (row: Department) => {
      branchOf.set(String(row.id), row.branchId)
      return { label: row.departmentName, value: String(row.id) }
    },
    [branchOf],
  )

  const departmentSelect = useDepartmentSelect({
    selected: filters.departmentId === null ? undefined : String(filters.departmentId),
    toOption: departmentOption,
    enabled: companyId !== null,
  })

  const departments = useMemo(
    () => ({
      ...departmentSelect,
      options:
        filters.branchId === null
          ? departmentSelect.options
          : departmentSelect.options.filter(
              (option) =>
                // The picked department stays, so the field never loses its label.
                option.value === String(filters.departmentId) ||
                branchOf.get(option.value) === filters.branchId,
            ),
    }),
    [departmentSelect, filters.branchId, filters.departmentId, branchOf],
  )

  const grid = useShiftSchedules(filters, params, companyId)

  /** One column per date of the window the rows were read for. */
  const dates = useMemo(
    () => windowDates(grid.data?.from ?? filters.from, grid.data?.to ?? filters.to),
    [grid.data?.from, grid.data?.to, filters.from, filters.to],
  )

  const day = useShiftScheduleDay()
  const generate = useShiftScheduleGenerate(filters)

  const isForbidden = isForbiddenError(grid.error)

  return {
    companyId,
    filters,
    /** The month the window starts in, for the month picker. */
    month: filters.from.slice(0, 7),
    setMonth,
    setFrom,
    setTo,
    /** The farthest `to` the window may reach from its `from`. */
    maxTo: parseISO(maxWindowEnd(filters.from)),
    minTo: parseISO(filters.from),
    setBranchId,
    setDepartmentId,
    branches,
    departments,

    dates,
    today: todayIso(),
    rows: grid.data?.items ?? [],
    total: grid.data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    isLoading: grid.isLoading,
    isFetching: grid.isFetching,
    isError: grid.isError && !isForbidden,
    error: grid.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(grid.error) : undefined,

    /** The cell editor. */
    day,
    /** Generate and its last answer. */
    generate,
  }
}
