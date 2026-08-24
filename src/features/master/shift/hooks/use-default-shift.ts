import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useShifts } from '../api/use-shifts'
import { useClearDefaultShift, useSetDefaultShift } from '../api/use-shift-mutations'
import { shiftOptions } from '../lib/shift-mappers'
import { useNavigate } from '@tanstack/react-router'

interface UseDefaultShiftOptions {
  /** The company whose shift master the dropdown is picked from. */
  companyId?: number
  /**
   * The department the default is being set for. Undefined until the department
   * exists — there's nothing to pin a default to before that.
   */
  departmentId?: number
  /**
   * The default already stored, when the API sends one. It doesn't today: no
   * read exposes a department's default shift, so the dropdown opens empty on a
   * department that already has one. Wired through so it pre-selects the moment
   * the field lands.
   */
  currentShiftId?: number | null
}

/**
 * The department screen's Shift tab: pick one of the company's shifts and pin it
 * as this department's default.
 *
 * A default here overrides the company's for this department's staff, and
 * clearing it falls back to the company's — which is why Clear is its own action
 * rather than "save nothing".
 */
export function useDefaultShift({
  companyId,
  departmentId,
  currentShiftId,
}: UseDefaultShiftOptions) {
  // The whole master, not a page — this is a dropdown.
  const shifts = useShifts(undefined, companyId)
  const setDefault = useSetDefaultShift()
  const clearDefault = useClearDefaultShift()
  const navigate = useNavigate()
  

  /** The combobox's value — a shift id as a string, or `''` for none. */
  const [shiftId, setShiftId] = useState('')

  // Seed from the stored default whenever it arrives or changes.
  useEffect(() => {
    setShiftId(currentShiftId ? String(currentShiftId) : '')
  }, [currentShiftId])

  const options = useMemo(() => shiftOptions(shifts.data?.items ?? []), [shifts.data])

    const goToList = () => navigate({ to: '/master/department' })

  const save = () => {
    if (departmentId === undefined) {
      toast.error('Save the department first, then set its shift.')
      return
    }
    if (!shiftId) {
      toast.error('Select a shift to set as the default.')
      return
    }
    setDefault.mutate(
      { shiftId: Number(shiftId), scope: { department_id: departmentId } },
      {
        onSuccess: () => {toast.success('Default shift saved for this department');
          goToList()
        },
        onError: (err) =>
          toast.error(getApiErrorMessage(err, 'Failed to save the default shift')),
      },
    )
  }

  const clear = () => {
    if (departmentId === undefined) return
    clearDefault.mutate(
      { department_id: departmentId },
      {
        onSuccess: () => {
          setShiftId('')
          toast.success("Default cleared — this department follows the company's shift")
        },
        onError: (err) =>
          toast.error(getApiErrorMessage(err, 'Failed to clear the default shift')),
      },
    )
  }

  return {
    shiftId,
    setShiftId,
    options,
    isLoadingShifts: shifts.isLoading,
    /** No shift exists to pick yet — the company's master is empty. */
    hasNoShifts: !shifts.isLoading && options.length === 0,
    save,
    clear,
    isSaving: setDefault.isPending,
    isClearing: clearDefault.isPending,
  }
}
