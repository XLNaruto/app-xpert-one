import { useCallback, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { wageStructureFormSchema, type WageStructureFormValues } from '../schemas'
import { EMPTY_WAGE_STRUCTURE_ROW } from '../constants'
import { useDesignationWageStructures } from '../api/use-designation-wage-structures'
import { useSaveDesignationWageStructures } from '../api/use-designation-wage-mutations'
import { effectiveMonthBounds } from '../lib/effective-month'
import { wageStructureToRow } from '../lib/wage-structure-mappers'
import type { DesignationWageStructure } from '../types'

/** A fresh draft row — cloned so rows never share the head arrays. */
function blankRow() {
  return structuredClone(EMPTY_WAGE_STRUCTURE_ROW)
}

/**
 * Owns the wage structure tab: the stored version history, the rows being saved
 * this visit and the save itself.
 *
 * A row on the grid is one of two things, and which one decides the request:
 *
 * - **drafted** — a new version, `POST`ed to take effect from its month. The
 *   earlier months keep what they were paid on, which is what makes the history
 *   an audit trail rather than a mutable record.
 * - **opened for correction** — a stored version pulled onto the grid by
 *   `editRow`, carrying its id, and `PATCH`ed in place. No version is created;
 *   what a past month is read as changes. It's for fixing a mistake, not for a
 *   revision, so the grid marks the row as an edit while it's open.
 *
 * Nothing here subscribes to field values or to `formState`. That's deliberate:
 * a subscription at this level re-renders the whole grid on every keystroke, and
 * the grid is forty columns wide. Cells subscribe to the one or two fields they
 * actually depend on instead, so typing repaints a cell rather than a table.
 */
export function useDesignationWageForm(designationId: number) {
  const history = useDesignationWageStructures(designationId)
  const saveStructures = useSaveDesignationWageStructures(designationId)

  const { register, control, handleSubmit, reset, setValue, getValues } =
    useForm<WageStructureFormValues>({
      resolver: zodResolver(wageStructureFormSchema),
      defaultValues: { rows: [blankRow()] },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })

  const monthBounds = useMemo(() => effectiveMonthBounds(), [])

  /** Months already in the history — pickable, but flagged as a supersede. */
  const takenMonths = useMemo(
    () => new Set((history.data ?? []).map((row) => row.effectiveFrom)),
    [history.data],
  )

  const addRow = useCallback(() => append(blankRow()), [append])

  /**
   * Pull a stored version onto the grid to correct it. The row carries the
   * version's id, which is what turns its save into a `PATCH` of that row rather
   * than a new version stacked on top of it.
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
   * Never leave the grid with nothing to fill in — the last row resets instead.
   *
   * The count is read through `getValues` rather than closed over from `fields`,
   * which would change this callback's identity on every add or remove. Rows are
   * memoised on their props, so an unstable callback here re-rendered every draft
   * row — forty cells apiece — each time one was added.
   */
  const removeRow = useCallback(
    (index: number) => {
      if (getValues('rows').length === 1) {
        reset({ rows: [blankRow()] })
        return
      }
      remove(index)
    },
    [getValues, remove, reset],
  )

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
          // The saved rows now come back from the history query — start clean.
          reset({ rows: [blankRow()] })
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to save the wage structure',
          ),
      })
    },
    /*
     * Said once, rather than as a line per row. The cells that need attention
     * outline themselves in the grid, which is where the fix happens anyway.
     */
    () => toast.error('Fill in the highlighted cells before saving'),
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

    /** Saved versions, most recent first — rendered read-only. */
    existing: history.data ?? [],
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
