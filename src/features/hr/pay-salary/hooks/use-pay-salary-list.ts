import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { useAuthStore } from '@/stores/auth-store'
import { encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ALL_ROWS } from '@/lib/pagination'
import { departmentOptions, useDepartments } from '@/features/master/department'
import {
  fromIsoMonth,
  PAY_SALARY_MAX_LIMIT,
  PAY_SALARY_PAGE_SIZE,
  paySalaryMonthBounds,
  toIsoMonth,
  type PaySalaryStatus,
} from '../constants'
import { useSalaryPayments } from '../api/use-salary-payments'
import type { PaySalaryFilters } from '../schemas'
import type { PaySalaryRow } from '../types'

/** The period and scope a read is made for — what the pickers stage toward. */
interface PayScope {
  month: number
  year: number
  departmentId: number | null
}

/**
 * Everything the Pay Salary screen does: the paged list, its staged filters, the
 * unpaid/paid tabs, the selection a batch is built from and the two dialogs.
 * The page consumes this and only renders.
 *
 * **The pickers stage; Load reads.** Unlike View Salary, where a filter change
 * is a cheap re-read, changing the period or department here changes *what a
 * batch would be filed under* — the API checks every salary against the
 * `department_id` the batch carries. Letting the filter move under a selection
 * that was made against the previous one is how you get a batch that is refused
 * row by row, so the two are kept in step behind one button.
 *
 * The selection is a **map of salary id → row**, not a set of ids. It spans
 * pages (the endpoint serves up to 500 at a time, so ticking a whole department
 * is normal) and the Confirm & Pay dialog lists the people it is about to pay —
 * including the ones now scrolled off screen, which a bare set of ids couldn't
 * name.
 */
