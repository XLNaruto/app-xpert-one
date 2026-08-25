import { useCallback, useEffect, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { wageStructureFormSchema, type WageStructureFormValues } from '../schemas'
import { useDesignationWageStructures } from '../api/use-designation-wage-structures'
import { useSaveDesignationWageStructures } from '../api/use-designation-wage-mutations'
import { useWageHeads } from '../api/use-wage-heads'
import { effectiveMonthBounds } from '../lib/effective-month'
import { revealFirstError } from '../lib/wage-grid-errors'
import {
  carryForwardWageRow,
  wageStructureToRow,
  zeroedWageStructureRow,
} from '../lib/wage-structure-mappers'
import type { DesignationWageStructure } from '../types'

/**
 * Owns the wage structure tab: the stored version history, the rows being saved
 * this visit and the save itself.
 *
 * A row on the grid is one of two things, and which one decides the request:
 *
 * - **drafted** — a new version, `POST`ed to take effect from its month. The
 *   earlier months keep what they were paid on, which is what makes the history
 *   an audit trail rather than a mutable record.
 * - **opened for correction** — a stored version opened by `editRow`, carrying its
 *   id, and `PATCH`ed in place. No version is created; what a past month is read
 *   as changes. It's for fixing a mistake, not for a revision, so the grid opens
 *   the row *where it already sits* in the history and marks it as an edit, rather
 *   than adding a row that looks like a new version.
 *
 * Nothing here subscribes to field values or to `formState`. That's deliberate:
 * a subscription at this level re-renders the whole grid on every keystroke, and
 * the grid is forty columns wide. Cells subscribe to the one or two fields they
 * actually depend on instead, so typing repaints a cell rather than a table.
 */
export function useDesignationWageForm(designationId: number) {
  const history = useDesignationWageStructures(designationId)
  const saveStructures = useSaveDesignationWageStructures(designationId)
  /*
   * The allowance and deduction columns are the master's heads, so a draft row
   * can't be built until it has loaded — no row exists before then.
   */
  const { heads, isReady: headsReady, isLoading: headsLoading } = useWageHeads()

  const { register, control, handleSubmit, reset, setValue, getValues } =
    useForm<WageStructureFormValues>({
      resolver: zodResolver(wageStructureFormSchema),
      defaultValues: { rows: [] },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })

  const existing = useMemo(() => history.data ?? [], [history.data])

  /**
   * The version in force — the one a new row carries its settings forward from.
   * Read as the latest effective month rather than trusting the list's order, so
   * the wrong row can't become the template if the sort ever changes.
   */
  const latest = useMemo(
    () =>
      existing.reduce<DesignationWageStructure | undefined>(
        (newest, row) =>
          !newest || row.effectiveFrom > newest.effectiveFrom ? row : newest,
        undefined,
      ),
    [existing],
  )

  /*
   * One zeroed row, and only when the grid would otherwise be empty — nothing
   * saved and nothing drafted. A designation with a history opens on that history
   * with no row waiting to be filled in: a revision is added deliberately, and a
   * correction opens the saved row itself.
   *
   * Written as a condition on the row count rather than a "have I seeded yet"
   * ref, so it can also stand the grid back up after the last row is removed —
   * and so a later refetch of the master or the history can't reset the grid and
   * throw away what's been typed into it, since it only ever appends to an empty
   * one.
   */
  useEffect(() => {
    if (!headsReady || history.isLoading) return
    if (existing.length > 0 || fields.length > 0) return
    append(zeroedWageStructureRow(heads))
  }, [headsReady, heads, history.isLoading, existing.length, fields.length, append])

  const monthBounds = useMemo(() => effectiveMonthBounds(), [])

  /** Months already in the history — pickable, but flagged as a supersede. */
  const takenMonths = useMemo(
    () => new Set(existing.map((row) => row.effectiveFrom)),
    [existing],
  )

  /**
   * Add a row to draft a new version. A revision is nearly always the previous
   * settings with a figure or two moved, so the row opens on those rather than
   * empty: the row already on the grid if there is one — that's what the user is
   * working from — otherwise the version in force. Only a designation with no
   * history and nothing drafted gets a row from scratch, and that one opens
   * zeroed.
   *
   * Either way it's a *new* row: `carryForwardWageRow` drops the stored id so the
   * save is a POST, and clears the month, which is the one thing a revision has
   * to be told.
   */
  const addRow = useCallback(() => {
    const last = getValues('rows').at(-1)
    if (last) return append(carryForwardWageRow(last))
    if (latest) return append(carryForwardWageRow(wageStructureToRow(latest)))
    append(zeroedWageStructureRow(heads))
  }, [append, getValues, heads, latest])

  /**
   * Open a stored version for correction. The row carries the version's id, which
   * is what turns its save into a `PATCH` of that row rather than a new version
   * stacked on top of it — and what the grid matches on to render the editable row
   * in the saved row's own place.
   *
   * Opening the same version twice would send two conflicting patches for one
   * row, so the second click is ignored.
   */
  const editRow = useCallback(
    (structure: DesignationWageStructure) => {
      const open = getValues('rows').some(
        (row) => row.wageStructureId === structure.id,
      )
      if (open) return
      append(wageStructureToRow(structure))
    },
    [append, getValues],
  )

  /**
   * Drops a draft row, and closes a correction — a stored version isn't touched by
   * this, only the editable copy of it on the grid.
   *
   * Always the plain remove, the last row included: a blank row you asked to get
   * rid of has to actually go, and it used to come straight back as a fresh blank
   * one. The grid is left empty over an existing history; with nothing saved
   * either, the effect above puts one blank row back so there's something to fill
   * in.
   */
  const removeRow = useCallback((index: number) => remove(index), [remove])

  /**
   * Switching the salary type clears the wage the other mode owns, so a row never
   * carries both a monthly basic and a hand-entered daily wage — whichever is on
   * screen is the one that counts.
   */
  const changeSalaryType = useCallback(
    (index: number, value: 'Daily' | 'Monthly') => {
      setValue(`rows.${index}.salaryType`, value)
      setValue(`rows.${index}.${value === 'Daily' ? 'basicPay' : 'wagePerDay'}`, '')
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
        value as WageStructureFormValues['rows'][number]['workingDayCalculationType'],
      )
      if (value !== 'Fixed') setValue(`rows.${index}.workingDays`, '')
    },
    [setValue],
  )

  const onSubmit = handleSubmit(
    (values) => {
      saveStructures.mutate(values.rows, {
        onSuccess: () => {
          toast.success(savedMessage(values.rows))
          /*
           * The saved rows now come back from the history query, so the grid is
           * left showing that — no row of its own. There's a history to look at
           * either way now, so nothing needs a blank row put back.
           */
          reset({ rows: [] })
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to save the wage structure',
          ),
      })
    },
    /*
     * Said once, rather than as a line per row. The cells that need attention
     * outline themselves in the grid, which is where the fix happens anyway —
     * and the first of them is scrolled to, focused and lit, because on a grid
     * forty columns wide the offending cell is usually off screen when the save
     * is pressed, and a toast alone leaves you hunting for it.
     */
    (errors) => {
      toast.error('Fill in the highlighted cells before saving')
      revealFirstError(errors)
    },
  )

  return {
    register,
    control,

    /** Rows on the grid, as field-array entries — the editable half. */
    fields,
    addRow,
    editRow,
    removeRow,
    changeSalaryType,
    changeWorkingDayCalculationType,

    /** The master's heads — one allowance / deduction column per entry. */
    heads,
    headsLoading,

    /** Saved versions, most recent first — rendered read-only. */
    existing,
    historyLoading: history.isLoading,
    historyError: history.isError,

    monthBounds,
    takenMonths,

    onSubmit,
    isPending: saveStructures.isPending,
  }
}

/** What the save reports back, counting corrections apart from new versions. */
function savedMessage(rows: WageStructureFormValues['rows']): string {
  const edited = rows.filter((row) => row.wageStructureId !== undefined).length
  const added = rows.length - edited

  const parts = [
    added > 0 && `${added} added`,
    edited > 0 && `${edited} corrected`,
  ].filter(Boolean)

  return `Wage structure saved — ${parts.join(', ')}`
}
