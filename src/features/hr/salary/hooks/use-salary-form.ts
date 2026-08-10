import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parse } from 'date-fns'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { usePagination } from '@/hooks/use-pagination'
import { useDesignations, useWageHeads } from '@/features/master/designation'
import { useSalaryRegister } from '../api/use-salary-register'
import {
  useDeleteSalaries,
  useDownloadSalaryTemplate,
  useImportSalaries,
  useSaveSalaries,
} from '../api/use-salary-mutations'
import {
  liveRow,
  rowFigures,
  STATUTORY_ALIASES,
  type StatutoryComponentIds,
} from '../lib/salary-calculations'
import {
  salaryHeadColumnsFromRegister,
  salaryHeadConfigsFromRegister,
  salaryRowToPayload,
  toSalaryRow,
  type SalaryHeadColumn,
} from '../lib/salary-mappers'
import {
  EMPTY_SALARY_RATES,
  SALARY_PAGE_SIZE,
  salaryMonthBounds,
} from '../constants'
import {
  salaryFormSchema,
  type SalaryFormValues,
  type SalaryRegisterFilters,
  type SalaryStatus,
} from '../schemas'
import type { SalaryImportResult, SalaryRates, SalaryRegisterRow } from '../types'

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
 * Whether react-hook-form's dirty map says anything under here has been touched.
 *
 * It has to walk, not glance at the top level. `dirtyFields` mirrors the shape of
 * the values, so a row's `allowances` is an *array* — always truthy, whether or
 * not a single head in it has been typed into. Testing the row's own keys for
 * truthiness would therefore call every row on the page edited the moment the
 * head cells existed, and every row would be recomputed and re-saved.
 */
function isDirty(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(isDirty)
  if (node && typeof node === 'object') return Object.values(node).some(isDirty)
  return node === true
}

/**
 * A page of register rows as the form holds them.
 *
 * Every row is seeded against the *columns* rather than against its own heads, so
 * cell *n* of each row is the same head all the way down the page — which is what
 * lets the grid address a head cell by its column index instead of searching the
 * row for it on every render. A row that doesn't carry one of the columns opens
 * it at zero.
 */
function seedRows(
  items: SalaryRegisterRow[],
  heads: { allowances: SalaryHeadColumn[]; deductions: SalaryHeadColumn[] },
) {
  return items.map((item) => toSalaryRow(item, heads))
}

