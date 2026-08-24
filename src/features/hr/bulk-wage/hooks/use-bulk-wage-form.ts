import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFormState, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  effectiveMonthBounds,
  missingWageField,
  useWageHeads,
} from '@/features/master/designation'
import { useBulkWageGrid } from '../api/use-bulk-wage-grid'
import { useSaveBulkWage } from '../api/use-bulk-wage-mutations'
import { bulkRowToPayload, toBulkWageRow } from '../lib/bulk-wage-mappers'
import { bulkWageFormSchema, type BulkWageFormValues, type BulkWageRow } from '../schemas'
import type { BulkWageDesignation } from '../types'

/** The month the screen opens on — this one, as `yyyy-MM`. */
function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/**
 * Owns the bulk wage screen: which company's grid is on it, the month every row
 * takes effect from, the rows themselves and the two ways they're saved.
 *
 * The shape of the screen follows the endpoint. `POST .../bulk-update` takes one
 * `effective_from` and a list of rows and applies them in a single transaction,
 * so the month is the screen's rather than a row's and the grid is saved whole —
 * one Save All, no per-row action column.
 *
 * Only *changed* rows are ever sent. Every designation of the company is on the
 * grid, configured or not, so sending them all would stamp a new version onto
 * designations nobody touched — history noise that reads as a pay revision.
 * Dirtiness is react-hook-form's, measured against the values the grid loaded
 * with, so a cell typed and typed back is not a change.
 *
 * On performance: this hook subscribes to `dirtyFields` and nothing else. That
 * fires on the *first* keystroke into a cell and when one returns to its stored
 * value — not on every character — and the grid's rows are memoised on props
 * that don't change, so what re-renders is the grid's frame, never its cells.
 */
