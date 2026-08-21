import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useWeekoffPolicies, weekoffPolicyOptions } from '@/features/master/weekoff-policy'
import { shiftSchema, type ShiftFormValues } from '../schemas'
import { EMPTY_SHIFT_FORM, todayIso } from '../constants'
import { useCreateShift, useUpdateShift } from '../api/use-shift-mutations'
import {
  halfDayHours,
  shiftEndFromHours,
  shiftSpanHours,
  shiftToFormValues,
  touchesVersionedRules,
} from '../lib/shift-mappers'
import type { Shift } from '../types'

interface UseShiftFormOptions {
  /** The company the shift belongs to — the record the screen is editing. */
  companyId?: number
  /** The row picked for editing, or `null` while the form is adding. */
  editing: Shift | null
  /** Called once a save lands, so the list can clear its editing row. */
  onSaved: () => void
}

/**
 * The add/edit form above the shift list. One form serves both: picking a row
 * seeds it and turns Save into a PATCH, and clearing the selection puts it back
 * to a blank POST. The component consumes this and only lays out fields.
 *
 * **A shift is a timeline.** Every rule on this form hangs off a dated version, so
 * an edit that moves one WRITES A NEW VERSION from `effectiveDate` rather than
 * overwriting what came before — days already closed go on resolving against the
 * rules they were actually judged by. `name` and `status` aren't versioned, so a
 * save that touched only those sends no date at all and opens no version.
 */
export function useShiftForm({ companyId, editing, onSaved }: UseShiftFormOptions) {
  const isEdit = editing !== null

  const createShift = useCreateShift(companyId)
  const updateShift = useUpdateShift(editing?.id ?? Number.NaN)

  // The whole master, not a page — this is a dropdown. Most shifts name no policy
  // and fall back to the department's or company's default, so the field is
  // clearable rather than required.
  const weekoffPolicies = useWeekoffPolicies(undefined, companyId)

  /**
   * The window/full-day trio as the form last left it in step — what the sync
   * effect diffs against to tell which side the user moved. Seeded on every
   * `reset()` so opening a row for edit doesn't read as a change and recompute
   * over its saved thresholds.
   */
  const syncedRef = useRef({
    startTime: EMPTY_SHIFT_FORM.startTime,
    endTime: EMPTY_SHIFT_FORM.endTime,
    minFullDayHours: EMPTY_SHIFT_FORM.minFullDayHours,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: EMPTY_SHIFT_FORM,
  })

  // The window and the full day are two views of one number, so the form keeps
  // them in step whichever side is filled in:
  //   • move Start or End  → Full Day Hours becomes the window's length
  //   • type Full Day Hours → End Time becomes Start + that many hours
  // and either way Half Day Hours follows as half the full day. The unpaid break
  // is left out of all of it — it's charged by its own penalty, not by shortening
  // the day.
  //
  // Half day is a suggestion, not a rule: the moment that box is typed in it
  // counts as dirty and is left alone, so 3 against a full day of 8 stands.
  // `reset()` clears that on the next add or edit.
  const [startTime, endTime, minFullDayHours] = watch([
    'startTime',
    'endTime',
    'minFullDayHours',
  ])
  const isHalfDayTouched = Boolean(dirtyFields.minHalfDayHours)

  useEffect(() => {
    const previous = syncedRef.current
    // Nothing to do until one of the three actually moves — and which one moved
    // is what decides the direction, so a written-back value can't bounce back.
    const windowMoved =
      startTime !== previous.startTime || endTime !== previous.endTime
    const fullDayTyped = minFullDayHours !== previous.minFullDayHours
    if (!windowMoved && !fullDayTyped) return

    const next = { startTime, endTime, minFullDayHours }

    if (windowMoved) {
      const fullDay = shiftSpanHours(startTime, endTime)
      if (fullDay !== null) {
        next.minFullDayHours = String(fullDay)
        setValue('minFullDayHours', next.minFullDayHours)
        if (!isHalfDayTouched) setValue('minHalfDayHours', String(halfDayHours(fullDay)))
      }
    } else {
      const typed = minFullDayHours.trim()
      const fullDay = Number(typed)
      if (typed && Number.isFinite(fullDay) && fullDay > 0 && fullDay <= 24) {
        // The half day follows the number typed here on its own — it doesn't wait
        // on an end time, which can't be worked out until a start is picked.
        if (!isHalfDayTouched) setValue('minHalfDayHours', String(halfDayHours(fullDay)))

        const end = shiftEndFromHours(startTime, fullDay)
        if (end) {
          next.endTime = end
          setValue('endTime', end)
        }
      }
    }

    syncedRef.current = next
  }, [startTime, endTime, minFullDayHours, isHalfDayTouched, setValue])

  // Follow the list's selection: a picked row seeds the form, clearing it blanks
  // the form back out for the next add.
  useEffect(() => {
    const values = editing
      ? // Today, not the row's own effective date: re-sending that would amend the
        // version in force and rewrite the days already judged against it.
        shiftToFormValues(editing, todayIso())
      : { ...EMPTY_SHIFT_FORM, effectiveDate: todayIso() }
    reset(values)
    // Seeding isn't editing: the row's stored thresholds stand, however they were
    // arrived at, until the window or the full day is actually moved.
    syncedRef.current = {
      startTime: values.startTime,
      endTime: values.endTime,
      minFullDayHours: values.minFullDayHours,
    }
  }, [editing, reset])

  /** A blank add — today's date included, since the field is required. */
  const blankForm = () => ({ ...EMPTY_SHIFT_FORM, effectiveDate: todayIso() })

  /** Abandon an edit — back to a blank add. */
  const cancelEdit = () => {
    onSaved()
    reset(blankForm())
  }

  const onSubmit = handleSubmit((values) => {
    if (companyId === undefined) {
      toast.error('Save the company first, then add its shifts.')
      return
    }

    const onSettled = {
      onSuccess: () => {
        toast.success(isEdit ? 'Shift updated' : 'Shift added')
        // The list owns the selection, so clearing it is what blanks the form.
        onSaved()
        reset(blankForm())
      },
      onError: (err: unknown) =>
        toast.error(
          getApiErrorMessage(err, `Failed to ${isEdit ? 'update' : 'add'} shift`),
        ),
    }

    if (isEdit) {
      /*
       * Only date the patch when the save actually moved a versioned rule.
       * Renaming a shift would otherwise open a version identical to the one in
       * force, and the history would fill with edits that changed nothing.
       */
      updateShift.mutate(
        { values, withEffectiveDate: touchesVersionedRules(dirtyFields) },
        onSettled,
      )
      return
    }

    createShift.mutate(values, onSettled)
  })

  const weekoffPolicySelectOptions = useMemo(
    () => weekoffPolicyOptions(weekoffPolicies.data?.items ?? []),
    [weekoffPolicies.data],
  )

  // The rule behind the late-check-in switch only makes sense while the switch is
  // on, so the tab shows its two fields then — and the unit shown beside the
  // amount follows the type picked above it.
  const [isLateCheckInPenaltyApplicable, lateCheckInPenaltyType] = watch([
    'isLateCheckInPenaltyApplicable',
    'lateCheckInPenaltyType',
  ])

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isLateCheckInPenaltyApplicable,
    lateCheckInPenaltyType,
    weekoffPolicySelectOptions,
    isWeekoffPoliciesLoading: weekoffPolicies.isLoading,
    isPending: isEdit ? updateShift.isPending : createShift.isPending,
    cancelEdit,
  }
}
