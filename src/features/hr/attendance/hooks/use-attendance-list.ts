import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { usePagination } from '@/hooks/use-pagination'
import { encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ATTENDANCE_GROUP_PAGE_SIZE } from '../constants'
import { useAttendanceGroups } from '../api/use-attendance'
import type { AttendanceGroup } from '../types'

/**
 * The Attendance Management landing screen: the company's three tiles, one page
 * of cards under them, the day being reported on, and the way into a card.
 *
 * Paging and search are server-side — the search box matches the *group* name,
 * so it narrows the cards while the tiles above stay on the company's whole day.
 * There is no sorting: the endpoint offers no `sort`, so no header pretends to.
 */
export function useAttendanceList() {
  const navigate = useNavigate()
  const { params, limit, offset, search, setSearch, onPaginationChange } =
    usePagination(ATTENDANCE_GROUP_PAGE_SIZE)

  /**
   * The day on screen. `''` means "whatever day the server is in" — the client
   * can't compute it, since the business day is bucketed in the server's
   * attendance timezone, so the first load asks for no date at all and the
   * picker is seeded from the `date` that comes back.
   */
  const [date, setDate] = useState('')

  /** Today per the browser — a stand-in for the server's day, never the truth. */
  const browserToday = format(new Date(), 'yyyy-MM-dd')

  const list = useAttendanceGroups(params, date)

  /** A different day is a different result set — start it at its first page. */
  const changeDate = (value: string) => {
    setDate(value)
    onPaginationChange({ limit, offset: 0 })
  }

  /**
   * Open a card. The "Unassigned" bucket has no id to send as `department_id`,
   * so it has no detail screen — the card is rendered as a plain tile and this
   * refuses rather than navigating to a 400.
   */
  const openGroup = (group: AttendanceGroup) => {
    if (group.id === null) return
    navigate({
      to: '/hr/attendance/detail',
      search: {
        data: encryptParams({
          id: group.id,
          groupBy: list.data?.groupBy ?? 'department',
          // Pin the day the cards were read on, so a detail screen opened from
          // yesterday's list doesn't quietly answer for today.
          date: list.data?.date ?? date,
        }),
      },
    })
  }

  const isForbidden = isForbiddenError(list.error)

  return {
    /** The cards — a department each, or a designation each; the server decides. */
    groups: list.data?.items ?? [],
    total: list.data?.total ?? 0,
    /** The COMPANY's day — unmoved by the search box. */
    totals: list.data?.totals,
    /** Which level the cards sit at, for labelling. */
    groupBy: list.data?.groupBy ?? 'department',
    /** The day answered on, and the day the server is in. */
    date: list.data?.date ?? date,
    today: list.data?.today ?? '',

    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    selectedDate: date,
    changeDate,

    /**
     * What the date field shows: the day picked, else the day the server
     * answered on, else the browser's today so the field is never blank on the
     * first paint. The browser's guess only ever fills the gap before the first
     * response — the request itself still goes up with no `date`, so the server
     * decides which business day this is.
     */
    pickerDate: date || list.data?.date || browserToday,
    /**
     * The ceiling on the field — no future day has anything to report. Falls
     * back to the browser's today rather than to nothing, so tomorrow is barred
     * while the first response is still in flight.
     */
    maxDate: parseISO(list.data?.today || browserToday),

    isLoading: list.isLoading,
    isFetching: list.isFetching,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    openGroup,
  }
}
