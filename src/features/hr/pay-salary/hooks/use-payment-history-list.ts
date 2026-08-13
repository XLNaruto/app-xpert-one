import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { useAuthStore } from '@/stores/auth-store'
import { decryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ALL_ROWS } from '@/lib/pagination'
import { departmentOptions, useDepartments } from '@/features/master/department'
import {
  fromIsoMonth,
  PAYMENT_HISTORY_MAX_LIMIT,
  PAYMENT_HISTORY_PAGE_SIZE,
  paySalaryMonthBounds,
  toIsoMonth,
} from '../constants'
import { usePaymentHistory } from '../api/use-payment-history'
import type { PaymentHistoryFilters } from '../schemas'

/** What the Pay Salary screen packs into the history route's `?data=` token. */
interface PaymentHistoryToken {
  month?: number
  year?: number
  departmentId?: number | null
}

/**
 * Salary Payment History — every Confirm & Pay of one period, newest first.
 *
 * The period and scope arrive from the Pay Salary screen in the encrypted
 * `?data=` token so the history opens on what was being paid, and are editable
 * here because the question this screen answers ("when did August actually go
 * out?") is usually asked about a month other than the one on the pay screen.
 *
 * Unlike the pay screen these filters read straight through: nothing is selected
 * here and nothing is written, so a filter change is a cheap re-read rather than
 * a decision that a staged batch would be filed under.
 *
 * The token is decrypted at the page's edge, never inside the query hook.
 */
export function usePaymentHistoryList(data?: string) {
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const token = useMemo(
    () => (data ? decryptParams<PaymentHistoryToken>(data) : null),
    [data],
  )

  const today = useMemo(() => new Date(), [])
  /* A missing or malformed token is simply "no scope was handed over" — the
     screen opens on the current month rather than refusing to render. */
  const [month, setMonth] = useState(() =>
    Number.isFinite(Number(token?.month)) && token?.month
      ? Number(token.month)
      : today.getMonth() + 1,
  )
  const [year, setYear] = useState(() =>
    Number.isFinite(Number(token?.year)) && token?.year
      ? Number(token.year)
      : today.getFullYear(),
  )
  const [departmentId, setDepartmentId] = useState<number | null>(
    () => token?.departmentId ?? null,
  )

  /* The history takes no `sort` — newest first is the endpoint's own order. */
  const {
    params,
    limit,
    offset,
    onPaginationChange: setPagination,
  } = usePagination(PAYMENT_HISTORY_PAGE_SIZE)

  /** "All" arrives as a negative limit; this endpoint caps `limit` at 100. */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPagination(
        next.limit < 0 ? { limit: PAYMENT_HISTORY_MAX_LIMIT, offset: 0 } : next,
      ),
    [setPagination],
  )

  const filters = useMemo<PaymentHistoryFilters>(
    () => ({ companyId: companyId ?? 0, month, year, departmentId }),
    [companyId, month, year, departmentId],
  )

  const history = usePaymentHistory(filters, params, { enabled: companyId !== null })

  const departments = useDepartments(ALL_ROWS)
  const departmentChoices = useMemo(
    () => departmentOptions(departments.data?.items ?? []),
    [departments.data],
  )
  const monthBounds = useMemo(() => paySalaryMonthBounds(today), [today])

  const monthValue = useMemo(() => toIsoMonth(month, year), [month, year])

  /** A filter change is a different result set, so it starts at its own page 1. */
  const resetTo = useCallback(
    (apply: () => void) => {
      apply()
      onPaginationChange({ limit, offset: 0 })
    },
    [limit, onPaginationChange],
  )

  const changePeriod = useCallback(
    (value: string) => {
      const parsed = fromIsoMonth(value)
      if (!parsed) return
      resetTo(() => {
        setMonth(parsed.month)
        setYear(parsed.year)
      })
    },
    [resetTo],
  )

  const changeDepartment = useCallback(
    (value: number | null) => resetTo(() => setDepartmentId(value)),
    [resetTo],
  )

  /** Which card is expanded — `null` when none is. Only one opens at a time. */
  const [openBatchId, setOpenBatchId] = useState<number | null>(null)

  const toggleBatch = useCallback(
    (id: number) => setOpenBatchId((prev) => (prev === id ? null : id)),
    [],
  )

  const isForbidden = isForbiddenError(history.error)

  return {
    companyId,

    batches: history.data?.items ?? [],
    period: history.data?.period ?? null,
    totals: history.data?.totals ?? null,
    total: history.data?.total ?? 0,

    isLoading: history.isLoading,
    isFetching: history.isFetching,
    isError: history.isError && !isForbidden,
    error: history.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(history.error) : undefined,

    month,
    year,
    monthValue,
    changePeriod,
    monthBounds,
    departmentId,
    changeDepartment,
    departmentChoices,
    departmentsLoading: departments.isLoading,

    limit,
    offset,
    onPaginationChange,

    openBatchId,
    toggleBatch,

    goBack: useCallback(() => navigate({ to: '/hr/pay-salary' }), [navigate]),
  }
}
