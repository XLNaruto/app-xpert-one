import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { useAuthStore } from '@/stores/auth-store'
import { encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ALL_ROWS } from '@/lib/pagination'
import { departmentOptions, useDepartments } from '@/features/master/department'
import { useDeleteSalaries } from '@/features/hr/salary'
import {
  fromIsoMonth,
  SALARY_VIEW_MAX_LIMIT,
  SALARY_VIEW_PAGE_SIZE,
  salaryViewMonthBounds,
  toIsoMonth,
  type SalaryViewMode,
} from '../constants'
import { useSalaryReport } from '../api/use-salary-report'
import type { SalaryViewFilters } from '../schemas'
import type { SalaryViewRow } from '../types'

/**
 * Everything the View Salary screen does: the paged report, its four filters,
 * the short/long toggle, the row selection and the discard flow. The pages
 * consume this and only render.
 *
 * The filters read straight through — no staging step like the register's
 * "Calculate Salary" button. This screen only looks at a month that has already
 * been processed, so changing one is a cheap re-read rather than a decision to
 * run a payroll.
 *
 * Selection is held as a set of **salary ids**, which is what `bulk-delete`
 * sends. Paid salaries are never selectable: the API refuses to discard one, so
 * offering it and then reporting it back as skipped would be a round trip to say
 * what the row already knows.
 */
export function useSalaryViewList() {
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  /* The report takes no `sort` — the order is the server's — so no default sort
     is passed and the columns aren't sortable. */
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange: setPagination,
  } = usePagination(SALARY_VIEW_PAGE_SIZE)

  /**
   * `<DataTable>`'s size selector always offers "All", which it reports back as
   * a negative limit. The report endpoint caps `limit` at 500 and has no way to
   * answer "everything", so "All" is taken as the largest page it will serve
   * rather than sent as a request it would refuse.
   */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPagination(
        next.limit < 0 ? { limit: SALARY_VIEW_MAX_LIMIT, offset: 0 } : next,
      ),
    [setPagination],
  )

  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => today.getMonth() + 1)
  const [year, setYear] = useState(() => today.getFullYear())
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [mode, setMode] = useState<SalaryViewMode>('short')

  /** Rows the discard will send — salary ids, never the employee's. */
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [discardOpen, setDiscardOpen] = useState(false)

  const filters = useMemo<SalaryViewFilters>(
    () => ({ companyId: companyId ?? 0, month, year, departmentId }),
    [companyId, month, year, departmentId],
  )

  const report = useSalaryReport(filters, params, { enabled: companyId !== null })

  const departments = useDepartments(ALL_ROWS)
  const departmentChoices = useMemo(
    () => departmentOptions(departments.data?.items ?? []),
    [departments.data],
  )
  const monthBounds = useMemo(() => salaryViewMonthBounds(today), [today])

  const discard = useDeleteSalaries()

  /* Memoised on the query's own array so the derivations below (and the grid's
     memoised columns) don't invalidate on every render of the page. */
  const rows = useMemo(() => report.data?.items ?? [], [report.data])

  /**
   * A filter change is a different result set, so it starts at its own first
   * page — and it drops the selection, which named rows that are no longer on
   * screen. Search does the same, but `usePagination` already resets the offset
   * for it; only the selection is this hook's to clear.
   */
  const resetTo = useCallback(
    (apply: () => void) => {
      apply()
      setSelected(new Set())
      onPaginationChange({ limit, offset: 0 })
    },
    [limit, onPaginationChange],
  )

  /**
   * The period as the `<MonthPicker>` holds it — one `yyyy-MM` field rather than
   * a month dropdown beside a year dropdown, because month and year are one
   * choice here: a payroll period, not two independent filters.
   *
   * A cleared field is ignored. There is no "every month" read — the report is
   * always for one period — so clearing leaves the last valid one on screen.
   */
  const monthValue = useMemo(() => toIsoMonth(month, year), [month, year])

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
  const changeSearch = useCallback(
    (value: string) => {
      setSearch(value)
      setSelected(new Set())
    },
    [setSearch],
  )

  /* ── Selection ── */

  /** Rows on this page a discard could actually take — a paid one is frozen. */
  const selectableIds = useMemo(
    () => rows.filter((row) => !row.isPaid).map((row) => row.salaryId),
    [rows],
  )

  const toggleRow = useCallback((salaryId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(salaryId)) next.add(salaryId)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allSelected =
        selectableIds.length > 0 && selectableIds.every((id) => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        for (const id of selectableIds) next.delete(id)
        return next
      }
      return new Set([...prev, ...selectableIds])
    })
  }, [selectableIds])

  const selectedCount = selected.size
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))

  /* ── Discard ── */

  /**
   * The row menu's Delete. It *replaces* the selection with this one row rather
   * than adding to it: the confirmation counts what will go, and a menu opened
   * on one row promising to discard four would be a trap.
   */
  const askDiscardRow = useCallback((row: SalaryViewRow) => {
    if (row.isPaid) return
    setSelected(new Set([row.salaryId]))
    setDiscardOpen(true)
  }, [])

  const confirmDiscard = useCallback(() => {
    const ids = [...selected]
    if (ids.length === 0) return
    discard.mutate(ids, {
      onSuccess: (result) => {
        setSelected(new Set())
        setDiscardOpen(false)
        const removed = result.deleted.length
        if (removed > 0) {
          toast.success(
            `${removed} ${removed === 1 ? 'salary' : 'salaries'} discarded — the month can be processed again.`,
          )
        }
        /* A partly-refused discard is still a success, so the refusals have to
           be reported here or they go unsaid. */
        if (result.skipped.length > 0) {
          toast.warning(
            `${result.skipped.length} kept — ${result.skipped[0].reason || 'already paid'}.`,
          )
        }
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't discard the salaries.")),
    })
  }, [discard, selected])

  /* ── Navigation ── */

  /**
   * The detail screen reads the salary back through its employee and period —
   * the report is the only endpoint that answers one — so all four travel in the
   * encrypted `?data=` token rather than an id in the path.
   */
  const goToDetail = useCallback(
    (row: SalaryViewRow) =>
      navigate({
        to: '/hr/salary-view/detail',
        search: {
          data: encryptParams({
            id: row.salaryId,
            employeeId: row.employeeId,
            month: row.month,
            year: row.year,
          }),
        },
      }),
    [navigate],
  )

  const isForbidden = isForbiddenError(report.error)

  return {
    companyId,
    mode,
    setMode,

    rows,
    period: report.data?.period ?? null,
    totals: report.data?.totals ?? null,
    allowanceHeads: report.data?.allowanceHeads ?? [],
    deductionHeads: report.data?.deductionHeads ?? [],
    total: report.data?.total ?? 0,

    isLoading: report.isLoading,
    isFetching: report.isFetching,
    isError: report.isError && !isForbidden,
    error: report.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(report.error) : undefined,

    month,
    year,
    /** The period as one `yyyy-MM` value, for the month picker. */
    monthValue,
    changePeriod,
    monthBounds,
    departmentId,
    changeDepartment,
    departmentChoices,
    departmentsLoading: departments.isLoading,
    search,
    setSearch: changeSearch,

    limit,
    offset,
    onPaginationChange,

    selected,
    selectedCount,
    allSelected,
    selectableCount: selectableIds.length,
    toggleRow,
    toggleAll,

    discardOpen,
    setDiscardOpen,
    askDiscardRow,
    confirmDiscard,
    isDiscarding: discard.isPending,

    goToDetail,
  }
}
