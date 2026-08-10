import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useWeekoffPolicies, weekoffPolicyOptions } from '@/features/master/weekoff-policy'
import { shiftSchema, type ShiftFormValues } from '../schemas'
import { EMPTY_SHIFT_FORM } from '../constants'
import { useCreateShift, useUpdateShift } from '../api/use-shift-mutations'
import { shiftPaidHours, shiftToFormValues } from '../lib/shift-mappers'
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
 */
export function useShiftForm({ companyId, editing, onSaved }: UseShiftFormOptions) {
  const isEdit = editing !== null

  const createShift = useCreateShift(companyId)
  const updateShift = useUpdateShift(editing?.id ?? Number.NaN)

  // The whole master, not a page — this is a dropdown. Most shifts name no policy
  // and fall back to the department's or company's default, so the field is
  // clearable rather than required.
  const weekoffPolicies = useWeekoffPolicies(undefined, companyId)

  /** `start|end|break` the form was seeded with on an edit, `null` on an add. */
  const seededWindowRef = useRef<string | null>(null)

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

  // The two day thresholds follow from the window itself, so the form works them
  // out as the times (and the unpaid break) are filled in: a full day is the paid
  // length of the shift, a half day is half of that.
  //
  // Suggestion, not a rule — the moment either box is typed in it counts as
  // dirty and is left alone, so a company whose half day isn't literally half
  // keeps its own number. `reset()` clears that on the next add or edit.
  const [startTime, endTime, breakMinutes] = watch(['startTime', 'endTime', 'breakMinutes'])
  const isFullDayTouched = Boolean(dirtyFields.minFullDayHours)
  const isHalfDayTouched = Boolean(dirtyFields.minHalfDayHours)

  useEffect(() => {
    // An edit opens on the row's own window: leave its saved thresholds be until
    // the window actually moves.
    if (seededWindowRef.current === `${startTime}|${endTime}|${breakMinutes}`) return

    const fullDay = shiftPaidHours(startTime, endTime, breakMinutes)
    if (fullDay === null) return

    if (!isFullDayTouched) setValue('minFullDayHours', String(fullDay))
    // Half of the full day, kept on the field's 0.5 step.
    if (!isHalfDayTouched) setValue('minHalfDayHours', String(Math.round(fullDay) / 2))
  }, [startTime, endTime, breakMinutes, isFullDayTouched, isHalfDayTouched, setValue])

  // Follow the list's selection: a picked row seeds the form, clearing it blanks
  // the form back out for the next add.
  useEffect(() => {
    reset(editing ? shiftToFormValues(editing) : EMPTY_SHIFT_FORM)
    // The window a row arrived with — while it's untouched the stored thresholds
    // stand, however they were arrived at.
    seededWindowRef.current = editing
      ? `${editing.startTime}|${editing.endTime}|${editing.breakMinutes}`
      : null
  }, [editing, reset])

  /** Abandon an edit — back to a blank add. */
  const cancelEdit = () => {
    onSaved()
    reset(EMPTY_SHIFT_FORM)
  }

  const onSubmit = handleSubmit((values) => {
    if (companyId === undefined) {
      toast.error('Save the company first, then add its shifts.')
      return
    }

    const mutation = isEdit ? updateShift : createShift
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Shift updated' : 'Shift added')
        // The list owns the selection, so clearing it is what blanks the form.
        onSaved()
        reset(EMPTY_SHIFT_FORM)
      },
      onError: (err) =>
        toast.error(
          getApiErrorMessage(err, `Failed to ${isEdit ? 'update' : 'add'} shift`),
        ),
    })
  })

  const weekoffPolicySelectOptions = useMemo(
    () => weekoffPolicyOptions(weekoffPolicies.data?.items ?? []),
    [weekoffPolicies.data],
  )

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    weekoffPolicySelectOptions,
    isWeekoffPoliciesLoading: weekoffPolicies.isLoading,
    isPending: isEdit ? updateShift.isPending : createShift.isPending,
    cancelEdit,
  }
}
