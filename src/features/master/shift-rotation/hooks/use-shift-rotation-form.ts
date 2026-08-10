import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { shiftOptions, useShifts } from '@/features/master/shift'
import { shiftRotationSchema, type ShiftRotationFormValues } from '../schemas'
import { EMPTY_SHIFT_ROTATION_FORM } from '../constants'
import { useShiftRotation } from '../api/use-shift-rotations'
import {
  useCreateShiftRotation,
  useUpdateShiftRotation,
} from '../api/use-shift-rotation-mutations'
import { shiftRotationToFormValues } from '../lib/shift-rotation-mappers'

/**
 * Owns the rotation form for both create and edit.
 *
 * **The cycle length drives the rows.** `weeks` must cover 1..length exactly once
 * — the API refuses a gap, because an employee landing on a missing week would
 * silently fall through to the department default. So the length field doesn't
 * merely validate the rows, it *is* what adds and removes them: raising it appends
 * blank weeks, lowering it drops the ones past the new end.
 *
 * **A cycle is made of the company's own shifts.** Every shift in it must belong
 * to the same company as the rotation, so the picker reads that company's shift
 * master and nothing else.
 */
export function useShiftRotationForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? undefined)

  const detail = useShiftRotation(id ?? Number.NaN)
  // The whole master, not a page — this is a dropdown.
  const shifts = useShifts(undefined, companyId)
  const createRotation = useCreateShiftRotation()
  const updateRotation = useUpdateShiftRotation(id ?? Number.NaN)

  const form = useForm<ShiftRotationFormValues>({
    resolver: zodResolver(shiftRotationSchema),
    defaultValues: EMPTY_SHIFT_ROTATION_FORM,
  })
  const { control, setValue, reset, handleSubmit } = form

  const cycleLengthWeeks = useWatch({ control, name: 'cycleLengthWeeks' }) ?? ''
  const weeks = useWatch({ control, name: 'weeks' }) ?? []

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(shiftRotationToFormValues(detail.data))
  }, [detail.data, reset])

  const shiftSelectOptions = useMemo(
    () => shiftOptions(shifts.data?.items ?? []),
    [shifts.data],
  )

  /**
   * Move the cycle length, rebuilding the rows to match. A week that already has a
   * shift keeps it, so nudging the length up and back down doesn't cost the picks
   * in between — only the weeks that fall outside the new cycle go.
   */
  const setCycleLength = (value: string) => {
    setValue('cycleLengthWeeks', value, { shouldValidate: true })

    const length = Number(value)
    if (!/^\d+$/.test(value) || length < 1 || length > 52) return

    const existing = new Map(weeks.map((week) => [week.weekNumber, week.shiftId]))
    setValue(
      'weeks',
      Array.from({ length }, (_, index) => ({
        weekNumber: index + 1,
        shiftId: existing.get(index + 1) ?? '',
      })),
      { shouldValidate: true },
    )
  }

  /** Point one week of the cycle at a shift. */
  const setWeekShift = (weekNumber: number, shiftId: string) => {
    setValue(
      'weeks',
      weeks.map((week) =>
        week.weekNumber === weekNumber ? { ...week, shiftId } : week,
      ),
      { shouldValidate: true },
    )
  }

  /**
   * Copy week 1's shift into every remaining week — the quickest way to build a
   * cycle that only differs in a week or two from a single shift.
   */
  const fillFromFirstWeek = () => {
    const first = weeks[0]?.shiftId
    if (!first) {
      toast.error("Pick week 1's shift first, then fill the rest from it.")
      return
    }
    setValue(
      'weeks',
      weeks.map((week) => ({ ...week, shiftId: first })),
      { shouldValidate: true },
    )
  }

  const goToList = () => navigate({ to: '/master/shift-rotation' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateRotation : createRotation
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Shift rotation updated' : 'Shift rotation created')
        goToList()
      },
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't save the shift rotation.")),
    })
  })

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    cycleLengthWeeks,
    setCycleLength,
    weeks,
    setWeekShift,
    fillFromFirstWeek,
    shiftSelectOptions,
    isShiftsLoading: shifts.isLoading,
    /** No shift exists to build a cycle from — the company's master is empty. */
    hasNoShifts: !shifts.isLoading && shiftSelectOptions.length === 0,
    isPending: isEdit ? updateRotation.isPending : createRotation.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
