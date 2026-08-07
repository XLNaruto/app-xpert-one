import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parse } from 'date-fns'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { usePagination } from '@/hooks/use-pagination'
import { useDesignations } from '@/features/master/designation'
import { useSalaryRegister } from '../api/use-salary-register'
import { useDeleteSalaries, useSaveSalaries } from '../api/use-salary-mutations'
import { salaryColumnTotals } from '../lib/salary-calculations'
import { salaryHeadColumns, salaryRowToPayload, toSalaryRow } from '../lib/salary-mappers'
import { SALARY_PAGE_SIZE, salaryMonthBounds } from '../constants'
import {
  salaryFormSchema,
  type SalaryFormValues,
  type SalaryRegisterFilters,
  type SalaryStatus,
} from '../schemas'
import type { SalaryRegisterRow } from '../types'

/** The wire format the month picker speaks. */
const ISO_MONTH = 'yyyy-MM'

/** The month the screen opens on — the one in progress. */
function currentMonth(): string {
  return format(new Date(), ISO_MONTH)
}

/** `2026-08` → `{ month: 8, year: 2026 }`, which is what the API takes. */
function monthParts(value: string): { month: number; year: number } {
  const parsed = parse(value || currentMonth(), ISO_MONTH, new Date())
  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() }
}

/**
 * Owns Calculate Salary: which register is on screen, the three cells per row
 * that can be typed into, and the two writes.
 *
 * The shape of the screen follows the endpoints. `GET /salary/register` hands
 * over the attendance, the wage structure in force and `computed` — the pay that
 * *would* be saved — and `POST /salary/bulk-save` takes back only the days each
 * posting is paid for. So there is no pay to hold in form state and nothing to
 * recalculate here: the grid is a register with three editable columns, and the
 * server is the calculator.
 *
 * It's read **one designation at a time**. The grid's allowance and deduction
 * columns are the designation's own heads, so a company-wide read would head
 * columns with heads that don't belong to the row underneath them. That's why the
 * query waits on a designation rather than defaulting to all of them.
 *
 * On performance: this hook subscribes to `dirtyFields` and nothing else, so a
 * keystroke in a cell re-renders that cell's row and no other — the same
 * arrangement the bulk wage grid uses, and for the same reason.
 */
