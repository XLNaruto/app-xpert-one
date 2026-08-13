import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePagination } from '@/hooks/use-pagination'
import { useAuthStore } from '@/stores/auth-store'
import { ALL_ROWS } from '@/lib/pagination'
import { departmentOptions, useDepartments } from '@/features/master/department'
import { employeeOptions, useEmployees } from '@/features/hr/employee'
import {
  REPORT_MAX_LIMIT,
  REPORT_PAGE_SIZE,
  reportMonthBounds,
  reportYearOptions,
  toIsoMonth,
} from '../constants'
import type { ReportFilters, ReportRangeFilters, ReportTypeOption } from '../types'

/**
 * Everything the four report screens do that isn't their own columns: the type,
 * the period, who it covers, when it is read, and the page it is read in.
 *
 * **Filters are staged, not live.** The card holds a draft and only "Filter Data"
 * commits it. Every other list in the app reads straight through, but a report
 * is a wide server-side aggregation over a whole month, and a half-made
 * filter — the month changed but not yet the department — would fire a request
 * nobody asked for. Nothing loads at all until the first apply, which is what
 * the card's helper line promises.
 *
 * Search, sort and paging are the exception: they act on the report ALREADY on
 * screen, so they read through immediately against the applied filters.
 *
 * The one thing the hook must not do is carry an order across a type switch.
 * Each endpoint accepts only its own columns for `sort` and answers a 400 for
 * anything else, so applying a new type resets the order to that type's default.
 */
export function useReportScreen<TType extends string>(
  types: readonly ReportTypeOption<TType>[],
) {
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const today = useMemo(() => new Date(), [])
  const [defaultType] = types

  /* ── The draft the card holds ── */
  const [type, setType] = useState<TType>(defaultType.value)
  const [month, setMonth] = useState(() => today.getMonth() + 1)
  const [year, setYear] = useState(() => today.getFullYear())
  const [from, setFrom] = useState(() => toIsoMonth(today.getMonth() + 1, today.getFullYear()))
  const [to, setTo] = useState(() => toIsoMonth(today.getMonth() + 1, today.getFullYear()))
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [employeeIds, setEmployeeIds] = useState<number[]>([])

  /* ── What was actually asked for ── */
  const [applied, setApplied] = useState<{
    type: TType
    month: number
    year: number
    from: string
    to: string
    departmentId: number | null
    employeeIds: number[]
  } | null>(null)

  const typeConfig = useMemo(
    () => types.find((option) => option.value === type) ?? defaultType,
    [types, type, defaultType],
  )
  const appliedTypeConfig = useMemo(
    () => types.find((option) => option.value === applied?.type) ?? defaultType,
    [types, applied?.type, defaultType],
  )

  /* The order the table opens in — the APPLIED type's, since that's the report
     on screen. Passing the draft's would let a header click send a column the
     endpoint being read doesn't have. */
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    sorting,
    onSortingChange,
    onPaginationChange: setPagination,
  } = usePagination(REPORT_PAGE_SIZE, appliedTypeConfig.defaultSort)

  /**
   * `<DataTable>`'s size selector always offers "All", reported back as a
   * negative limit. No report endpoint can answer that, so it's taken as the
   * largest page they will serve rather than sent as a request they refuse.
   */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPagination(next.limit < 0 ? { limit: REPORT_MAX_LIMIT, offset: 0 } : next),
    [setPagination],
  )

  /* A newly applied type is a different endpoint with a different column set, so
     the order goes back to that type's own default — the previous type's `sort`
     would be a 400 against it. Clearing the sorting is what `usePagination`
     reads as "fall back to the default", and by the time this effect runs that
     default is already the new type's.

     Keyed on the applied TYPE alone, deliberately: re-applying with a different
     month or department is the same columns in a different period, and there is
     no reason to throw away the order the user chose. */
  const appliedType = applied?.type ?? null
  useEffect(() => {
    if (appliedType === null) return
    onSortingChange([])
  }, [appliedType, onSortingChange])

  /** Commit the draft. A different report starts at its own first page. */
  const apply = useCallback(() => {
    setApplied({ type, month, year, from, to, departmentId, employeeIds })
    setSearch('')
    onPaginationChange({ limit, offset: 0 })
  }, [type, month, year, from, to, departmentId, employeeIds, setSearch, onPaginationChange, limit])

  /** The draft differs from what's on screen — i.e. "Filter Data" would do something. */
  const isDirty =
    !applied ||
    applied.type !== type ||
    applied.departmentId !== departmentId ||
    applied.employeeIds.join() !== employeeIds.join() ||
    (typeConfig.isRange
      ? applied.from !== from || applied.to !== to
      : applied.month !== month || applied.year !== year)

  /** `from` after `to` is a 400, so the card refuses to send it. */
  const isRangeInvalid = Boolean(typeConfig.isRange) && Boolean(from) && Boolean(to) && from > to
  const canApply = companyId !== null && isDirty && !isRangeInvalid

  /* ── What the query hooks take ── */

  const filters = useMemo<ReportFilters | null>(
    () =>
      applied && companyId !== null
        ? {
            companyId,
            month: applied.month,
            year: applied.year,
            departmentId: applied.departmentId,
            employeeIds: applied.employeeIds,
          }
        : null,
    [applied, companyId],
  )

  const rangeFilters = useMemo<ReportRangeFilters | null>(
    () =>
      applied && companyId !== null
        ? {
            companyId,
            from: applied.from,
            to: applied.to,
            departmentId: applied.departmentId,
            employeeIds: applied.employeeIds,
          }
        : null,
    [applied, companyId],
  )

  /* ── Dropdown data ── */

  const departments = useDepartments(ALL_ROWS)
  const departmentChoices = useMemo(
    () => departmentOptions(departments.data?.items ?? []),
    [departments.data],
  )

  const employees = useEmployees(ALL_ROWS)
  const employeeChoices = useMemo(
    () => employeeOptions(employees.data?.items ?? []),
    [employees.data],
  )

  const yearChoices = useMemo(() => reportYearOptions(today), [today])
  const monthBounds = useMemo(() => reportMonthBounds(today), [today])

  return {
    companyId,

    /* The draft */
    type,
    setType,
    typeConfig,
    month,
    setMonth,
    year,
    setYear,
    from,
    setFrom,
    to,
    setTo,
    departmentId,
    setDepartmentId,
    employeeIds,
    setEmployeeIds,

    /* Applying it */
    apply,
    canApply,
    isDirty,
    isRangeInvalid,
    /** Nothing is read until the first apply — the card says so until then. */
    hasApplied: applied !== null,
    /** The type the table on screen is showing — never the draft. */
    appliedType,
    appliedTypeConfig,
    filters,
    rangeFilters,
    /** The applied department, for the report heading. */
    appliedDepartmentName:
      departmentChoices.find((option) => option.value === String(applied?.departmentId))?.label ??
      null,

    /* The page */
    params,
    limit,
    offset,
    search,
    setSearch,
    sorting,
    onSortingChange,
    onPaginationChange,

    /* Dropdown data */
    departmentChoices,
    departmentsLoading: departments.isLoading,
    employeeChoices,
    employeesLoading: employees.isLoading,
    yearChoices,
    monthBounds,
  }
}