export function usePaySalaryList() {
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  /* No `sort`: the endpoint fixes the order, so no default sort is passed and
     the columns aren't sortable. */
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange: setPagination,
  } = usePagination(PAY_SALARY_PAGE_SIZE)

  /**
   * `<DataTable>`'s size selector always offers "All", reported back as a
   * negative limit. This endpoint caps `limit` at 500 and can't answer
   * "everything", so All is taken as the largest page it will serve rather than
   * sent as a request it would refuse.
   */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPagination(next.limit < 0 ? { limit: PAY_SALARY_MAX_LIMIT, offset: 0 } : next),
    [setPagination],
  )

  const today = useMemo(() => new Date(), [])
  const openingScope = useMemo<PayScope>(
    () => ({
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      departmentId: null,
    }),
    [today],
  )

  /** What the pickers hold. */
  const [draft, setDraft] = useState<PayScope>(openingScope)
  /** What the list on screen was actually read for. */
  const [scope, setScope] = useState<PayScope>(openingScope)

  const [status, setStatus] = useState<PaySalaryStatus>('unpaid')
  const [selected, setSelected] = useState<Map<number, PaySalaryRow>>(new Map())
  const [payOpen, setPayOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const filters = useMemo<PaySalaryFilters>(
    () => ({ companyId: companyId ?? 0, ...scope, status }),
    [companyId, scope, status],
  )

  const list = useSalaryPayments(filters, params, { enabled: companyId !== null })

  const departments = useDepartments(ALL_ROWS)
  const departmentChoices = useMemo(
    () => departmentOptions(departments.data?.items ?? []),
    [departments.data],
  )
  const monthBounds = useMemo(() => paySalaryMonthBounds(today), [today])

  /* Memoised on the query's own array so the page's columns don't re-derive on
     every render. */
  const rows = useMemo(() => list.data?.items ?? [], [list.data])

  /** The pickers hold something the list on screen wasn't read for. */
  const hasPendingScope =
    draft.month !== scope.month ||
    draft.year !== scope.year ||
    draft.departmentId !== scope.departmentId

  /** Start over on a different result set: page 1, nothing ticked. */
  const resetView = useCallback(() => {
    setSelected(new Map())
    onPaginationChange({ limit, offset: 0 })
  }, [limit, onPaginationChange])

  /* ── Filters ── */

  /**
   * The period as the `<MonthPicker>` holds it — one `yyyy-MM` field, because
   * month and year are one choice here: a payroll period, not two independent
   * filters. A cleared field is ignored; there is no "every month" read.
   */
  const monthValue = useMemo(() => toIsoMonth(draft.month, draft.year), [draft])

  const changePeriod = useCallback((value: string) => {
    const parsed = fromIsoMonth(value)
    if (!parsed) return
    setDraft((prev) => ({ ...prev, ...parsed }))
  }, [])

  const changeDepartment = useCallback((value: number | null) => {
    setDraft((prev) => ({ ...prev, departmentId: value }))
  }, [])

  /** Read the list for what the pickers hold. */
  const loadList = useCallback(() => {
    setScope(draft)
    resetView()
  }, [draft, resetView])

  /** Both tabs are different reads, so switching one drops the selection. */
  const changeStatus = useCallback(
    (value: PaySalaryStatus) => {
      setStatus(value)
      resetView()
    },
    [resetView],
  )

  const changeSearch = useCallback(
    (value: string) => {
      setSearch(value)
      /* `usePagination` resets the offset for a new term; only the selection is
         this hook's to clear — it named rows that may no longer match. */
      setSelected(new Map())
    },
    [setSearch],
  )

  /* ── Selection ── */

  /**
   * Rows on this page a batch could settle. Only the unpaid tab has any: a paid
   * salary is already settled, and the endpoint refuses it.
   */
  const selectableRows = useMemo(
    () => (status === 'unpaid' ? rows.filter((row) => !row.isPaid) : []),
    [rows, status],
  )

  const toggleRow = useCallback((row: PaySalaryRow) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (!next.delete(row.salaryId)) next.set(row.salaryId, row)
      return next
    })
  }, [])

  /** Ticks or clears **this page**, leaving any off-page selection alone. */
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const pageSelected =
        selectableRows.length > 0 && selectableRows.every((row) => prev.has(row.salaryId))
      const next = new Map(prev)
      for (const row of selectableRows) {
        if (pageSelected) next.delete(row.salaryId)
        else next.set(row.salaryId, row)
      }
      return next
    })
  }, [selectableRows])

  const clearSelection = useCallback(() => setSelected(new Map()), [])

  const selectedRows = useMemo(() => [...selected.values()], [selected])
  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.netPay, 0),
    [selectedRows],
  )
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selected.has(row.salaryId))

  /* ── Paying ── */

  /** The row menu's Pay: this row alone, so the dialog's total is what it says. */
  const askPayRow = useCallback((row: PaySalaryRow) => {
    if (row.isPaid) return
    setSelected(new Map([[row.salaryId, row]]))
    setPayOpen(true)
  }, [])

  /**
   * A recorded batch clears the selection: the rows it settled have left this
   * tab, and the ones it refused are named in the toast rather than left ticked
   * for a retry that would be refused the same way.
   */
  const onPaid = useCallback(() => {
    setSelected(new Map())
    setPayOpen(false)
  }, [])

  /* ── Navigation ── */

  /**
   * The history screen reads the same period and scope, so all three travel in
   * the encrypted `?data=` token — arriving there from a department-filtered
   * list shows that department's batches rather than the whole company's.
   */
  const goToHistory = useCallback(
    () =>
      navigate({
        to: '/hr/pay-salary/history',
        search: {
          data: encryptParams({
            month: scope.month,
            year: scope.year,
            departmentId: scope.departmentId,
          }),
        },
      }),
    [navigate, scope],
  )

  const isForbidden = isForbiddenError(list.error)

  /** Say once, in the toast, that nothing is selected — never silently no-op. */
  const openPayDialog = useCallback(() => {
    if (selected.size === 0) {
      toast.info('Tick the employees to pay first.')
      return
    }
    setPayOpen(true)
  }, [selected.size])

  return {
    companyId,

    rows,
    period: list.data?.period ?? null,
    totals: list.data?.totals ?? null,
    total: list.data?.total ?? 0,

    isLoading: list.isLoading,
    isFetching: list.isFetching,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    /** The period the *list* was read for — what a batch would be filed under. */
    scope,
    /** The period as one `yyyy-MM` value, for the month picker. */
    monthValue,
    departmentId: draft.departmentId,
    changePeriod,
    changeDepartment,
    monthBounds,
    departmentChoices,
    departmentsLoading: departments.isLoading,
    departmentName:
      departmentChoices.find((option) => option.value === String(scope.departmentId))
        ?.label ?? null,
    hasPendingScope,
    loadList,

    status,
    changeStatus,
    search,
    setSearch: changeSearch,

    limit,
    offset,
    onPaginationChange,

    selected,
    selectedRows,
    selectedCount: selected.size,
    selectedTotal,
    allSelected,
    selectableCount: selectableRows.length,
    toggleRow,
    toggleAll,
    clearSelection,

    payOpen,
    setPayOpen,
    openPayDialog,
    askPayRow,
    onPaid,

    exportOpen,
    setExportOpen,

    goToHistory,
  }
}