export function useSalaryForm() {
  /**
   * The register's company — the one the session has active. Read here rather
   * than in the api layer because the query key needs it too: a different tenant
   * is a different register, not a refetch of this one.
   */
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  /* ── What register is on screen ─────────────────────────────────────────── */

  const [month, setMonth] = useState(currentMonth)
  const [designationId, setDesignationId] = useState<number | null>(null)
  const [status, setStatus] = useState<SalaryStatus>('pending')

  const pagination = usePagination(SALARY_PAGE_SIZE)
  const { limit, offset, params, onPaginationChange } = pagination

  const filters = useMemo<SalaryRegisterFilters>(() => {
    const { month: monthNumber, year } = monthParts(month)
    return {
      companyId: companyId ?? 0,
      month: monthNumber,
      year,
      designationId,
      status,
    }
  }, [companyId, month, designationId, status])

  const ready = companyId !== null && designationId !== null
  const register = useSalaryRegister(filters, params, ready)

  /** Designation titles for the toolbar — the whole master, it's a dropdown. */
  const designations = useDesignations()

  /* A different register starts at its first page; so does a different tab. */
  const changeMonth = useCallback(
    (value: string) => {
      setMonth(value)
      onPaginationChange({ limit, offset: 0 })
    },
    [onPaginationChange, limit],
  )
  const changeDesignation = useCallback(
    (value: number | null) => {
      setDesignationId(value)
      onPaginationChange({ limit, offset: 0 })
    },
    [onPaginationChange, limit],
  )
  const changeStatus = useCallback(
    (value: SalaryStatus) => {
      setStatus(value)
      onPaginationChange({ limit, offset: 0 })
    },
    [onPaginationChange, limit],
  )

  /* ── The rows ──────────────────────────────────────────────────────────── */

  const { register: registerField, control, getValues, reset, trigger } =
    useForm<SalaryFormValues>({
      resolver: zodResolver(salaryFormSchema),
      defaultValues: { rows: [] },
    })

  /**
   * The rows the grid is laid out from, in the API's order.
   *
   * Kept beside the form rather than in it: what a row *is* — who, what they're
   * paid, what the month comes to — is the server's, and only the days are the
   * form's. Watching the form for the rest would subscribe the whole screen to
   * every keystroke, which on a grid this wide is the one thing that can't
   * happen. Set only where the form is, so a row's index into this list is its
   * index into `rows` too.
   */
  const [rows, setRows] = useState<SalaryRegisterRow[]>([])

  /**
   * Which register the form currently holds — company, period, designation, tab
   * and page, plus a token bumped on every write.
   *
   * A save invalidates the feature, so the query refetches straight after one;
   * without a token that refetch would look like the same register and the
   * server's answer would never be taken up. Without the key it would look like
   * a *different* one on every refetch and throw away everything typed since.
   */
  const [seedToken, setSeedToken] = useState(0)
  const registerKey = `${JSON.stringify(filters)}|${JSON.stringify(params)}|${seedToken}`
  const seededKey = useRef<string | null>(null)

  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!register.data || register.isPlaceholderData) return
    if (seededKey.current === registerKey) return
    seededKey.current = registerKey

    setRows(register.data.items)
    reset({ rows: register.data.items.map(toSalaryRow) })
    /* A different page of rows can't carry the last page's selection. */
    setSelected(new Set())
  }, [register.data, register.isPlaceholderData, registerKey, reset])

  /** Take the register as stored, discarding whatever has been typed. */
  const reload = useCallback(() => {
    if (!register.data) return
    setRows(register.data.items)
    reset({ rows: register.data.items.map(toSalaryRow) })
    setSelected(new Set())
    toast.info('Reloaded — unsaved changes discarded')
  }, [register.data, reset])

  /* ── Which rows have been typed into ───────────────────────────────────── */

  const { dirtyFields } = useFormState({ control })

  /**
   * Indexes of the rows edited since the register loaded. The grid marks them and
   * dims their money, because the figures on screen were computed by the server
   * for the days it had — not for the days now in the cell. Saving is what
   * settles the difference.
   *
   * Computed every render rather than memoised: react-hook-form *mutates*
   * `dirtyFields` in place, so a memo keyed on it would be pinned to the empty
   * set read straight after `reset()` and the screen would insist nothing had
   * changed. It's a walk over at most 200 rows on a hook that re-renders only
   * when dirtiness moves.
   */
  const dirtyRows = new Set<number>()
  ;(dirtyFields.rows ?? []).forEach((row, index) => {
    if (row && Object.values(row).some(Boolean)) dirtyRows.add(index)
  })

  /* ── Selection ─────────────────────────────────────────────────────────── */

  const toggleRow = useCallback((employeeServiceId: number) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(employeeServiceId)) next.delete(employeeServiceId)
      else next.add(employeeServiceId)
      return next
    })
  }, [])

  /**
   * A paid month is frozen — the API refuses both a re-save and a discard — so
   * it's never selectable and "select all" can't quietly include it.
   */
  const selectableRows = useMemo(() => rows.filter((row) => !row.isPaid), [rows])

  const toggleAll = useCallback(() => {
    setSelected((previous) =>
      previous.size === selectableRows.length
        ? new Set()
        : new Set(selectableRows.map((row) => row.employeeServiceId)),
    )
  }, [selectableRows])

  /* ── Saving ────────────────────────────────────────────────────────────── */

  const save = useSaveSalaries()
  const discard = useDeleteSalaries()

  /**
   * The rows a save would send.
   *
   * A selection is taken literally. With nothing selected it depends which side of
   * the register is open:
   *
   * - **To Process** — every row on the page. Running a month means running
   *   everyone on it, so that's the one-click case and picking rows out is the
   *   exception.
   * - **Processed** — only the rows typed into. These months have already been
   *   computed and stored; re-sending an untouched one would revise a salary
   *   nobody asked to change, and on this tab that's the likelier misclick.
   *
   * A paid row is excluded either way — the API refuses it, so including it would
   * come back as a batch of `skipped` and read as a failure.
   *
   * Not memoised: on the processed side it depends on `dirtyRows`, which
   * react-hook-form rebuilds in place every render, so a memo would be pinned to
   * the empty set read straight after `reset()`. It's a walk over at most 200 rows.
   */
  const saveTargets: number[] = []
  rows.forEach((row, index) => {
    if (row.isPaid) return
    if (selected.size > 0) {
      if (selected.has(row.employeeServiceId)) saveTargets.push(index)
      return
    }
    if (status === 'complete' && !dirtyRows.has(index)) return
    saveTargets.push(index)
  })

  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const runSave = useCallback(async () => {
    if (companyId === null) {
      toast.error('Select a company first')
      return
    }
    if (saveTargets.length === 0) {
      toast.info(
        status === 'complete'
          ? 'Nothing to revise — edit a row, or select the ones to process again'
          : 'Nothing to process — every row on this page is already paid',
      )
      return
    }

    /* Only the rows being sent are validated: an untouched row elsewhere on the
       page isn't what this click is about. */
    const paths = saveTargets.map((index) => `rows.${index}` as const)
    if (!(await trigger(paths))) {
      toast.error('Fix the highlighted days before processing')
      return
    }

    const values = getValues()
    const sending = saveTargets.map((index) => values.rows[index]).filter(Boolean)

    save.mutate(
      {
        company_id: companyId,
        month: filters.month,
        year: filters.year,
        salaries: sending.map(salaryRowToPayload),
      },
      {
        onSuccess: (result) => {
          /* The write moved rows between the two sides of the register, so the
             refetch behind this invalidation must re-seed the form. */
          setSeedToken((token) => token + 1)
          setSelected(new Set())

          if (result.saved.length > 0) {
            toast.success(
              result.saved.length === 1
                ? `Salary processed for ${sending[0]?.employeeName || '1 employee'}`
                : `Salary processed for ${result.saved.length} employees`,
            )
          }
          /* A partly-refused batch is still a success — say what didn't land
             rather than let the count quietly disagree with the grid. */
          if (result.skipped.length > 0) {
            toast.warning(
              `${result.skipped.length} ${
                result.skipped.length === 1 ? 'row was' : 'rows were'
              } skipped — ${result.skipped[0].reason}`,
            )
          }
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : 'Failed to process the salary',
          ),
      },
    )
  }, [
    companyId,
    status,
    saveTargets,
    trigger,
    getValues,
    save,
    filters.month,
    filters.year,
  ])

  const askSave = useCallback(() => setSaveConfirmOpen(true), [])
  const confirmSave = useCallback(() => {
    setSaveConfirmOpen(false)
    void runSave()
  }, [runSave])

  /* ── Discarding a processed month ──────────────────────────────────────── */

  /**
   * The processed salaries a discard would remove — the selected rows that
   * actually have a stored salary and haven't been paid. Re-processing a month is
   * only possible once its rows are discarded, which is what this is for.
   */
  const discardTargets = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.salaryId !== null && !row.isPaid && selected.has(row.employeeServiceId),
        )
        .map((row) => row.salaryId as number),
    [rows, selected],
  )

  const runDiscard = useCallback(() => {
    if (discardTargets.length === 0) {
      toast.info('Select the processed rows to discard first')
      return
    }

    discard.mutate(discardTargets, {
      onSuccess: (result) => {
        setSeedToken((token) => token + 1)
        setSelected(new Set())

        if (result.deleted.length > 0) {
          toast.success(
            result.deleted.length === 1
              ? 'Salary discarded — the month can be processed again'
              : `${result.deleted.length} salaries discarded — the month can be processed again`,
          )
        }
        if (result.skipped.length > 0) {
          toast.warning(
            `${result.skipped.length} ${
              result.skipped.length === 1 ? 'row was' : 'rows were'
            } kept — ${result.skipped[0].reason}`,
          )
        }
      },
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : 'Failed to discard the salaries',
        ),
    })
  }, [discard, discardTargets])

  const askDiscard = useCallback(() => setDiscardConfirmOpen(true), [])
  const confirmDiscard = useCallback(() => {
    setDiscardConfirmOpen(false)
    runDiscard()
  }, [runDiscard])

  /* ── What the screen renders from ──────────────────────────────────────── */

  /** The columns: this designation's allowance and deduction heads. */
  const heads = useMemo(() => salaryHeadColumns(rows), [rows])

  /** The footer's grand total, down the page as the server currently has it. */
  const totals = useMemo(() => salaryColumnTotals(rows), [rows])

  const designationOptions = useMemo(
    () =>
      (designations.data?.items ?? []).map((designation) => ({
        value: String(designation.id),
        label: designation.designationName,
      })),
    [designations.data],
  )

  const monthBounds = useMemo(() => salaryMonthBounds(), [])

  return {
    register: registerField,
    control,

    companyId,
    /* Filters. */
    month,
    changeMonth,
    monthBounds,
    designationId,
    changeDesignation,
    designationOptions,
    designationsLoading: designations.isLoading,
    status,
    changeStatus,
    search: pagination.search,
    setSearch: pagination.setSearch,

    /* The register. */
    rows,
    heads,
    totals,
    period: register.data?.period ?? null,
    companyTotals: register.data?.totals ?? null,
    total: register.data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,

    /** False until a designation is chosen — the register isn't read before it. */
    ready,
    isLoading: register.isLoading,
    isFetching: register.isFetching,
    isError: register.isError,
    error: register.error,
    reload,

    /* Editing. */
    dirtyRows,
    selected,
    toggleRow,
    toggleAll,
    selectableCount: selectableRows.length,

    /* Writing. */
    saveCount: saveTargets.length,
    saveConfirmOpen,
    setSaveConfirmOpen,
    askSave,
    confirmSave,
    isSaving: save.isPending,

    discardCount: discardTargets.length,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    askDiscard,
    confirmDiscard,
    isDiscarding: discard.isPending,
  }
}
