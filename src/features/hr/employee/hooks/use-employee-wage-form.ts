import { useCallback, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  NO_WAGE_HEADS,
  carryForwardWageRow,
  effectiveMonthBounds,
  revealFirstError,
  wageStructureFormSchema,
  wageStructureToRow,
  zeroedWageStructureRow,
} from '@/features/master/designation'
import type {
  DesignationWageStructure,
  WageStructureFormValues,
} from '@/features/master/designation'
import {
  useCreateEmployeeWage,
  useDeleteEmployeeWage,
  useEmployeeWage,
  useUpdateEmployeeWage,
} from '../api/use-employee-wage'
import { toWageStructureView } from '../lib/employee-wage-mappers'
import type { EmployeeWageVersion } from '../types'

/**
 * Step 3's grid — the employee's own wage, over the same forty columns the
 * designation master's wage structure uses.
 *
 * Deliberately the same shape as `useDesignationWageForm`, because
 * `WageStructureGrid` is typed structurally on that hook and this screen renders
 * the very same grid: an override is a wage structure a tier up, so it is
 * captured the same way rather than through a form of its own.
 *
 * Two things differ, and only two:
 *
 * - **No heads.** The allowance / deduction catalog is always the designation's,
 *   so `heads` is empty and the grid draws no head columns. Nothing to configure
 *   here means nothing to show.
 * - **One call per row.** The designation saves its whole grid through a single
 *   bulk endpoint; the employee's wage is written a version at a time, so the
 *   submit walks the rows — POST for a draft, PATCH for a correction — and
 *   reports what got through if one of them fails partway.
 *
 * Nothing here subscribes to field values or to `formState`, for the same reason
 * it doesn't over there: a subscription at this level re-renders the whole grid
 * on every keystroke.
 */
