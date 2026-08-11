import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ATTENDANCE_EMPLOYEE_PAGE_SIZE, ATTENDANCE_MAX_LIMIT } from '../constants'
import {
  useAttendanceGroupEmployees,
  useAttendanceGroups,
} from '../api/use-attendance'
import type {
  AttendanceEmployee,
  AttendanceGroupBy,
  AttendanceStatusFilter,
} from '../types'

/** What the `?data=` token carries into this screen. */
interface AttendanceDetailParams {
  id: number
  groupBy: AttendanceGroupBy
  /** The day the card was read on — `''` for the server's own today. */
  date: string
}

/**
 * One card opened: the group's header tiles and the people behind them.
 *
 * The group is addressed by the encrypted `?data=` token the card put in the
 * URL, so no id is ever in the address bar. Decryption happens here, in the
 * screen's hook, from the token the route hands the page.
 *
 * The Present / Absent pills are a server-side `?status=`, not a filter over the
 * page: the header tiles keep reporting the whole group's day, so the Absent
 * side still shows how many were present.
 */
export function useAttendanceDetail(token?: string) {
  const navigate = useNavigate()

  const parsed = useMemo(() => {
    const raw = token ? decryptParams<Partial<AttendanceDetailParams>>(token) : null
    const id = Number(raw?.id)
    if (!raw || !Number.isFinite(id) || id <= 0) return null
    return {
      id,
      groupBy: raw.groupBy === 'designation' ? 'designation' : 'department',
      date: typeof raw.date === 'string' ? raw.date : '',
    } satisfies AttendanceDetailParams
  }, [token])

  const { params, limit, offset, search, setSearch, onPaginationChange } =
    usePagination(ATTENDANCE_EMPLOYEE_PAGE_SIZE)

  /** The pill on screen. Opens on Present, which is the question usually asked. */
  const [status, setStatus] = useState<AttendanceStatusFilter>('present')

  /**
   * The group and the day can both be switched from this screen, so each is a
   * local override of what the token arrived with — `null` meaning "still the
   * one that was opened". A fresh token (a different card opened from the list)
   * clears them, or the screen would keep answering for the group picked here.
   */
  const [pickedGroupId, setPickedGroupId] = useState<number | null>(null)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  useEffect(() => {
    setPickedGroupId(null)
    setPickedDate(null)
  }, [token])

  const groupBy = parsed?.groupBy ?? ('department' as AttendanceGroupBy)
  const date = pickedDate ?? parsed?.date ?? ''

  const filters = {
    groupBy,
    // 0 is the "no group" sentinel the query hook refuses to fire on.
    groupId: pickedGroupId ?? parsed?.id ?? 0,
    date: date || undefined,
    status,
  }

  const detail = useAttendanceGroupEmployees(params, filters)

  /**
   * Every group of the day, for the header's switcher. One page holds the lot —
   * the endpoint caps `limit` at 100 and a company's department list is far
   * shorter — so the picker searches in the browser rather than per keystroke.
   */
  const groupList = useAttendanceGroups(
    { limit: ATTENDANCE_MAX_LIMIT, offset: 0 },
    date,
  )

  /** A different side is a different result set — start it at its first page. */
  const changeStatus = (next: AttendanceStatusFilter) => {
    setStatus(next)
    onPaginationChange({ limit, offset: 0 })
  }

  /** A different group is a different result set — start it at its first page. */
  const changeGroup = (id: number) => {
    setPickedGroupId(id)
    onPaginationChange({ limit, offset: 0 })
  }

  /** Likewise a different day. */
  const changeDate = (value: string) => {
    setPickedDate(value)
    onPaginationChange({ limit, offset: 0 })
  }

  const goBack = () => navigate({ to: '/hr/attendance' })

  /**
   * Open one person's month.
   *
   * The token carries the name and code as well as the id: the month endpoint
   * answers a timesheet, not an employee record, so the header would have
   * nothing to print otherwise. The group travels along too, so Back returns to
   * this list on the same day rather than to the top of the screen.
   */
  const openEmployee = (employee: AttendanceEmployee) =>
    navigate({
      to: '/hr/attendance/employee',
      search: {
        data: encryptParams({
          employeeId: employee.employeeId,
          name: employee.fullName || employee.name,
          code: employee.code,
          groupBy: filters.groupBy,
          groupId: filters.groupId,
          date: detail.data?.date ?? date,
        }),
      },
    })

  const isForbidden = isForbiddenError(detail.error)

  return {
    /** `false` when the token was missing or unreadable — the page shows "not found". */
    hasGroup: parsed !== null,
    group: detail.data?.group,
    /** The whole group's day, whichever pill is active. */
    totals: detail.data?.totals,
    groupBy: detail.data?.groupBy ?? groupBy,
    date: detail.data?.date ?? date,
    /** The day the server is in — the ceiling on the header's date picker. */
    today: detail.data?.today ?? groupList.data?.today ?? '',

    /** The header's group switcher: every group of the day, and the one shown. */
    groupOptions: groupList.data?.items ?? [],
    groupsLoading: groupList.isLoading,
    selectedGroupId: filters.groupId,
    changeGroup,
    selectedDate: pickedDate ?? '',
    changeDate,

    employees: detail.data?.items ?? [],
    /** Rows on the *filtered* side, across every page. */
    total: detail.data?.total ?? 0,

    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    status,
    changeStatus,

    isLoading: detail.isLoading,
    isFetching: detail.isFetching,
    isError: detail.isError && !isForbidden,
    error: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,

    goBack,
    openEmployee,
  }
}
