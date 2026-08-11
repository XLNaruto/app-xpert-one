import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { addMonths, format, parseISO } from 'date-fns'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ATTENDANCE_MAX_LIMIT } from '../constants'
import {
  useAttendanceGroupEmployees,
  useAttendanceMonth,
} from '../api/use-attendance'
import { indexDaysByDate } from '../lib/attendance-mappers'
import type { AttendanceDay, AttendanceGroupBy } from '../types'

/** What the `?data=` token carries into the month screen. */
interface AttendanceEmployeeParams {
  employeeId: number
  /** Carried along because the month endpoint answers a timesheet, not a person. */
  name: string
  code: string
  /** The group to return to, and the day it was being read on. */
  groupBy: AttendanceGroupBy
  groupId: number
  date: string
}

/** `yyyy-MM` of the month a `yyyy-MM-dd` day falls in — today's when there's none. */
function monthOf(date: string): string {
  const parsed = date ? parseISO(date) : new Date()
  return format(Number.isNaN(parsed.getTime()) ? new Date() : parsed, 'yyyy-MM')
}

/**
 * One employee's month, as the calendar draws it.
 *
 * The month is client state — stepping to the previous month is a different read
 * of the same employee, so it lives here and rides in the query key rather than
 * in the URL. The employee, though, arrives in the encrypted `?data=` token the
 * row wrote: no id in the address bar, and the name and code come with it
 * because the endpoint answers a timesheet rather than an employee record.
 */
export function useAttendanceEmployee(token?: string) {
  const navigate = useNavigate()

  const parsed = useMemo(() => {
    const raw = token
      ? decryptParams<Partial<AttendanceEmployeeParams>>(token)
      : null
    const employeeId = Number(raw?.employeeId)
    if (!raw || !Number.isFinite(employeeId) || employeeId <= 0) return null
    return {
      employeeId,
      name: typeof raw.name === 'string' ? raw.name : '',
      code: typeof raw.code === 'string' ? raw.code : '',
      groupBy: raw.groupBy === 'designation' ? 'designation' : 'department',
      groupId: Number(raw.groupId) || 0,
      date: typeof raw.date === 'string' ? raw.date : '',
    } satisfies AttendanceEmployeeParams
  }, [token])

  /** `yyyy-MM` — opens on the month the day being reviewed falls in. */
  const [month, setMonth] = useState(() => monthOf(parsed?.date ?? ''))
  /** The day whose punches are open in the dialog. */
  const [openDay, setOpenDay] = useState<AttendanceDay | null>(null)

  /**
   * The person can be switched from this screen, so the one on show is a local
   * override of whoever the token arrived with — `null` meaning "still the one
   * that was opened". Name and code are held alongside the id for the same
   * reason the token carries them: the month endpoint answers a timesheet, not
   * an employee record, so the header has nothing else to print.
   *
   * A fresh token (a different row opened from the group) clears the override,
   * or the screen would keep answering for the person picked here.
   */
  const [picked, setPicked] = useState<{
    employeeId: number
    name: string
    code: string
  } | null>(null)
  const [rosterSearch, setRosterSearch] = useState('')
  useEffect(() => {
    setPicked(null)
    setRosterSearch('')
  }, [token])

  const employeeId = picked?.employeeId ?? parsed?.employeeId ?? 0

  const query = useAttendanceMonth(employeeId, month)

  /**
   * The group's roster, for the header's employee switcher.
   *
   * `status: 'all'` because switching to the next person is not a re-run of the
   * pill the group screen was left on, and the search is the endpoint's own
   * `term` rather than a filter over the loaded page — a group can hold more
   * people than the API's 100-row ceiling, so the ones matching what's typed
   * have to be fetched rather than looked for locally. Debounced for the same
   * reason `usePagination` debounces: not a request per keystroke.
   */
  const debouncedRosterSearch = useDebouncedValue(rosterSearch, 300)
  const roster = useAttendanceGroupEmployees(
    {
      limit: ATTENDANCE_MAX_LIMIT,
      offset: 0,
      ...(debouncedRosterSearch.trim()
        ? { search: debouncedRosterSearch.trim() }
        : {}),
    },
    {
      groupBy: parsed?.groupBy ?? 'department',
      // 0 is the "no group" sentinel the query hook refuses to fire on.
      groupId: parsed?.groupId ?? 0,
      date: parsed?.date || undefined,
      status: 'all',
    },
  )

  /** Show another person's month. The month on screen is kept — the usual read
      is the same period for the next person — and any open day is dismissed,
      since those punches belong to the person being left. */
  const changeEmployee = (id: number) => {
    const next = roster.data?.items.find((item) => item.employeeId === id)
    if (!next) return
    setPicked({
      employeeId: next.employeeId,
      name: next.fullName || next.name,
      code: next.code,
    })
    setOpenDay(null)
  }

  /* Memoised on the query's own array, not on a fresh `?? []` per render —
     otherwise the index below is rebuilt on every keystroke elsewhere. */
  const days = useMemo(() => query.data?.days ?? [], [query.data?.days])
  const dayByDate = useMemo(() => indexDaysByDate(days), [days])

  const stepMonth = (delta: number) =>
    setMonth(format(addMonths(parseISO(`${month}-01`), delta), 'yyyy-MM'))

  /** Back to the group the row was clicked in, on the same day it was read. */
  const goBack = () => {
    if (!parsed?.groupId) {
      void navigate({ to: '/hr/attendance' })
      return
    }
    void navigate({
      to: '/hr/attendance/detail',
      search: {
        data: encryptParams({
          id: parsed.groupId,
          groupBy: parsed.groupBy,
          date: parsed.date,
        }),
      },
    })
  }

  const isForbidden = isForbiddenError(query.error)

  return {
    /** `false` when the token was missing or unreadable. */
    hasEmployee: parsed !== null,
    employeeName: picked?.name ?? parsed?.name ?? '',
    employeeCode: picked?.code ?? parsed?.code ?? '',

    /** The header's employee switcher — the group's roster, and who's on show.
        Absent when the link carried no group to draw a roster from. */
    canSwitchEmployee: Boolean(parsed?.groupId),
    employeeOptions: roster.data?.items ?? [],
    employeesLoading: roster.isFetching,
    selectedEmployeeId: employeeId,
    changeEmployee,
    rosterSearch,
    setRosterSearch,

    month,
    setMonth,
    stepMonth,
    /** The day the server is in — caps how far forward the month picker goes. */
    today: query.data?.today ?? '',
    /** The weekly-off pattern in words, as the company configured it. */
    weeklyOff: query.data?.weeklyOff ?? '',

    days,
    /** A tile's day, by `yyyy-MM-dd`. */
    dayByDate,
    counts: query.data?.counts,

    openDay,
    setOpenDay,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError && !isForbidden,
    error: query.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(query.error) : undefined,

    goBack,
  }
}