export function useEmployeeWageForm(employeeId: number) {
  const wage = useEmployeeWage(employeeId)
  const createWage = useCreateEmployeeWage(employeeId)
  const updateWage = useUpdateEmployeeWage(employeeId)
  const deleteWage = useDeleteEmployeeWage(employeeId)

  const { register, control, handleSubmit, reset, setValue, getValues } =
    useForm<WageStructureFormValues>({
      resolver: zodResolver(wageStructureFormSchema),
      defaultValues: { rows: [] },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })

  /** The version queued for withdrawal — the confirm dialog's subject. */
  const [pendingRemoval, setPendingRemoval] = useState<DesignationWageStructure | null>(
    null,
  )
  const [isSaving, setSaving] = useState(false)

  /**
   * The employee's own versions, as the grid's saved rows.
   *
   * Only their own: the designation's template is not history of theirs, and
   * putting it in the grid would offer a pencil on a row this screen can't write.
   * Where it stands is said above the grid instead.
   */
  const existing = useMemo(
    () => (wage.data?.versions ?? []).map(toWageStructureView),
    [wage.data],
  )

  /**
   * What a new row opens on: whatever prices the employee today — their own
   * latest version, else the designation's template. Seeding rather than blanking
   * is what the API does anyway on a partial POST, and it makes "the standard
   * terms but ₹2,000 more basic" one figure.
   */
  const seed = useMemo<EmployeeWageVersion | null>(
    () => wage.data?.ownWage ?? wage.data?.designationWage ?? null,
    [wage.data],
  )

  const monthBounds = useMemo(() => effectiveMonthBounds(), [])

  /** Months the employee already has a version for — a save there supersedes it. */
  const takenMonths = useMemo(
    () => new Set(existing.map((row) => row.effectiveFrom)),
    [existing],
  )

  /**
   * Add a row to draft a new version. It opens on the row already on the grid if
   * there is one — that's what the user is working from — otherwise on whatever
   * prices the employee today. Only an employee with nothing at either tier gets a
   * row from scratch, and that one opens zeroed.
   *
   * Either way it's a *new* row: `carryForwardWageRow` drops the stored id so the
   * save is a POST, and clears the month, which is the one thing a revision has to
   * be told.
   */
  const addRow = useCallback(() => {
    const last = getValues('rows').at(-1)
    if (last) return append(carryForwardWageRow(last))
    if (seed) {
      return append(carryForwardWageRow(wageStructureToRow(toWageStructureView(seed))))
    }
    append(zeroedWageStructureRow(NO_WAGE_HEADS))
  }, [append, getValues, seed])

  /**
   * Open a stored version for correction. The row carries the version's id, which
   * turns its save into a PATCH of that row rather than a new version on top of
   * it — and is what the grid matches on to render the editable row in the saved
   * row's own place. Opening the same version twice would send two conflicting
   * patches, so the second click is ignored.
   */
  const editRow = useCallback(
    (structure: DesignationWageStructure) => {
      const open = getValues('rows').some((row) => row.wageStructureId === structure.id)
      if (open) return
      append(wageStructureToRow(structure))
    },
    [append, getValues],
  )

  /** Drops a draft row, and closes a correction — a stored version isn't touched. */
  const removeRow = useCallback((index: number) => remove(index), [remove])

  /**
   * Switching the salary type clears the wage the other mode owns, so a row never
   * carries both a monthly basic and a hand-entered daily wage.
   */
  const changeSalaryType = useCallback(
    (index: number, value: 'Daily' | 'Monthly') => {
      setValue(`rows.${index}.salaryType`, value)
      setValue(`rows.${index}.${value === 'Daily' ? 'basicPay' : 'wagePerDay'}`, '')
    },
    [setValue],
  )

  /** The two working-day answers are alternatives, each owned by one calc type. */
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
    async (values) => {
      setSaving(true)
      let added = 0
      let corrected = 0
      try {
        /*
         * Sequential, not parallel. Each write answers the whole picture back and
         * the API versions off the effective month, so two rows landing at once
         * could each be deciding against a state the other has just changed.
         */
        for (const row of values.rows) {
          if (row.wageStructureId === undefined) {
            await createWage.mutateAsync(row)
            added += 1
          } else {
            await updateWage.mutateAsync({ wageId: row.wageStructureId, row })
            corrected += 1
          }
        }
        toast.success(savedMessage(added, corrected))
        /* The saved rows come back from the read now, so the grid is left showing
           that — no row of its own. */
        reset({ rows: [] })
      } catch (error) {
        /* The rows that already went through stay saved; a second Save resumes
           from the ones that didn't, so the grid is left as it is. */
        toast.error(
          getApiErrorMessage(error, "Couldn't save the employee's wage.") +
            (added + corrected > 0
              ? ` ${savedMessage(added, corrected)} before it failed.`
              : ''),
        )
      } finally {
        setSaving(false)
      }
    },
    /* Said once, rather than as a line per row — the cells that need attention
       outline themselves, and the first of them is scrolled to and lit. */
    (errors) => {
      toast.error('Fill in the highlighted cells before saving')
      revealFirstError(errors)
    },
  )

  const confirmRemoval = async () => {
    if (!pendingRemoval) return
    try {
      await deleteWage.mutateAsync(pendingRemoval.id)
      toast.success('Wage version removed')
      setPendingRemoval(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove this wage version."))
    }
  }

  const isForbidden = isForbiddenError(wage.error)

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

    /** No head columns — the catalog is the designation's, not this employee's. */
    heads: NO_WAGE_HEADS,
    headsLoading: false,

    /** The employee's own versions, rendered read-only. */
    existing,
    historyLoading: wage.isLoading,
    historyError: wage.isError && !isForbidden,

    monthBounds,
    takenMonths,

    onSubmit,
    isPending: isSaving,

    /* ── Beyond what the grid reads ─────────────────────────────────────── */

    /** The whole two-tier answer, for the blocks above and below the grid. */
    wage: wage.data,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(wage.error) : undefined,
    pendingRemoval,
    setPendingRemoval,
    confirmRemoval,
    isRemoving: deleteWage.isPending,
  }
}

/** What the save reports back, counting corrections apart from new versions. */
function savedMessage(added: number, corrected: number): string {
  const parts = [
    added > 0 && `${added} added`,
    corrected > 0 && `${corrected} corrected`,
  ].filter(Boolean)

  return parts.length ? `Wage saved — ${parts.join(', ')}` : 'Nothing to save'
}