export function useBulkWageForm() {
  /**
   * The grid's company — the one the session has active, read and written. The
   * endpoint takes the tenant explicitly on both calls, but there's nothing for
   * the screen to choose: you bulk-update the payroll of the company you're
   * working in, and switching company is the switcher's job, not this screen's.
   *
   * Read here rather than through `activeCompanyId()` in the api layer because
   * the query key needs it too — a different tenant is a different grid, not a
   * refetch of this one.
   */
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const grid = useBulkWageGrid(companyId)
  const save = useSaveBulkWage()
  const { heads, isLoading: headsLoading } = useWageHeads()

  const { register, control, getValues, setValue, setError, clearErrors, reset } =
    useForm<BulkWageFormValues>({
      resolver: zodResolver(bulkWageFormSchema),
      defaultValues: { effectiveFrom: currentMonth(), rows: [] },
    })

  /* ── Seeding ──────────────────────────────────────────────────────────── */

  /**
   * The designations the grid is laid out from — its rows, in the API's order.
   *
   * Kept beside the form rather than read out of it: what a row *is* (which
   * designation, what it's paid today) is the server's, and only what it's being
   * changed to is the form's. Watching the form for this would subscribe the
   * whole screen to every keystroke, which on a forty-column grid is the one
   * thing that can't happen. Set only where the form is, so a row's index into
   * this list is its index into `rows` too.
   */
  const [designations, setDesignations] = useState<BulkWageDesignation[]>([])

  /**
   * The company whose grid the form currently holds. A save invalidates the
   * designation feature, so this query refetches straight after one — without
   * this guard that refetch would re-seed the form and throw away anything typed
   * since. Seeding happens when the *company* changes and at no other time; the
   * save commits the server's answer itself, below.
   */
  const seededFor = useRef<number | null>(null)

  const seed = useCallback(
    (stored: BulkWageDesignation[], effectiveFrom: string) => {
      setDesignations(stored)
      reset({ effectiveFrom, rows: stored.map((row) => toBulkWageRow(row, heads)) })
    },
    [reset, heads],
  )

  useEffect(() => {
    if (companyId === null || !grid.data) return
    if (seededFor.current === companyId) return
    seededFor.current = companyId
    seed(grid.data, getValues('effectiveFrom') || currentMonth())
  }, [companyId, grid.data, seed, getValues])

  /** Discard every edit and take the grid as stored. */
  const reload = useCallback(() => {
    if (!grid.data) return
    seed(grid.data, getValues('effectiveFrom') || currentMonth())
    toast.info('Reloaded — unsaved changes discarded')
  }, [grid.data, seed, getValues])

  /* ── Cells that clear a sibling ───────────────────────────────────────── */

  /**
   * Switching the salary type clears the wage the other mode owns, so a row
   * never carries both a monthly basic and a hand-entered daily wage —
   * whichever is on screen is the one that counts.
   */
  const changeSalaryType = useCallback(
    (index: number, value: 'Daily' | 'Monthly') => {
      setValue(`rows.${index}.salaryType`, value, { shouldDirty: true })
      setValue(`rows.${index}.${value === 'Daily' ? 'basicPay' : 'wagePerDay'}`, '', {
        shouldDirty: true,
      })
    },
    [setValue],
  )

  /**
   * The two working-day answers are alternatives, each owned by one calc type —
   * switching drops the one that just went off screen.
   */
  const changeWorkingDayCalculationType = useCallback(
    (index: number, value: string) => {
      setValue(
        `rows.${index}.workingDayCalculationType`,
        value as BulkWageRow['workingDayCalculationType'],
        { shouldDirty: true },
      )
      if (value !== 'Fixed') {
        setValue(`rows.${index}.workingDays`, '', { shouldDirty: true })
      }
    },
    [setValue],
  )

  /* ── Which rows have changed ──────────────────────────────────────────── */

  const { dirtyFields } = useFormState({ control })

  /**
   * Indexes of the rows edited since the grid loaded — what both buttons send,
   * and what the grid marks. A row's entry is a tree of per-field flags, so
   * "changed" is any `true` anywhere under it.
   *
   * Computed every render rather than memoised on `dirtyFields`: react-hook-form
   * *mutates* that object in place, so its reference is the same one from render
   * to render and a memo keyed on it would be pinned forever to the empty set it
   * read straight after `reset()` — the whole screen would then insist nothing
   * had changed. It's a walk over at most a couple of hundred rows on a hook
   * that only re-renders when dirtiness actually moves, so it costs nothing.
   */
  const dirtyRowsRef = useRef<Set<number>>(new Set())
  dirtyRowsRef.current.clear()
  ;(dirtyFields.rows ?? []).forEach((row, index) => {
    if (hasChange(row)) dirtyRowsRef.current.add(index)
  })

  /* ── Saving ───────────────────────────────────────────────────────────── */

  /**
   * Take the grid the save returned as the new baseline, while keeping the edits
   * the user has *not* saved yet.
   *
   * The response is the whole grid, so a plain reset would revert every other
   * row someone had half-filled in — a real risk on this screen, where saving
   * one row while three more are part-typed is the normal way to work. So the
   * stored answer becomes the baseline for every row, and the still-unsaved ones
   * are then written back over it and stay marked as changed.
   */
  const commit = useCallback(
    (stored: BulkWageDesignation[], savedIds: Set<number>) => {
      const previous = getValues()
      const keep = new Map<number, BulkWageRow>()
      previous.rows.forEach((row, index) => {
        if (dirtyRowsRef.current.has(index) && !savedIds.has(row.designationId)) {
          keep.set(row.designationId, row)
        }
      })

      const rows = stored.map((designation) => toBulkWageRow(designation, heads))
      setDesignations(stored)
      reset({ effectiveFrom: previous.effectiveFrom, rows })

      rows.forEach((row, index) => {
        const unsaved = keep.get(row.designationId)
        if (unsaved) setValue(`rows.${index}`, unsaved, { shouldDirty: true })
      })
    },
    [getValues, heads, reset, setValue],
  )

  /**
   * Send the rows at `indexes` — every changed one, from Save All. Kept taking a
   * list rather than reading the changed set itself, because that's the shape of
   * the request: the endpoint is "these rows, this month", and a narrower save
   * would only be a shorter list.
   *
   * The wage figure the salary type asks for is demanded of the rows being sent
   * and of no others: an untouched designation that has never been configured is
   * a blank row, and it is not an error until someone tries to save it. That's
   * why the rule runs here rather than in the schema.
   */
  const saveRows = useCallback(
    (indexes: number[]) => {
      if (companyId === null) {
        toast.error('Pick a company first')
        return
      }
      /*
       * Last attempt's complaints go first. They're set by hand below rather
       * than by the resolver, so nothing else ever takes them back off — a cell
       * fixed since would otherwise stay outlined through a save that accepted
       * it.
       */
      clearErrors(['effectiveFrom', ...indexes.map((index) => `rows.${index}` as const)])

      const values = getValues()
      if (!values.effectiveFrom) {
        setError('effectiveFrom', {
          message: 'Pick the month these wages take effect from',
        })
        toast.error('Pick the month these wages take effect from')
        return
      }
      const rows = indexes.map((index) => values.rows[index]).filter(Boolean)
      if (rows.length === 0) {
        toast.info('Nothing to save — no row has changed')
        return
      }

      let incomplete = 0
      indexes.forEach((index) => {
        const row = values.rows[index]
        if (!row) return
        const missing = missingWageField(row)
        if (!missing) return
        incomplete += 1
        setError(`rows.${index}.${missing.path}`, { message: missing.message })
      })
      if (incomplete > 0) {
        toast.error(
          incomplete === 1
            ? 'Fill in the highlighted wage before saving'
            : `Fill in the highlighted wages on ${incomplete} rows before saving`,
        )
        return
      }

      save.mutate(
        {
          company_id: companyId,
          effective_from: values.effectiveFrom,
          rows: rows.map((row) => bulkRowToPayload(row, values.effectiveFrom)),
        },
        {
          onSuccess: (stored) => {
            commit(stored, new Set(rows.map((row) => row.designationId)))
            toast.success(
              rows.length === 1
                ? `${rows[0].designationName} saved`
                : `${rows.length} designations saved`,
            )
          },
          onError: (error) =>
            toast.error(
              error instanceof Error ? error.message : 'Failed to save the wage grid',
            ),
        },
      )
    },
    [companyId, clearErrors, getValues, setError, save, commit],
  )

  /**
   * The rows that already have a wage structure — what Save All falls back to
   * when nothing has been edited.
   *
   * A designation never configured is deliberately not in here. Its row is blank,
   * so sending it would fail the wage rule and take the whole transaction down
   * with it — and "apply the grid at this month" can't sensibly mean "and invent
   * a wage for the designations that have none".
   */
  const configuredRows = useMemo(
    () =>
      designations.reduce<number[]>((rows, designation, index) => {
        if (designation.wageStructure) rows.push(index)
        return rows
      }, []),
    [designations],
  )

  /**
   * Save All. Changed rows if there are any — that's the everyday case, and it
   * keeps a version off the designations nobody touched.
   *
   * With nothing changed it sends every configured row instead, because then the
   * only thing the click can mean is "apply this grid at the month I picked" —
   * re-dating the payroll without editing a figure, which is exactly what this
   * endpoint is for. A new version starts from the values in force and applies
   * the row on top, so re-sending an untouched row can't lose anything the grid
   * doesn't show.
   */
  const saveAll = useCallback(() => {
    const changed = [...dirtyRowsRef.current].sort((a, b) => a - b)
    saveRows(changed.length > 0 ? changed : configuredRows)
  }, [saveRows, configuredRows])

  /* ── Confirming the save ──────────────────────────────────────────────── */

  /**
   * Save All asks first. It writes a new wage version across the whole payroll
   * in one transaction against a month picked at the top of the screen — the one
   * click on here that can't be undone from the screen, and the one where the
   * cost of the month being wrong is every designation of the company.
   *
   * The rows to send are worked out at confirm time, not when the dialog opens,
   * so nothing edited while it's up is missed.
   */
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)

  const askSaveAll = useCallback(() => setSaveConfirmOpen(true), [])

  const confirmSaveAll = useCallback(() => {
    setSaveConfirmOpen(false)
    saveAll()
  }, [saveAll])

  /* ── Everything the screen renders from ───────────────────────────────── */

  const monthBounds = useMemo(() => effectiveMonthBounds(), [])

  /*
   * The month the grid is being saved against. One field, so the subscription is
   * one field wide — it moves when the toolbar's picker does and never on a cell.
   */
  const effectiveFrom = useWatch({ control, name: 'effectiveFrom' })

  return {
    register,
    control,

    companyId,
    monthBounds,

    /** One row per designation of the company, in the API's own order. */
    designations,
    heads,
    dirtyRows: dirtyRowsRef.current,
    /**
     * Whether Save All has anything to send — a changed row, or a configured one
     * to re-date. False only on a grid with nothing on it worth saving, so the
     * button is never dead while there's an action behind it.
     */
    canSaveAll: dirtyRowsRef.current.size > 0 || configuredRows.length > 0,
    changeSalaryType,
    changeWorkingDayCalculationType,

    isLoading: grid.isLoading || headsLoading,
    isError: grid.isError,
    error: grid.error,
    reload,

    /** The month on the toolbar — what the confirmation quotes back. */
    effectiveFrom,
    /** How many rows Save All would send: the changed ones, or the configured. */
    saveCount: dirtyRowsRef.current.size > 0 ? dirtyRowsRef.current.size : configuredRows.length,
    saveConfirmOpen,
    setSaveConfirmOpen,
    askSaveAll,
    confirmSaveAll,
    isSaving: save.isPending,
  }
}

/**
 * Whether anything under a row's dirty-field tree is set. react-hook-form
 * records a flag per leaf and nests arrays and objects, so a row that was
 * touched and put back reads as a tree of `false` rather than as absent.
 */
function hasChange(node: unknown): boolean {
  if (node === true) return true
  if (Array.isArray(node)) return node.some(hasChange)
  if (node && typeof node === 'object') return Object.values(node).some(hasChange)
  return false
}
