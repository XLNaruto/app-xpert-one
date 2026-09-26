import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { getApiErrorMessage } from '@/lib/api-error'
import { useShiftSelect } from '@/features/master/shift'
import { NORMAL_SHIFT_VALUE } from '../constants'
import { useResetScheduleDay, useSetScheduleDay } from '../api/use-shift-schedule-mutations'
import type { ScheduleDay, ScheduleEmployeeRow } from '../types'

/** The cell being edited. */
export interface ScheduleDayTarget {
  employee: ScheduleEmployeeRow
  date: string
  /** The date's current entry; `null` when it isn't scheduled. */
  day: ScheduleDay | null
}

const shiftValueOf = (day: ScheduleDay | null) =>
  day?.shiftId != null ? String(day.shiftId) : NORMAL_SHIFT_VALUE

/**
 * One cell of the grid, opened: off / working, the date's shift, and handing it
 * back to the policy.
 *
 * The shift is sent only when it was changed — the API reads an omitted
 * `shift_id` as "keep whatever the date has", which is a different instruction
 * from `null` ("remove the override"). Past dates never open here — the grid
 * keeps them read-only.
 */
export function useShiftScheduleDay() {
  const setDay = useSetScheduleDay()
  const resetDay = useResetScheduleDay()

  const [target, setTarget] = useState<ScheduleDayTarget | null>(null)
  /** `null` until the user picks, when the date has no decision yet. */
  const [isWeekOff, setIsWeekOff] = useState<boolean | null>(null)
  const [shiftValue, setShiftValue] = useState(NORMAL_SHIFT_VALUE)

  const shifts = useShiftSelect({
    selected: shiftValue !== NORMAL_SHIFT_VALUE ? shiftValue : undefined,
    selectedLabel: target?.day?.shiftName || undefined,
    enabled: target !== null,
  })

  const shiftOptions = useMemo<ComboboxOption[]>(
    () => [{ label: 'Normal shift', value: NORMAL_SHIFT_VALUE }, ...shifts.options],
    [shifts.options],
  )

  // Stable, so the grid's columns needn't rebuild on every render.
  const open = useCallback((employee: ScheduleEmployeeRow, date: string) => {
    const day = employee.days.find((d) => d.workDate === date) ?? null
    setTarget({ employee, date, day })
    setIsWeekOff(day?.isWeekOff ?? null)
    setShiftValue(shiftValueOf(day))
  }, [])

  const close = () => setTarget(null)

  const save = () => {
    if (!target || isWeekOff === null) return
    const shiftChanged = shiftValue !== shiftValueOf(target.day)
    setDay.mutate(
      {
        employeeId: target.employee.employeeId,
        date: target.date,
        isWeekOff,
        ...(shiftChanged
          ? { shiftId: shiftValue === NORMAL_SHIFT_VALUE ? null : Number(shiftValue) }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success(isWeekOff ? 'Marked as off' : 'Marked as working')
          close()
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't update the date.")),
      },
    )
  }

  const reset = () => {
    if (!target) return
    resetDay.mutate(
      { employeeId: target.employee.employeeId, date: target.date },
      {
        onSuccess: () => {
          toast.success('Handed back to the week-off policy')
          close()
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't reset the date.")),
      },
    )
  }

  return {
    target,
    open,
    close,
    isWeekOff,
    setIsWeekOff,
    shiftValue,
    setShiftValue,
    /** The shift dropdown — "Normal shift" first, then the company's shifts. */
    shiftSelect: { ...shifts, options: shiftOptions },
    save,
    /** Only a date whose off / working is actually decided can be reset. */
    canReset: target?.day?.isWeekOff != null,
    reset,
    isSaving: setDay.isPending,
    isResetting: resetDay.isPending,
  }
}

export type ShiftScheduleDayState = ReturnType<typeof useShiftScheduleDay>