/**
 * Owns Calculate Salary: which register is on screen, the three cells per row
 * that can be typed into, and the two writes.
 *
 * The shape of the screen follows the endpoints. `GET /salary/register` hands over
 * the attendance, the wage structure in force and `computed` — the pay that
 * *would* be saved — and `POST /salary/bulk-save` takes back the full snapshot
 * each row is priced at, storing every figure as sent. So the pay *is* in form
 * state: present days and overtime hours are typed, each allowance and deduction
 * head is carried as its own cell, and `salary-calculations` joins them up.
 *
 * A head's amount is on the register and so is the rule behind it: each row
 * carries the `salary_components` of the structure it was priced on, which is
 * what decides whether the head moves with the days. Nothing is fetched to find
 * that out, and a back-dated month is read through its own configuration rather
 * than through the one in force today.
 *
 * It's read **one designation at a time**, because the wage structure that says
 * how each head is configured is a designation's. The columns are the company's
 * whole allowance / deduction master — plus anything the register names that the
 * master doesn't — so they don't move when the designation does.
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

  /**
   * The two filters that pick a register are **staged**, not live.
   *
   * `draftMonth` / `draftDesignationId` are what the pickers hold; `month` /
   * `designationId` are what the register on screen was actually read for, and
   * only Calculate Salary moves one to the other.
   *
   * Reading on change was wrong here in a way the other list screens aren't.
   * Picking a designation is a *decision to run a payroll*, not a filter over
   * something already on screen: it re-seeds every row of the form, so a
   * mis-click while rows had days typed into them threw that work away, and
   * scrolling a combobox with the keyboard fired a register read per title
   * passed. Staging them makes the read a thing someone asks for.
   *
   * The status tab, the search box and the pager stay live. Those are all reads
   * *of the register already chosen* — a different page or side of the same
   * question — and nothing typed is lost by answering them straight away.
   */
  const [month, setMonth] = useState(currentMonth)
  const [designationId, setDesignationId] = useState<number | null>(null)
  const [draftMonth, setDraftMonth] = useState(currentMonth)
  const [draftDesignationId, setDraftDesignationId] = useState<number | null>(null)
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

  /* ── How the designation's heads are configured ────────────────────────── */

  /**
   * A head's amount is on the register; the rule behind it — 10% of pay, or a
   * flat ₹2,600 — is what a typed present-days figure has to be re-read through,
   * and that comes from the row's own `salary_components`.
   *
   * The register carries those itself, off the very structure each row was priced
   * on, so nothing extra is fetched and a back-dated month is read through the
   * configuration it was actually run on rather than through today's.
   */
  const headConfigs = useMemo(
    () => salaryHeadConfigsFromRegister(register.data?.items ?? []),
    [register.data],
  )

  /** The same components as *columns* — which head, on which side, in what order. */
  const registerHeads = useMemo(
    () => salaryHeadColumnsFromRegister(register.data?.items ?? []),
    [register.data],
  )

  /**
   * The pay-component ids PF / ESIC / PT / LWF are known by in the company's
   * catalog. A save sends them as deduction lines — that's how the API routes
   * them onto the salary row's own columns — so without an id for one, it can be
   * neither sent nor counted, and `rowFigures` leaves it out of both.
   */
  const {
    heads: catalog,
    isReady: catalogReady,
    isLoading: catalogLoading,
  } = useWageHeads()

  /**
   * The grid's allowance and deduction columns: **every head the company has**,
   * from the allowance / deduction master, in the master's own order.
   *
   * Taken from the master rather than only from the heads on screen, so the
   * register reads like the bulk wage grid — the same columns in the same places
   * whichever designation, month or tab is open. A head this designation doesn't
   * pay simply sits at zero, which is a column worth having: it is where an
   * amount gets typed when this month is the exception.
   *
   * Anything the register's own `salary_components` names and the master doesn't
   * is appended rather than dropped. A head the row is actually priced on has to
   * have a column — it carries an amount, and a save sends it — so the master
   * decides the order and the register decides the floor.
   */
  const heads = useMemo(() => {
    const fromCatalog = (side: typeof catalog.allowances) =>
      side.map((head) => ({
        payComponentId: head.id,
        code: head.code,
        name: head.name,
      }))

    const merge = (columns: SalaryHeadColumn[], extra: SalaryHeadColumn[]) => {
      const known = new Set(columns.map((column) => column.payComponentId))
      return [...columns, ...extra.filter((column) => !known.has(column.payComponentId))]
    }

    return {
      allowances: merge(fromCatalog(catalog.allowances), registerHeads.allowances),
      deductions: merge(fromCatalog(catalog.deductions), registerHeads.deductions),
    }
  }, [catalog, registerHeads])

  /**
   * The PF / ESIC / PT / LWF masters in force for the period, off the register.
   *
   * The screen prices the statutory deductions from these — see
   * `salary-statutory` — so they have to reach `rowFigures` for every row. An
   * empty set while the register is still loading is the right neutral: no rate
   * in force means the act deducts nothing, which is also what a half-loaded
   * screen should show rather than a figure it is about to change.
   */
  const rates = useMemo<SalaryRates>(
    () => register.data?.rates ?? EMPTY_SALARY_RATES,
    [register.data],
  )

  const statutoryIds = useMemo<StatutoryComponentIds>(() => {
    const ids: StatutoryComponentIds = new Map()
    Object.entries(STATUTORY_ALIASES).forEach(([code, aliases]) => {
      const match = catalog.deductions.find((head) =>
        aliases.includes(head.code.trim().toUpperCase()),
      )
      if (match) ids.set(code, match.id)
    })
    return ids
  }, [catalog])

  /* The pickers only stage — nothing is read until Calculate Salary is pressed. */
  const changeMonth = useCallback((value: string) => setDraftMonth(value), [])
  const changeDesignation = useCallback(
    (value: number | null) => setDraftDesignationId(value),
    [],
  )

  /** Whether the pickers are showing something the register hasn't been read for. */
  const hasPendingFilters =
    draftDesignationId !== designationId || draftMonth !== month

  /**
   * Run the register for what the pickers currently hold.
   *
   * This is the only thing that moves the draft across, and it starts the result
   * at page one — a different register can't inherit the last one's offset, and
   * landing on "page 3 of 1" would read as an empty month.
   */
  const calculate = useCallback(() => {
    if (draftDesignationId === null) {
      toast.error('Select a designation to calculate salary for')
      return
    }
    setDesignationId(draftDesignationId)
    setMonth(draftMonth)
    onPaginationChange({ limit, offset: 0 })
  }, [draftDesignationId, draftMonth, onPaginationChange, limit])

  const changeStatus = useCallback(
    (value: SalaryStatus) => {
      setStatus(value)
      onPaginationChange({ limit, offset: 0 })
    },
    [onPaginationChange, limit],
  )

  /* ── The rows ──────────────────────────────────────────────────────────── */

  const { register: registerField, control, getValues, setValue, reset, trigger } =
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

  /**
   * What a freshly loaded page starts out selected.
   *
   * On **To Process**, running a month means running everyone on it, so the page
   * arrives with every runnable row ticked — the checkboxes now say so rather
   * than leaving "all of them" implied by an empty selection.
   *
   * On **Processed** nothing is ticked: those months are already computed and
   * stored, and re-sending an untouched one would revise a salary nobody asked
   * to change. There the save still falls back to the rows typed into.
   *
   * A paid row is never included — the API refuses both a re-save and a discard.
   */
  const defaultSelection = useCallback(
    (items: SalaryRegisterRow[]) =>
      status === 'complete'
        ? new Set<number>()
        : new Set(items.filter((row) => !row.isPaid).map((row) => row.employeeServiceId)),
    [status],
  )

  useEffect(() => {
    const data = register.data
    if (!data || register.isPlaceholderData) return
    /* The head cells are seeded against the master's columns, so there is nothing
       to seed until the master is in. The effect runs again when it arrives. */
    if (!catalogReady) return

    if (seededKey.current === registerKey) return
    seededKey.current = registerKey

    setRows(data.items)
    reset({ rows: seedRows(data.items, heads) })
    /* A different page of rows can't carry the last page's selection. */
    setSelected(defaultSelection(data.items))
  }, [
    register.data,
    register.isPlaceholderData,
    catalogReady,
    heads,
    registerKey,
    reset,
    defaultSelection,
  ])

  /** Take the register as stored, discarding whatever has been typed. */
  const reload = useCallback(() => {
    if (!register.data) return
    setRows(register.data.items)
    reset({ rows: seedRows(register.data.items, heads) })
    setSelected(defaultSelection(register.data.items))
    toast.info('Reloaded — unsaved changes discarded')
  }, [register.data, heads, reset, defaultSelection])

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
    if (isDirty(row)) dirtyRows.add(index)
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
    const sending = saveTargets.filter((index) => values.rows[index] && rows[index])

    /*
     * Each row goes out as the full snapshot it is priced at on screen — the
     * figures, the per-head breakdown and the settings behind them — because the
     * API stores every figure as sent and checks that the totals agree with the
     * parts. An untouched row is sent at exactly what the register answered; an
     * edited one at what its cells now come to.
     */
    const salaries = sending.map((index) =>
      salaryRowToPayload(
        rows[index],
        rowFigures(
          rows[index],
          values.rows[index],
          headConfigs,
          statutoryIds,
          liveRow(rows[index], dirtyRows.has(index)),
          rates,
          filters.month,
        ),
      ),
    )

    save.mutate(
      {
        company_id: companyId,
        month: filters.month,
        year: filters.year,
        salaries,
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
                ? `Salary processed for ${
                    rows[sending[0]]?.employeeName || '1 employee'
                  }`
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
    rows,
    saveTargets,
    dirtyRows,
    headConfigs,
    statutoryIds,
    rates,
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

  /* ── Importing a month from a sheet ────────────────────────────────────── */

  /**
   * The sheet import: pick a file, and read back what it did.
   *
   * The register on screen decides the month sent, but only as a fallback — the
   * period written in the sheet wins server-side, and `result.period` is the one
   * that actually ran. Nothing here is overwritten: a posting already processed
   * for the period comes back in `skipped`, which is why the report is shown
   * rather than reduced to a toast.
   */
  const importSheet = useImportSalaries()
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<SalaryImportResult | null>(null)

  const runImport = useCallback(
    (file: File) => {
      if (companyId === null) {
        toast.error('Pick a company before importing a salary sheet')
        return
      }

      importSheet.mutate(
        { file, companyId, month: filters.month, year: filters.year },
        {
          onSuccess: (result) => {
            setImportOpen(false)
            setImportResult(result)
            /* Whatever landed is on the register now — reseed from the server
               rather than leave the page showing the month as it was. */
            setSeedToken((token) => token + 1)

            if (result.saved.length > 0) {
              toast.success(
                result.saved.length === 1
                  ? '1 salary imported'
                  : `${result.saved.length} salaries imported`,
              )
            }
          },
          onError: (error) =>
            toast.error(
              error instanceof Error ? error.message : 'Failed to import the salary sheet',
            ),
        },
      )
    },
    [importSheet, companyId, filters.month, filters.year],
  )

  const clearImportResult = useCallback(() => setImportResult(null), [])

  /**
   * The other half of that dialog: the sheet to fill in.
   *
   * Sent for the register the screen was *run* for — the same company, month and
   * designation the grid is showing — so the file that comes down is the page,
   * not whatever the pickers have been left on since.
   */
  const template = useDownloadSalaryTemplate()

  const downloadTemplate = useCallback(() => {
    if (companyId === null) {
      toast.error('Pick a company before downloading the salary sheet')
      return
    }

    template.mutate(
      { companyId, month: filters.month, year: filters.year, designationId },
      {
        onSuccess: () => toast.success('Salary import sheet downloaded'),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : 'Failed to download the sheet',
          ),
      },
    )
  }, [template, companyId, filters.month, filters.year, designationId])

  /* ── What the screen renders from ──────────────────────────────────────── */

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
    setValue,

    companyId,
    /* Filters. The pickers read the draft; everything else reads what the
       register was actually run for. */
    month,
    draftMonth,
    changeMonth,
    monthBounds,
    designationId,
    draftDesignationId,
    changeDesignation,
    /** Run the register for what the pickers hold — the Calculate Salary click. */
    calculate,
    /** The pickers hold something the register on screen wasn't read for. */
    hasPendingFilters,
    designationOptions,
    designationsLoading: designations.isLoading,
    status,
    changeStatus,
    search: pagination.search,
    setSearch: pagination.setSearch,

    /* The register. */
    rows,
    heads,
    /** How the designation configures each head — percentage, or a flat amount. */
    headConfigs,
    statutoryIds,
    /** The rate masters PF / ESIC / PT / LWF are priced from for this period. */
    rates,
    /** 1–12 — which month's PT and LWF collection rules apply. */
    periodMonth: filters.month,
    period: register.data?.period ?? null,
    companyTotals: register.data?.totals ?? null,
    total: register.data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,

    /** False until a designation is chosen — the register isn't read before it. */
    ready,
    /* The master is part of the load: it is what the grid's columns are, so a
       register drawn before it arrives would open with none of them. */
    isLoading: register.isLoading || catalogLoading,
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

    /* Importing a month from a sheet. */
    importOpen,
    setImportOpen,
    runImport,
    isImporting: importSheet.isPending,
    /** The last import's report — what the result dialog is showing. */
    importResult,
    clearImportResult,
    /** Download the sheet to fill in for the register on screen. */
    downloadTemplate,
    isDownloadingTemplate: template.isPending,

    discardCount: discardTargets.length,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    askDiscard,
    confirmDiscard,
    isDiscarding: discard.isPending,
  }
}
