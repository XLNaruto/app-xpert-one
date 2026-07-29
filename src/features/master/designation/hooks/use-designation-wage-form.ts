import { useCallback, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { wageStructureFormSchema, type WageStructureFormValues } from '../schemas'
import { EMPTY_WAGE_STRUCTURE_ROW } from '../constants'
import { useDesignationWageStructures } from '../api/use-designation-wage-structures'
import { useCreateDesignationWageStructures } from '../api/use-designation-wage-mutations'
import { effectiveMonthBounds } from '../lib/effective-month'
import { wageRowToStructure } from '../lib/wage-structure-mappers'

/** A fresh draft row — cloned so rows never share the head arrays. */
function blankRow() {
  return structuredClone(EMPTY_WAGE_STRUCTURE_ROW)
}

/**
 * Owns the wage structure tab: the stored history, the draft rows being added
 * and the save. History is append-only, so the form only ever holds new rows —
 * everything already saved is rendered read-only from the query.
 *
 * Nothing here subscribes to field values or to `formState`. That's deliberate:
 * a subscription at this level re-renders the whole grid on every keystroke, and
 * the grid is forty columns wide. Cells subscribe to the one or two fields they
 * actually depend on instead, so typing repaints a cell rather than a table.
 */
export function useDesignationWageForm(designationId: number) {
  const history = useDesignationWageStructures(designationId)
  const createStructures = useCreateDesignationWageStructures(designationId)

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
      createStructures.mutate(values.rows.map(wageRowToStructure), {
        onSuccess: () => {
          toast.success(
            values.rows.length === 1
              ? 'Wage structure added'
              : `${values.rows.length} wage structures added`,
          )
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

    /** Draft rows, as field-array entries — the editable half of the grid. */
    fields,
    addRow,
    removeRow,
    changeSalaryType,
    changeWorkingDayCalculationType,

    /** Saved rows, most recent first — rendered read-only. */
    existing: history.data ?? [],
    historyLoading: history.isLoading,
    historyError: history.isError,

    monthBounds,
    takenMonths,

    onSubmit,
    isPending: createStructures.isPending,
  }
}
